"use client";

import { useState, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";

import { useChatStore } from "@/src/stores/chat-store";

import type { ChatMessage, ChatCitation } from "@/src/types/chat";

type SendMessageOptions = {
  content: string;
  conversationId?: string;
  documentId?: string;
};

type SendMessageResult = {
  conversationId: string;
};

export function useSendMessage() {
  const queryClient = useQueryClient();
  const setIsStreaming = useChatStore((s) => s.setIsStreaming);
  const [streamingContent, setStreamingContent] = useState("");
  const [error, setError] = useState<Error | null>(null);

  const sendMessage = useCallback(
    async (options: SendMessageOptions): Promise<SendMessageResult | null> => {
      setIsStreaming(true);
      setStreamingContent("");
      setError(null);

      try {
        const response = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            content: options.content,
            conversationId: options.conversationId,
            documentId: options.documentId,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(
            (errorData as { error?: string }).error ?? "Failed to send message"
          );
        }

        const conversationId =
          response.headers.get("X-Conversation-Id") ??
          options.conversationId ??
          "";

        // Read the streaming response
        const reader = response.body?.getReader();
        if (!reader) throw new Error("No response stream");

        const decoder = new TextDecoder();
        let accumulated = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          // Parse Vercel AI SDK data stream format
          const lines = chunk.split("\n");
          for (const line of lines) {
            // Text delta lines start with "0:"
            if (line.startsWith("0:")) {
              const textContent = JSON.parse(line.slice(2)) as string;
              accumulated += textContent;
              setStreamingContent(accumulated);
            }
          }
        }

        // Invalidate queries after streaming completes
        queryClient.invalidateQueries({ queryKey: ["conversations"] });
        if (conversationId) {
          queryClient.invalidateQueries({
            queryKey: ["conversation", conversationId],
          });
        }

        setStreamingContent("");
        return { conversationId };
      } catch (err) {
        const error =
          err instanceof Error ? err : new Error("Unknown error occurred");
        setError(error);
        return null;
      } finally {
        setIsStreaming(false);
      }
    },
    [queryClient, setIsStreaming]
  );

  return {
    sendMessage,
    streamingContent,
    error,
    reset: () => {
      setStreamingContent("");
      setError(null);
    },
  };
}

export function parseMessagesFromConversation(
  messages: {
    id: string;
    role: string;
    content: string;
    citations: unknown;
    createdAt: string;
  }[]
): ChatMessage[] {
  return messages.map((m) => ({
    id: m.id,
    role: m.role as "user" | "assistant",
    content: m.content,
    citations: parseCitations(m.citations),
    createdAt: new Date(m.createdAt),
  }));
}

function parseCitations(raw: unknown): ChatCitation[] | undefined {
  if (!Array.isArray(raw) || raw.length === 0) return undefined;

  return raw.map((c: Record<string, unknown>) => ({
    chunkId: String(c.chunkId ?? ""),
    text: String(c.text ?? ""),
    pageNumber: typeof c.pageNumber === "number" ? c.pageNumber : null,
    documentId: String(c.documentId ?? c.chunkId ?? ""),
    documentTitle: String(c.documentTitle ?? "Unknown Document"),
  }));
}
