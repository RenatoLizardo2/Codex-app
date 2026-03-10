// Navigation config — sidebar navigation items

import { Library, MessageSquare } from "lucide-react";

import type { LucideIcon } from "lucide-react";

export type NavItem = {
  title: string;
  href: string;
  icon: LucideIcon;
};

export const navigationItems: NavItem[] = [
  { title: "My Library", href: "/library", icon: Library },
  { title: "Ask the Librarian", href: "/chat", icon: MessageSquare },
];
