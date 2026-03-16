"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";

import { ConversationList } from "@/src/components/chat/conversation-list";
import { ChatInterface } from "@/src/components/chat/chat-interface";

function ChatPageContent() {
  const searchParams = useSearchParams();
  const documentId = searchParams.get("documentId");

  return (
    <div className="-m-4 flex h-[calc(100vh-4rem)] md:-m-8">
      {/* Conversation list — hidden on mobile */}
      <div className="hidden w-80 shrink-0 md:block">
        <ConversationList />
      </div>

      {/* Chat interface — new conversation (no conversationId) */}
      <div className="flex-1">
        <ChatInterface
          documentId={documentId}
          showDocumentSelector={!documentId}
        />
      </div>
    </div>
  );
}

export default function ChatPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-full items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      }
    >
      <ChatPageContent />
    </Suspense>
  );
}
