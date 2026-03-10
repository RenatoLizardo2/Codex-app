"use client";

// UI Store — sidebar state, modals, active views (Zustand)

import { create } from "zustand";

type UIState = {
  sidebarOpen: boolean;
  activeModal: string | null;
  activeDocumentId: string | null;
  uploadProgress: number;
};

type UIActions = {
  toggleSidebar: () => void;
  openModal: (modal: string) => void;
  closeModal: () => void;
  setActiveDocumentId: (id: string | null) => void;
  setUploadProgress: (progress: number) => void;
};

export type UIStore = UIState & UIActions;

export const useUIStore = create<UIStore>((set) => ({
  sidebarOpen: true,
  activeModal: null,
  activeDocumentId: null,
  uploadProgress: 0,

  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  openModal: (modal) => set({ activeModal: modal }),
  closeModal: () => set({ activeModal: null }),
  setActiveDocumentId: (id) => set({ activeDocumentId: id }),
  setUploadProgress: (progress) => set({ uploadProgress: progress }),
}));
