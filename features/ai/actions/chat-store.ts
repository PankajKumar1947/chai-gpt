"use server";

import { isTextUIPart, type UIMessage } from "ai";
import type { Prisma } from "@/lib/generated/prisma/client";
import { prisma } from "@/lib/db";

/** Extracts plain text from an AI SDK `UIMessage` by joining all text parts. */
function getMessageText(message: UIMessage) {
  return message.parts.filter(isTextUIPart).map((part) => part.text).join("");
}

/**
 * Normalizes stored message parts from the database into AI SDK `UIMessage` parts.
 * Falls back to a single text part when no structured parts are stored.
 */
function toUIMessageParts(
  parts: Prisma.JsonValue | null,
  content: string
): UIMessage["parts"] {
  const stored = parts as UIMessage["parts"] | null;
  if (Array.isArray(stored) && stored.length > 0) {
    return stored;
  }

  return [{ type: "text", text: content }];
}

/**
 * Loads all messages for a conversation from the database as AI SDK `UIMessage`s.
 *
 * @param conversationId - The conversation whose messages to load.
 * @returns Messages ordered oldest to newest, ready for `useChat`.
 */
export async function loadChatMessages(
  conversationId: string
): Promise<UIMessage[]> {
  const conversation = await prisma.conversation.findUnique({
    where: { id: conversationId },
    select: { activeMessageId: true },
  });

  const rows = await prisma.message.findMany({
    where: { conversationId },
  });

  if (rows.length === 0) return [];

  const messageMap = new Map(rows.map((row) => [row.id, row]));

  let activeMessageId = conversation?.activeMessageId;
  if (!activeMessageId) {
    const sorted = [...rows].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
    activeMessageId = sorted[sorted.length - 1]?.id;
  }

  const chain: typeof rows = [];
  let currentId: string | null | undefined = activeMessageId;
  const visited = new Set<string>();
  while (currentId && !visited.has(currentId)) {
    const msg = messageMap.get(currentId);
    if (!msg) break;
    chain.push(msg);
    visited.add(currentId);
    currentId = msg.parentId;
  }

  chain.reverse();

  return chain.map((row) => {
    const siblings = rows
      .filter((r) => r.parentId === row.parentId)
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
    const siblingIds = siblings.map((s) => s.id);
    const index = siblings.findIndex((s) => s.id === row.id);

    const dbMeta = (row.metadata as any) || {};
    return {
      id: row.id,
      role: row.role === "ASSISTANT" ? "assistant" : "user" as const,
      parts: toUIMessageParts(row.parts, row.content),
      metadata: {
        parentId: row.parentId,
        siblings: siblingIds,
        index,
        branchName: dbMeta.branchName,
      },
    };
  });
}

type SaveChatMessagesOptions = {
  updateTitle?: boolean;
};

/**
 * Upserts AI SDK `UIMessage`s into the database for a conversation.
 *
 * @param conversationId - Target conversation ID.
 * @param messages - Messages to persist (system messages are skipped).
 * @param options.updateTitle - When true, auto-titles "New Chat" from the first user message.
 */
export async function saveChatMessages(
  conversationId: string,
  messages: UIMessage[],
  options: SaveChatMessagesOptions = {}
) {
  const { updateTitle = true } = options;

  const conversation = await prisma.conversation.findUniqueOrThrow({
    where: { id: conversationId },
    select: { title: true, activeMessageId: true },
  });

  let lastSavedId = conversation.activeMessageId || null;

  for (const message of messages) {
    if (message.role === "system") continue;

    const content = getMessageText(message);
    const role = message.role === "assistant" ? "ASSISTANT" : "USER";

    const existing = await prisma.message.findUnique({
      where: { id: message.id },
      select: { id: true, parentId: true },
    });

    if (existing) {
      await prisma.message.update({
        where: { id: message.id },
        data: {
          content,
          parts: message.parts as Prisma.InputJsonValue,
          status: "COMPLETE",
        },
      });
      lastSavedId = existing.id;
    } else {
      await prisma.message.create({
        data: {
          id: message.id,
          conversationId,
          role,
          status: "COMPLETE",
          content,
          parts: message.parts as Prisma.InputJsonValue,
          parentId: lastSavedId,
        },
      });
      lastSavedId = message.id;
    }
  }

  const firstUser = messages.find((message) => message.role === "user");
  const firstUserText = firstUser ? getMessageText(firstUser).trim() : "";

  await prisma.conversation.update({
    where: { id: conversationId },
    data: {
      lastMessageAt: new Date(),
      activeMessageId: lastSavedId,
      title:
        updateTitle && conversation.title === "New Chat" && firstUserText
          ? firstUserText.slice(0, 48)
          : conversation.title,
    },
  });
}
