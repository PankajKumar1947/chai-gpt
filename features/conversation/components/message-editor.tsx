"use client";

import React, { useState, useTransition } from "react";
import { toast } from "sonner";
import { forkMessage } from "@/features/conversation/actions/branch-actions";
import type { UIMessage } from "ai";

type MessageEditorProps = {
  messageId: string;
  initialText: string;
  conversationId: string;
  setMessages: (messages: UIMessage[]) => void;
  onCancel: () => void;
  regenerate: () => Promise<any>;
};

export function MessageEditor({
  messageId,
  initialText,
  conversationId,
  setMessages,
  onCancel,
  regenerate,
}: MessageEditorProps) {
  const [editText, setEditText] = useState(initialText);
  const [isPending, startTransition] = useTransition();

  const handleSubmit = () => {
    if (!editText.trim()) return;
    if (editText.trim() === initialText) {
      onCancel();
      return;
    }

    startTransition(async () => {
      try {
        const { newMessages } = await forkMessage(conversationId, messageId, editText.trim());
        setMessages(newMessages);
        onCancel();
        void regenerate();
      } catch (err: any) {
        toast.error("Failed to edit: " + err.message);
      }
    });
  };

  return (
    <div className="flex flex-col gap-2 w-full max-w-lg mt-1">
      <textarea
        value={editText}
        onChange={(e) => setEditText(e.target.value)}
        className="w-full text-sm p-2.5 rounded-md border bg-background focus:outline-none focus:ring-1 focus:ring-ring resize-none min-h-[70px]"
        placeholder="Edit your message..."
        disabled={isPending}
      />
      <div className="flex items-center gap-2 justify-end">
        <button
          disabled={isPending}
          onClick={onCancel}
          className="px-2.5 py-1 text-xs rounded border hover:bg-muted transition-colors"
        >
          Cancel
        </button>
        <button
          disabled={isPending || !editText.trim()}
          onClick={handleSubmit}
          className="px-2.5 py-1 text-xs rounded bg-primary text-primary-foreground hover:opacity-90 transition-colors"
        >
          Submit
        </button>
      </div>
    </div>
  );
}
