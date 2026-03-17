// Chat Store — draft input, active document selection, streaming state (Zustand)

import { create } from "zustand";

type ChatState = {
  draftInput: string;
  selectedDocumentId: string | null;
  isStreaming: boolean;
  activeConversationId: string | null;
};

type ChatActions = {
  setDraftInput: (input: string) => void;
  setSelectedDocumentId: (id: string | null) => void;
  setIsStreaming: (streaming: boolean) => void;
  setActiveConversationId: (id: string | null) => void;
  clearDraft: () => void;
  reset: () => void;
};

export type ChatStore = ChatState & ChatActions;

const initialState: ChatState = {
  draftInput: "",
  selectedDocumentId: null,
  isStreaming: false,
  activeConversationId: null,
};

export const useChatStore = create<ChatStore>((set) => ({
  ...initialState,

  setDraftInput: (input) => set({ draftInput: input }),
  setSelectedDocumentId: (id) => set({ selectedDocumentId: id }),
  setIsStreaming: (streaming) => set({ isStreaming: streaming }),
  setActiveConversationId: (id) => set({ activeConversationId: id }),
  clearDraft: () => set({ draftInput: "", selectedDocumentId: null }),
  reset: () => set(initialState),
}));
