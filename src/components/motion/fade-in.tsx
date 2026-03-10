"use client";

import { motion } from "motion/react";

type FadeInProps = {
  children: React.ReactNode;
  delay?: number;
  duration?: number;
  className?: string;
};

export function FadeIn({
  children,
  delay = 0,
  duration = 0.3,
  className,
}: FadeInProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay, duration, ease: [0.16, 1, 0.3, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
