"use client";

import { motion } from "motion/react";

const OFFSET = 24;

const directionMap = {
  left: { x: -OFFSET, y: 0 },
  right: { x: OFFSET, y: 0 },
  up: { x: 0, y: -OFFSET },
  down: { x: 0, y: OFFSET },
};

type SlideInProps = {
  children: React.ReactNode;
  direction?: "left" | "right" | "up" | "down";
  delay?: number;
  duration?: number;
  className?: string;
};

export function SlideIn({
  children,
  direction = "left",
  delay = 0,
  duration = 0.3,
  className,
}: SlideInProps) {
  const offset = directionMap[direction];

  return (
    <motion.div
      initial={{ opacity: 0, x: offset.x, y: offset.y }}
      animate={{ opacity: 1, x: 0, y: 0 }}
      transition={{ delay, duration, ease: [0.16, 1, 0.3, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
