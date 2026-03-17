"use client";

import { use } from "react";

import { ConversationList } from "@/src/components/chat/conversation-list";
import { ChatInterface } from "@/src/components/chat/chat-interface";

type ConversationPageProps = {
  params: Promise<{ conversationId: string }>;
};

export default function ConversationPage({ params }: ConversationPageProps) {
  const { conversationId } = use(params);

  return (
    <div className="-m-4 flex h-[calc(100vh-4rem)] md:-m-8">
      {/* Conversation list — hidden on mobile */}
      <div className="hidden w-80 shrink-0 md:block">
        <ConversationList />
      </div>

      {/* Chat interface with specific conversation */}
      <div className="flex-1">
        <ChatInterface
          conversationId={conversationId}
          showDocumentSelector
        />
      </div>
    </div>
  );
}
