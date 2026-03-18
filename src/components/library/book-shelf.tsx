"use client";

import { AnimatePresence, LayoutGroup, motion } from "motion/react";

import { BookCard } from "@/src/components/library/book-card";
import {
  StaggerChildren,
  StaggerItem,
} from "@/src/components/motion/stagger-children";
import { useReducedMotion } from "@/src/hooks/use-reduced-motion";

import type { Document } from "@/src/types/database";

type BookShelfProps = {
  documents: Document[];
};

const SPRING = { type: "spring" as const, stiffness: 300, damping: 30 };

export function BookShelf({ documents }: BookShelfProps) {
  const isReduced = useReducedMotion();

  return (
    <LayoutGroup>
      <StaggerChildren
        className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
      >
        <AnimatePresence mode="popLayout">
          {documents.map((doc) => (
            <motion.div
              key={doc.id}
              layout={!isReduced}
              layoutId={doc.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={isReduced ? { duration: 0 } : SPRING}
            >
              <StaggerItem>
                <BookCard document={doc} />
              </StaggerItem>
            </motion.div>
          ))}
        </AnimatePresence>
      </StaggerChildren>
    </LayoutGroup>
  );
}
