"use client";

import React, { useState, useTransition } from "react";
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import { toast } from "sonner";
import { switchBranch, renameBranch } from "@/features/conversation/actions/branch-actions";
import { loadChatMessages } from "@/features/ai/actions/chat-store";
import type { UIMessage } from "ai";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export type BranchMetadata = {
  parentId: string | null;
  siblings: string[];
  index: number;
  branchName?: string;
};

type BranchSwitcherProps = {
  messageId: string;
  metadata: BranchMetadata | undefined;
  conversationId: string;
  setMessages: (messages: UIMessage[]) => void;
  onDeleteRequest: (messageId: string) => void;
};

export function BranchSwitcher({ messageId, metadata, conversationId, setMessages, onDeleteRequest }: BranchSwitcherProps) {
  const [isPending, startTransition] = useTransition();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newName, setNewName] = useState(metadata?.branchName || "");

  if (!metadata?.siblings || metadata.siblings.length <= 1) return null;

  const handleSwitchBranch = (siblingId: string) => {
    startTransition(async () => {
      try {
        await switchBranch(conversationId, siblingId);
        const newMessages = await loadChatMessages(conversationId);
        setMessages(newMessages);
      } catch (err: unknown) {
        const errMsg = err instanceof Error ? err.message : String(err);
        toast.error("Failed to switch branch: " + errMsg);
      }
    });
  };

  const handleRename = () => {
    startTransition(async () => {
      try {
        await renameBranch(messageId, newName.trim());
        const newMessages = await loadChatMessages(conversationId);
        setMessages(newMessages);
        setIsDialogOpen(false);
        toast.success("Branch renamed successfully");
      } catch (err: unknown) {
        const errMsg = err instanceof Error ? err.message : String(err);
        toast.error("Failed to rename branch: " + errMsg);
      }
    });
  };

  return (
    <div className="flex items-center gap-2 text-xs text-muted-foreground select-none mt-1 pl-1">
      <button
        disabled={metadata.index === 0 || isPending}
        onClick={() => handleSwitchBranch(metadata.siblings[metadata.index - 1])}
        className="p-0.5 rounded hover:bg-muted disabled:opacity-30 transition-colors"
        title="Previous version"
      >
        <ChevronLeftIcon className="h-3.5 w-3.5" />
      </button>
      <span className="font-medium text-[11px] text-muted-foreground">
        {metadata.branchName || `Version ${metadata.index + 1}`} ({metadata.index + 1}/{metadata.siblings.length})
      </span>
      <button
        disabled={metadata.index === metadata.siblings.length - 1 || isPending}
        onClick={() => handleSwitchBranch(metadata.siblings[metadata.index + 1])}
        className="p-0.5 rounded hover:bg-muted disabled:opacity-30 transition-colors"
        title="Next version"
      >
        <ChevronRightIcon className="h-3.5 w-3.5" />
      </button>

      <button
        disabled={isPending}
        onClick={() => {
          setNewName(metadata.branchName || `Version ${metadata.index + 1}`);
          setIsDialogOpen(true);
        }}
        className="text-[10px] hover:text-foreground transition-colors ml-2 font-medium"
      >
        Rename
      </button>

      <button
        disabled={isPending}
        onClick={() => onDeleteRequest(messageId)}
        className="text-[10px] text-destructive/70 hover:text-destructive transition-colors ml-2 font-medium"
        title="Delete branch"
      >
        Delete
      </button>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename Branch</DialogTitle>
            <DialogDescription>
              Enter a custom name for this conversation branch.
            </DialogDescription>
          </DialogHeader>
          <div className="py-2">
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="w-full text-sm p-2.5 rounded-md border bg-background focus:outline-none focus:ring-1 focus:ring-ring"
              placeholder={`Version ${metadata.index + 1}`}
              disabled={isPending}
            />
          </div>
          <DialogFooter>
            <DialogClose render={<Button variant="outline">Cancel</Button>} />
            <Button disabled={isPending || !newName.trim()} onClick={handleRename}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
