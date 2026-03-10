"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { X } from "lucide-react";

import { navigationItems } from "@/src/config/navigation";
import { useUIStore } from "@/src/stores/ui-store";
import { cn } from "@/src/lib/utils/cn";

export function MobileNav() {
  const pathname = usePathname();
  const sidebarOpen = useUIStore((s) => s.sidebarOpen);
  const toggleSidebar = useUIStore((s) => s.toggleSidebar);

  if (!sidebarOpen) return null;

  return (
    <div className="fixed inset-0 z-50 md:hidden">
      <div
        className="absolute inset-0 bg-foreground/50"
        onClick={toggleSidebar}
        aria-hidden="true"
      />

      <aside className="relative flex h-full w-64 flex-col bg-card">
        <div className="flex h-16 items-center justify-between px-6">
          <span className="font-heading text-xl font-bold text-foreground">
            The Codex
          </span>
          <button
            onClick={toggleSidebar}
            className="rounded-md p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
            aria-label="Close menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 space-y-1 px-3 py-4">
          {navigationItems.map((item) => {
            const isActive = pathname.startsWith(item.href);
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={toggleSidebar}
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2 font-ui text-sm transition-colors",
                  isActive
                    ? "bg-accent text-accent-foreground"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                )}
              >
                <Icon className="h-5 w-5" />
                {item.title}
              </Link>
            );
          })}
        </nav>
      </aside>
    </div>
  );
}
