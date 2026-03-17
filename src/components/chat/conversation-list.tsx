"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import { Plus, Trash2, MessageSquare, Loader2 } from "lucide-react";

import {
  useConversations,
  useDeleteConversation,
} from "@/src/hooks/queries/use-conversations";
import { cn } from "@/src/lib/utils/cn";

export function ConversationList() {
  const pathname = usePathname();
  const { conversations, isLoading } = useConversations();
  const deleteConversation = useDeleteConversation();
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  function handleDelete(id: string) {
    if (confirmDeleteId === id) {
      deleteConversation.mutate(id);
      setConfirmDeleteId(null);
    } else {
      setConfirmDeleteId(id);
    }
  }

  function formatRelativeTime(date: Date | string) {
    const now = new Date();
    const d = new Date(date);
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `${diffDays}d ago`;
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  }

  return (
    <div className="flex h-full flex-col border-r border-border bg-card">
      <div className="flex items-center justify-between border-b border-border p-4">
        <h2 className="font-heading text-lg font-semibold text-foreground">
          Conversations
        </h2>
        <Link
          href="/chat"
          className={cn(
            "flex h-8 w-8 items-center justify-center rounded-md",
            "bg-primary text-primary-foreground",
            "hover:opacity-90 transition-opacity"
          )}
          aria-label="New conversation"
        >
          <Plus className="h-4 w-4" />
        </Link>
      </div>

      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="space-y-2 p-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="h-16 animate-shimmer rounded-md bg-muted/60 bg-[length:200%_100%] bg-gradient-to-r from-muted/60 via-muted/30 to-muted/60"
              />
            ))}
          </div>
        ) : conversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 p-8 text-center">
            <MessageSquare className="h-10 w-10 text-muted-foreground/40" />
            <p className="font-body text-sm text-muted-foreground">
              No conversations yet
            </p>
          </div>
        ) : (
          <nav className="space-y-1 p-2">
            <AnimatePresence>
              {conversations.map((conv) => {
                const isActive = pathname === `/chat/${conv.id}`;
                const truncatedTitle =
                  conv.title.length > 50
                    ? conv.title.slice(0, 50) + "..."
                    : conv.title;
                const truncatedPreview = conv.lastMessage
                  ? conv.lastMessage.length > 60
                    ? conv.lastMessage.slice(0, 60) + "..."
                    : conv.lastMessage
                  : null;

                return (
                  <motion.div
                    key={conv.id}
                    initial={{ opacity: 0, x: -12 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -12 }}
                    transition={{ duration: 0.2 }}
                  >
                    <Link
                      href={`/chat/${conv.id}`}
                      className={cn(
                        "group flex items-start gap-2 rounded-md px-3 py-2.5",
                        "transition-colors",
                        isActive
                          ? "bg-accent text-accent-foreground"
                          : "hover:bg-accent/50"
                      )}
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-ui text-sm font-medium text-foreground">
                          {truncatedTitle}
                        </p>
                        {truncatedPreview && (
                          <p className="mt-0.5 truncate font-body text-xs text-muted-foreground">
                            {truncatedPreview}
                          </p>
                        )}
                        <p className="mt-1 font-ui text-xs text-muted-foreground/70">
                          {formatRelativeTime(conv.updatedAt)}
                        </p>
                      </div>

                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleDelete(conv.id);
                        }}
                        className={cn(
                          "shrink-0 rounded p-1 opacity-0 transition-opacity",
                          "group-hover:opacity-100",
                          "hover:bg-destructive/10 hover:text-destructive",
                          confirmDeleteId === conv.id &&
                            "opacity-100 bg-destructive/10 text-destructive"
                        )}
                        aria-label={
                          confirmDeleteId === conv.id
                            ? "Confirm delete"
                            : "Delete conversation"
                        }
                      >
                        {deleteConversation.isPending ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Trash2 className="h-3.5 w-3.5" />
                        )}
                      </button>
                    </Link>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </nav>
        )}
      </div>
    </div>
  );
}
