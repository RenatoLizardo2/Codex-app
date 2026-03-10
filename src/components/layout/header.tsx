"use client";

import { Menu, Search } from "lucide-react";

import { useUIStore } from "@/src/stores/ui-store";
import { ThemeToggle } from "@/src/components/layout/theme-toggle";

export function Header() {
  const toggleSidebar = useUIStore((s) => s.toggleSidebar);

  return (
    <header className="flex h-16 items-center gap-4 border-b border-border bg-card px-4 md:px-6">
      <button
        onClick={toggleSidebar}
        className="rounded-md p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground md:hidden"
        aria-label="Toggle menu"
      >
        <Menu className="h-5 w-5" />
      </button>

      <div className="flex-1" />

      <div className="relative hidden sm:block">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search your library..."
          disabled
          className="h-9 w-64 rounded-md border border-input bg-background pl-9 pr-4 font-ui text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      <ThemeToggle />
    </header>
  );
}
