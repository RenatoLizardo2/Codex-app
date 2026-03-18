"use client";

import { useRef, useEffect, useCallback } from "react";
import { motion } from "motion/react";
import { BookOpen, AlertCircle, Loader2 } from "lucide-react";

import { MessageBubble } from "@/src/components/chat/message-bubble";
import { ChatInput } from "@/src/components/chat/chat-input";
import { DeskLamp } from "@/src/components/motion/desk-lamp";
import { useConversation } from "@/src/hooks/queries/use-conversations";
import {
  useSendMessage,
  parseMessagesFromConversation,
} from "@/src/hooks/queries/use-messages";
import { useChatStore } from "@/src/stores/chat-store";
import { cn } from "@/src/lib/utils/cn";

import type { ChatMessage } from "@/src/types/chat";

type ChatInterfaceProps = {
  conversationId?: string | null;
  documentId?: string | null;
  showDocumentSelector?: boolean;
};

export function ChatInterface({
  conversationId,
  documentId,
  showDocumentSelector = false,
}: ChatInterfaceProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const isStreaming = useChatStore((s) => s.isStreaming);
  const setActiveConversationId = useChatStore((s) => s.setActiveConversationId);
  const clearDraft = useChatStore((s) => s.clearDraft);

  const { conversation, isLoading, error, refetch } =
    useConversation(conversationId ?? null);
  const { sendMessage, streamingContent } = useSendMessage();

  // Track active conversation
  useEffect(() => {
    setActiveConversationId(conversationId ?? null);
    return () => setActiveConversationId(null);
  }, [conversationId, setActiveConversationId]);

  // Parse messages from conversation data
  const messages: ChatMessage[] = conversation?.messages
    ? parseMessagesFromConversation(conversation.messages)
    : [];

  // Build streaming message if active
  const streamingMessage: ChatMessage | null =
    isStreaming && streamingContent
      ? {
          id: "streaming",
          role: "assistant",
          content: streamingContent,
          createdAt: new Date(),
        }
      : null;

  const allMessages = streamingMessage
    ? [...messages, streamingMessage]
    : messages;

  // Auto-scroll to bottom on new messages
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [allMessages.length, streamingContent, scrollToBottom]);

  const handleSubmit = useCallback(
    async (content: string, selectedDocumentId?: string) => {
      const result = await sendMessage({
        content,
        conversationId: conversationId ?? undefined,
        documentId: selectedDocumentId ?? documentId ?? undefined,
      });

      clearDraft();

      // If a new conversation was created, trigger a refetch or navigation
      if (result?.conversationId && !conversationId) {
        window.history.pushState(null, "", `/chat/${result.conversationId}`);
        // Trigger re-render by dispatching popstate
        window.dispatchEvent(new PopStateEvent("popstate"));
      }

      if (conversationId) {
        refetch();
      }
    },
    [conversationId, documentId, sendMessage, clearDraft, refetch]
  );

  if (isLoading && conversationId) {
    return (
      <div className="flex h-full flex-col">
        <div className="flex flex-1 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  if (error && conversationId) {
    return (
      <div className="flex h-full flex-col">
        <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
          <AlertCircle className="h-12 w-12 text-destructive" />
          <div>
            <h3 className="font-heading text-lg font-semibold text-foreground">
              Failed to load conversation
            </h3>
            <p className="mt-1 font-body text-sm text-muted-foreground">
              Something went wrong. Please try again.
            </p>
          </div>
          <button
            onClick={() => refetch()}
            className={cn(
              "rounded-md px-4 py-2",
              "bg-primary text-primary-foreground",
              "font-ui text-sm font-medium",
              "hover:opacity-90 transition-opacity"
            )}
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      {/* Message list */}
      <div className="relative flex-1 overflow-y-auto px-4 py-6">
        <DeskLamp />
        {allMessages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3 }}
            >
              <BookOpen className="h-16 w-16 text-primary/40" />
            </motion.div>
            <div>
              <h3 className="font-heading text-xl font-semibold text-foreground">
                Ask the Librarian
              </h3>
              <p className="mt-2 max-w-md font-body text-sm text-muted-foreground">
                Ask a question about your documents and the Librarian will find
                the most relevant passages to answer you, with citations.
              </p>
            </div>
          </div>
        ) : (
          <div className="mx-auto max-w-3xl space-y-4">
            {allMessages.map((message) => (
              <MessageBubble
                key={message.id}
                message={message}
                isStreaming={message.id === "streaming"}
              />
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input */}
      <div className="mx-auto w-full max-w-3xl">
        <ChatInput
          onSubmit={handleSubmit}
          showDocumentSelector={showDocumentSelector}
        />
      </div>
    </div>
  );
}
