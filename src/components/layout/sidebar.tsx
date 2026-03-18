"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserButton } from "@clerk/nextjs";
import { motion, AnimatePresence } from "motion/react";

import { navigationItems } from "@/src/config/navigation";
import { useUIStore } from "@/src/stores/ui-store";
import { useConversations } from "@/src/hooks/queries/use-conversations";
import { useReducedMotion } from "@/src/hooks/use-reduced-motion";
import { cn } from "@/src/lib/utils/cn";

const SPRING = { type: "spring" as const, stiffness: 300, damping: 30 };

export function Sidebar() {
  const pathname = usePathname();
  const sidebarOpen = useUIStore((s) => s.sidebarOpen);
  const { conversations } = useConversations({ pageSize: 5 });
  const isReduced = useReducedMotion();

  return (
    <motion.aside
      className="hidden overflow-hidden border-r border-border bg-card md:flex md:flex-col md:h-screen"
      animate={{ width: sidebarOpen ? 256 : 0 }}
      transition={isReduced ? { duration: 0 } : SPRING}
    >
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            className="flex h-full w-64 flex-col"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: isReduced ? 0 : 0.15 }}
          >
            <div className="flex h-16 items-center px-6">
              <Link href="/" className="font-heading text-xl font-bold text-foreground">
                The Codex
              </Link>
            </div>

            <nav className="flex-1 space-y-1 px-3 py-4">
              {navigationItems.map((item) => {
                const isActive = pathname.startsWith(item.href);
                const Icon = item.icon;

                return (
                  <Link
                    key={item.href}
                    href={item.href}
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

            {conversations.length > 0 && (
              <div className="border-t border-border px-3 py-4">
                <h3 className="mb-2 px-3 font-ui text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Recent Chats
                </h3>
                <div className="space-y-0.5">
                  {conversations.map((conv) => {
                    const isActive = pathname === `/chat/${conv.id}`;
                    const truncatedTitle =
                      conv.title.length > 30
                        ? conv.title.slice(0, 30) + "..."
                        : conv.title;

                    return (
                      <Link
                        key={conv.id}
                        href={`/chat/${conv.id}`}
                        className={cn(
                          "block truncate rounded-md px-3 py-1.5 font-ui text-xs transition-colors",
                          isActive
                            ? "bg-accent text-accent-foreground"
                            : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                        )}
                      >
                        {truncatedTitle}
                      </Link>
                    );
                  })}
                  <Link
                    href="/chat"
                    className="block px-3 py-1.5 font-ui text-xs text-primary hover:underline"
                  >
                    View all
                  </Link>
                </div>
              </div>
            )}

            <div className="border-t border-border p-4">
              <UserButton />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.aside>
  );
}
