"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserButton } from "@clerk/nextjs";

import { navigationItems } from "@/src/config/navigation";
import { useUIStore } from "@/src/stores/ui-store";
import { cn } from "@/src/lib/utils/cn";
import { SlideIn } from "@/src/components/motion/slide-in";

export function Sidebar() {
  const pathname = usePathname();
  const sidebarOpen = useUIStore((s) => s.sidebarOpen);

  if (!sidebarOpen) return null;

  return (
    <SlideIn direction="left" className="hidden md:block">
      <aside className="flex h-screen w-64 flex-col border-r border-border bg-card">
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

        <div className="border-t border-border p-4">
          <UserButton />
        </div>
      </aside>
    </SlideIn>
  );
}
