"use client";

import { isTextUIPart, type UIMessage } from "ai";
import type { ChatStatus } from "ai";
import { GlobeIcon, ExternalLinkIcon, EditIcon, TrashIcon } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import {
  Conversation,
  ConversationContent,
} from "@/components/ai-elements/conversation";
import {
  Message,
  MessageContent,
  MessageResponse,
} from "@/components/ai-elements/message";
import { Loader } from "@/components/ai-elements/loader";
import { deleteBranch } from "@/features/conversation/actions/branch-actions";
import { loadChatMessages } from "@/features/ai/actions/chat-store";
import { BranchSwitcher, type BranchMetadata } from "./branch-switcher";
import { MessageEditor } from "./message-editor";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

/** Extracts plain text from a `UIMessage` by joining all text parts. */
function getMessageText(message: UIMessage) {
  return message.parts
    .filter(isTextUIPart)
    .map((part) => part.text)
    .join("");
}

type ChatMessagesProps = {
  messages: UIMessage[];
  status: ChatStatus;
  conversationId: string;
  setMessages: (messages: UIMessage[]) => void;
  regenerate: () => Promise<void>;
};

interface WebSearchToolPart {
  type: "tool-webSearch";
  toolCallId: string;
  state: "input-streaming" | "input-available" | "approval-requested" | "approval-responded" | "output-available" | "output-error" | "output-denied";
  input: { query: string };
  output?: Array<{ title?: string; url: string; content?: string }> | { error?: string };
  errorText?: string;
}

/**
 * Renders the conversation message list with markdown responses and a loading indicator.
 */
export function ChatMessages({ messages, status, conversationId, setMessages, regenerate }: ChatMessagesProps) {
  const isWaiting =
    status === "submitted" && messages.at(-1)?.role === "user";

  const [editingId, setEditingId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDeleteRequest = (messageId: string) => {
    setDeletingId(messageId);
    setIsDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (!deletingId) return;
    startTransition(async () => {
      try {
        await deleteBranch(conversationId, deletingId);
        const newMessages = await loadChatMessages(conversationId);
        setMessages(newMessages);
        toast.success("Branch deleted successfully");
      } catch (err: unknown) {
        const errMsg = err instanceof Error ? err.message : String(err);
        toast.error("Failed to delete branch: " + errMsg);
      } finally {
        setIsDeleteDialogOpen(false);
        setDeletingId(null);
      }
    });
  };

  return (
    <Conversation>
      <ConversationContent className="py-8">
        {messages.map((message) => (
          <Message key={message.id} from={message.role}>
            {message.parts.map((part) => {
              if (part.type === "tool-webSearch") {
                const toolPart = part as unknown as WebSearchToolPart;
                const query = toolPart.input?.query || "";
                const isSearching =
                  toolPart.state === "input-streaming" ||
                  toolPart.state === "input-available" ||
                  toolPart.state === "approval-requested";
                const hasResult = toolPart.state === "output-available";
                const hasError = toolPart.state === "output-error";

                return (
                  <div
                    key={toolPart.toolCallId}
                    className="flex flex-col gap-2 rounded-lg border bg-card text-card-foreground p-3 text-xs shadow-sm max-w-lg transition-all mt-2 mb-2"
                  >
                    <div className="flex items-center gap-2 text-muted-foreground">
                      {isSearching ? (
                        <div className="h-3 w-3 animate-spin rounded-full border border-primary border-t-transparent" />
                      ) : (
                        <GlobeIcon className="h-4.5 w-4.5 text-emerald-500" />
                      )}
                      <span className="font-medium">
                        {isSearching ? "Searching the web for:" : "Searched the web for:"}
                      </span>
                      <span className="italic font-semibold text-foreground">
                        "{query}"
                      </span>
                    </div>
                    {hasResult && toolPart.output && (
                      <div className="flex flex-col gap-1.5 border-t pt-2 mt-1">
                        <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">
                          Search Results:
                        </span>
                        <div className="flex flex-col gap-1 max-h-36 overflow-y-auto">
                          {Array.isArray(toolPart.output) ? (
                            toolPart.output.slice(0, 3).map((res: { title?: string; url: string; content?: string }, idx: number) => (
                              <a
                                key={idx}
                                href={res.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center justify-between gap-2 p-1.5 rounded hover:bg-muted transition-colors text-blue-600 dark:text-blue-400 font-medium"
                              >
                                <span className="truncate">{res.title || res.url}</span>
                                <ExternalLinkIcon className="h-3 w-3 shrink-0 text-muted-foreground" />
                              </a>
                            ))
                          ) : (
                            <span className="text-destructive">
                              {"error" in toolPart.output ? toolPart.output.error : "Failed to retrieve results"}
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                    {hasError && (
                      <div className="flex flex-col gap-1.5 border-t pt-2 mt-1 text-destructive font-medium">
                        {toolPart.errorText || "An error occurred during search"}
                      </div>
                    )}
                  </div>
                );
              }
              return null;
            })}

            {editingId === message.id ? (
              <MessageEditor
                messageId={message.id}
                initialText={getMessageText(message)}
                conversationId={conversationId}
                setMessages={setMessages}
                onCancel={() => setEditingId(null)}
                regenerate={regenerate}
              />
            ) : (
              getMessageText(message) ? (
                <div className="relative group/content flex flex-col gap-1">
                  <MessageContent>
                    <MessageResponse>{getMessageText(message)}</MessageResponse>
                  </MessageContent>

                  {message.role === "user" && !isPending && (
                    <div className="absolute right-0 top-0 translate-x-2 -translate-y-2 opacity-0 group-hover/content:opacity-100 transition-opacity flex items-center gap-1 bg-background shadow border rounded px-1.5 py-0.5 z-10">
                      <button
                        onClick={() => setEditingId(message.id)}
                        className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                        title="Edit message & branch"
                      >
                        <EditIcon className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteRequest(message.id)}
                        className="p-1.5 rounded hover:bg-muted text-destructive/70 hover:text-destructive transition-colors"
                        title="Delete branch"
                      >
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                </div>
              ) : null
            )}

            <BranchSwitcher
              messageId={message.id}
              metadata={message.metadata as BranchMetadata | undefined}
              conversationId={conversationId}
              setMessages={setMessages}
              onDeleteRequest={handleDeleteRequest}
            />
          </Message>
        ))}

        {isWaiting ? (
          <Message from="assistant">
            <MessageContent>
              <Loader />
            </MessageContent>
          </Message>
        ) : null}
      </ConversationContent>

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Branch</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this branch? This will permanently delete this message and all subsequent messages in this branch. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction disabled={isPending} onClick={confirmDelete}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Conversation>
  );
}
