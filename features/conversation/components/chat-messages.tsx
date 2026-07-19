"use client";

import { isTextUIPart, type UIMessage } from "ai";
import type { ChatStatus } from "ai";
import { GlobeIcon, ExternalLinkIcon } from "lucide-react";

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
};

/**
 * Renders the conversation message list with markdown responses and a loading indicator.
 */
export function ChatMessages({ messages, status }: ChatMessagesProps) {
  const isWaiting =
    status === "submitted" && messages.at(-1)?.role === "user";

  return (
    <Conversation>
      <ConversationContent className="py-8">
        {messages.map((message) => (
          <Message key={message.id} from={message.role}>
            {message.parts.map((part) => {
              if (part.type === "tool-webSearch") {
                const toolPart = part as any;
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
                            toolPart.output.slice(0, 3).map((res: any, idx: number) => (
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
                              {toolPart.output.error || "Failed to retrieve results"}
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

            {getMessageText(message) ? (
              <MessageContent>
                <MessageResponse>{getMessageText(message)}</MessageResponse>
              </MessageContent>
            ) : null}
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

    </Conversation>
  );
}
