// Chat types — messages, citations, and streaming types

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  citations?: ChatCitation[];
  createdAt: Date;
}

export interface ChatCitation {
  chunkId: string;
  text: string;
  pageNumber: number | null;
  documentId: string;
  documentTitle: string;
}

export interface StreamingState {
  isStreaming: boolean;
  partialContent: string;
}

export type ConversationWithMessages = {
  id: string;
  userId: string;
  documentId: string | null;
  title: string;
  createdAt: Date;
  updatedAt: Date;
  messages: ChatMessage[];
};

export type ConversationListItem = {
  id: string;
  title: string;
  documentId: string | null;
  updatedAt: Date;
  lastMessage: string | null;
};
