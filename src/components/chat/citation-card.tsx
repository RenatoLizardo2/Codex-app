"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { BookOpen } from "lucide-react";

import { cn } from "@/src/lib/utils/cn";

import type { ChatCitation } from "@/src/types/chat";

type CitationCardProps = {
  citation: ChatCitation;
  index: number;
};

export function CitationCard({ citation, index }: CitationCardProps) {
  const truncatedText =
    citation.text.length > 120
      ? citation.text.slice(0, 120) + "..."
      : citation.text;

  const isDocumentRemoved =
    !citation.documentId || citation.documentTitle === "Unknown Document";

  const content = (
    <motion.div
      whileHover={{ y: -2 }}
      transition={{ duration: 0.15 }}
      className={cn(
        "flex gap-3 rounded-md border border-border bg-card p-3",
        "border-l-4 border-l-primary",
        "transition-shadow hover:shadow-md"
      )}
    >
      <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 font-ui text-xs font-semibold text-primary">
        {index + 1}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <BookOpen className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          <span className="truncate font-ui text-xs font-medium text-foreground">
            {isDocumentRemoved ? "Document removed" : citation.documentTitle}
          </span>
          {citation.pageNumber && (
            <span className="shrink-0 font-ui text-xs text-muted-foreground">
              p. {citation.pageNumber}
            </span>
          )}
        </div>

        <p className="mt-1 font-mono text-xs leading-relaxed text-muted-foreground">
          {truncatedText}
        </p>
      </div>
    </motion.div>
  );

  if (isDocumentRemoved) {
    return content;
  }

  return (
    <Link href={`/document/${citation.documentId}`} className="block">
      {content}
    </Link>
  );
}
