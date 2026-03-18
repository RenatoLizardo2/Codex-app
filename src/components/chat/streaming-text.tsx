"use client";

import { useEffect, useRef, useSyncExternalStore, useCallback } from "react";
import { motion, useReducedMotion } from "motion/react";

import { MarkdownContent } from "@/src/components/chat/markdown-content";

type StreamingTextProps = {
  content: string;
  isStreaming?: boolean;
};

export function StreamingText({ content, isStreaming = false }: StreamingTextProps) {
  const prefersReducedMotion = useReducedMotion();
  const displayedLengthRef = useRef(0);
  const prevContentLengthRef = useRef(0);
  const listenersRef = useRef(new Set<() => void>());
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const subscribe = useCallback((listener: () => void) => {
    listenersRef.current.add(listener);
    return () => { listenersRef.current.delete(listener); };
  }, []);

  const getSnapshot = useCallback(() => displayedLengthRef.current, []);

  const displayedLength = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  // Notify all subscribers when displayed length changes
  const notify = useCallback(() => {
    for (const listener of listenersRef.current) {
      listener();
    }
  }, []);

  useEffect(() => {
    // Clear any existing interval
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    // If reduced motion or not streaming, show all content immediately
    if (prefersReducedMotion || !isStreaming) {
      displayedLengthRef.current = content.length;
      prevContentLengthRef.current = content.length;
      notify();
      return;
    }

    // Reset if content is shorter (new message)
    if (content.length < prevContentLengthRef.current) {
      displayedLengthRef.current = 0;
      prevContentLengthRef.current = 0;
      notify();
    }

    // Animate new characters as they arrive during streaming
    if (content.length > prevContentLengthRef.current) {
      const startIndex = displayedLengthRef.current;
      if (startIndex >= content.length) {
        prevContentLengthRef.current = content.length;
        return;
      }

      intervalRef.current = setInterval(() => {
        displayedLengthRef.current = Math.min(
          displayedLengthRef.current + 2,
          content.length
        );
        notify();
        if (displayedLengthRef.current >= content.length && intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
      }, 10);

      prevContentLengthRef.current = content.length;
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [content, isStreaming, prefersReducedMotion, notify]);

  const visibleContent = content.slice(0, displayedLength);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.15 }}
    >
      <MarkdownContent content={visibleContent} />
      {isStreaming && displayedLength < content.length && (
        <span className="inline-block h-4 w-1 animate-pulse bg-foreground/60" />
      )}
    </motion.div>
  );
}
