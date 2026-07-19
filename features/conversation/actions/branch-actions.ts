"use server";

import { prisma } from "@/lib/db";
import { requireUser } from "@/features/auth/action/require-user";
import { loadChatMessages } from "@/features/ai/actions/chat-store";

export async function forkMessage(
  conversationId: string,
  messageId: string,
  text: string,
) {
  await requireUser();

  // Find the message to fork
  const originalMessage = await prisma.message.findUniqueOrThrow({
    where: { id: messageId },
    select: { parentId: true },
  });

  // Create new user message with same parent
  const newMsg = await prisma.message.create({
    data: {
      conversationId,
      role: "USER",
      status: "COMPLETE",
      content: text,
      parentId: originalMessage.parentId,
    },
  });

  // Update conversation's activeMessageId
  await prisma.conversation.update({
    where: { id: conversationId },
    data: {
      activeMessageId: newMsg.id,
    },
  });

  // Load the new active branch messages
  const newMessages = await loadChatMessages(conversationId);
  return { newMessages };
}

export async function switchBranch(conversationId: string, messageId: string) {
  await requireUser();

  const findLeaf = async (id: string): Promise<string> => {
    const children = await prisma.message.findMany({
      where: { parentId: id },
      orderBy: { createdAt: "desc" },
    });
    if (children.length === 0) return id;
    return findLeaf(children[0].id);
  };

  const leafId = await findLeaf(messageId);

  await prisma.conversation.update({
    where: { id: conversationId },
    data: { activeMessageId: leafId },
  });

  return { success: true };
}

export async function renameBranch(messageId: string, name: string) {
  await requireUser();

  const msg = await prisma.message.findUniqueOrThrow({
    where: { id: messageId },
    select: { metadata: true },
  });

  const meta = (msg.metadata as any) || {};
  meta.branchName = name;

  await prisma.message.update({
    where: { id: messageId },
    data: { metadata: meta },
  });

  return { success: true };
}

export async function deleteBranch(conversationId: string, messageId: string) {
  await requireUser();

  const msg = await prisma.message.findUniqueOrThrow({
    where: { id: messageId },
    select: { parentId: true },
  });

  const parentId = msg.parentId;

  // Delete the message. Cascading will delete all its descendants.
  await prisma.message.delete({
    where: { id: messageId },
  });

  // Check if current activeMessageId still exists
  const conversation = await prisma.conversation.findUniqueOrThrow({
    where: { id: conversationId },
    select: { activeMessageId: true },
  });

  const activeStillExists = conversation.activeMessageId
    ? await prisma.message.findUnique({
        where: { id: conversation.activeMessageId },
      })
    : null;

  if (!activeStillExists) {
    if (parentId) {
      const findLeaf = async (id: string): Promise<string> => {
        const children = await prisma.message.findMany({
          where: { parentId: id },
          orderBy: { createdAt: "desc" },
        });
        if (children.length === 0) return id;
        return findLeaf(children[0].id);
      };
      const leafId = await findLeaf(parentId);
      await prisma.conversation.update({
        where: { id: conversationId },
        data: { activeMessageId: leafId },
      });
    } else {
      const remaining = await prisma.message.findMany({
        where: { conversationId },
        orderBy: { createdAt: "desc" },
        take: 1,
      });
      await prisma.conversation.update({
        where: { id: conversationId },
        data: { activeMessageId: remaining[0]?.id || null },
      });
    }
  }

  return { success: true };
}
