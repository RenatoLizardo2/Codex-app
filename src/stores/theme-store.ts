"use client";

// Theme Store — light/dark mode preference (Zustand)

import { create } from "zustand";
import { persist } from "zustand/middleware";

type Theme = "light" | "dark";

type ThemeState = {
  theme: Theme;
};

type ThemeActions = {
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
};

export type ThemeStore = ThemeState & ThemeActions;

export const useThemeStore = create<ThemeStore>()(
  persist(
    (set) => ({
      theme: "light",

      setTheme: (theme) => set({ theme }),
      toggleTheme: () =>
        set((state) => ({
          theme: state.theme === "light" ? "dark" : "light",
        })),
    }),
    { name: "codex-theme" }
  )
);
