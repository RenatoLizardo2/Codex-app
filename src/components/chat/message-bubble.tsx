"use client";

import { motion } from "motion/react";

import { StreamingText } from "@/src/components/chat/streaming-text";
import { CitationCard } from "@/src/components/chat/citation-card";
import { cn } from "@/src/lib/utils/cn";

import type { ChatMessage } from "@/src/types/chat";

type MessageBubbleProps = {
  message: ChatMessage;
  isStreaming?: boolean;
};

export function MessageBubble({ message, isStreaming = false }: MessageBubbleProps) {
  const isUser = message.role === "user";
  const hasCitations =
    message.citations && message.citations.length > 0 && !isUser;

  const formattedTime = new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
  }).format(message.createdAt);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
      className={cn("flex", isUser ? "justify-end" : "justify-start")}
    >
      <div
        className={cn(
          "max-w-[80%] rounded-lg px-4 py-3",
          isUser
            ? "bg-primary text-primary-foreground"
            : "bg-card border border-border"
        )}
      >
        {isStreaming ? (
          <StreamingText content={message.content} isStreaming />
        ) : (
          <p className="font-body text-base leading-relaxed whitespace-pre-wrap">
            {message.content}
          </p>
        )}

        {hasCitations && (
          <div className="mt-3 space-y-2 border-t border-border/50 pt-3">
            {message.citations!.map((citation, index) => (
              <CitationCard
                key={citation.chunkId}
                citation={citation}
                index={index}
              />
            ))}
          </div>
        )}

        <p
          className={cn(
            "mt-1 font-ui text-xs",
            isUser ? "text-primary-foreground/60" : "text-muted-foreground"
          )}
        >
          {formattedTime}
        </p>
      </div>
    </motion.div>
  );
}
