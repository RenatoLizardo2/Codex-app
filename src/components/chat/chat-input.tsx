"use client";

import { useRef, useCallback } from "react";
import { Send } from "lucide-react";

import { useChatStore } from "@/src/stores/chat-store";
import { useDocuments } from "@/src/hooks/queries/use-documents";
import { cn } from "@/src/lib/utils/cn";

type ChatInputProps = {
  onSubmit: (content: string, documentId?: string) => void;
  showDocumentSelector?: boolean;
};

export function ChatInput({ onSubmit, showDocumentSelector = false }: ChatInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const draftInput = useChatStore((s) => s.draftInput);
  const setDraftInput = useChatStore((s) => s.setDraftInput);
  const selectedDocumentId = useChatStore((s) => s.selectedDocumentId);
  const setSelectedDocumentId = useChatStore((s) => s.setSelectedDocumentId);
  const isStreaming = useChatStore((s) => s.isStreaming);

  const { documents } = useDocuments({ status: "ready" });

  const handleAutoResize = useCallback(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.style.height = "auto";
    textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`;
  }, []);

  function handleSubmit() {
    const trimmed = draftInput.trim();
    if (!trimmed || isStreaming) return;

    onSubmit(trimmed, selectedDocumentId ?? undefined);
    setDraftInput("");

    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  }

  return (
    <div className="border-t border-border bg-card p-4">
      {showDocumentSelector && documents.length > 0 && (
        <div className="mb-3">
          <select
            value={selectedDocumentId ?? ""}
            onChange={(e) =>
              setSelectedDocumentId(e.target.value || null)
            }
            className={cn(
              "w-full rounded-md border border-border bg-background px-3 py-2",
              "font-ui text-sm text-foreground",
              "focus:outline-none focus:ring-2 focus:ring-primary"
            )}
          >
            <option value="">All documents</option>
            {documents.map((doc) => (
              <option key={doc.id} value={doc.id}>
                {doc.title}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="flex items-end gap-2">
        <textarea
          ref={textareaRef}
          value={draftInput}
          onChange={(e) => {
            setDraftInput(e.target.value);
            handleAutoResize();
          }}
          onKeyDown={handleKeyDown}
          placeholder="Ask the Librarian a question..."
          disabled={isStreaming}
          rows={1}
          className={cn(
            "flex-1 resize-none rounded-md border border-border bg-background px-4 py-3",
            "font-body text-base text-foreground placeholder:text-muted-foreground",
            "focus:outline-none focus:ring-2 focus:ring-primary",
            "disabled:cursor-not-allowed disabled:opacity-50"
          )}
        />

        <button
          onClick={handleSubmit}
          disabled={!draftInput.trim() || isStreaming}
          className={cn(
            "flex h-11 w-11 shrink-0 items-center justify-center rounded-md",
            "bg-primary text-primary-foreground",
            "transition-opacity hover:opacity-90",
            "disabled:cursor-not-allowed disabled:opacity-50",
            "focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
          )}
          aria-label="Send message"
        >
          <Send className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
}
