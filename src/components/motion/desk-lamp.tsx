"use client";

import { motion } from "motion/react";

import { useReducedMotion } from "@/src/hooks/use-reduced-motion";

export function DeskLamp() {
  const isReduced = useReducedMotion();

  return (
    <motion.div
      aria-hidden="true"
      className="pointer-events-none absolute inset-x-0 top-0 z-0 hidden h-64 dark:block"
      style={{
        background:
          "radial-gradient(ellipse 60% 40% at 50% 0%, hsl(var(--night-gold) / 0.08), transparent)",
      }}
      initial={{ opacity: isReduced ? 1 : 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: isReduced ? 0 : 0.3 }}
    />
  );
}
