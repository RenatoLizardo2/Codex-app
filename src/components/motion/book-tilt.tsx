"use client";

import { motion } from "motion/react";

import { cn } from "@/src/lib/utils/cn";

type BookTiltProps = {
  children: React.ReactNode;
  className?: string;
  tiltDegree?: number;
};

export function BookTilt({
  children,
  className,
  tiltDegree = 3,
}: BookTiltProps) {
  return (
    <motion.div
      whileHover={{
        scale: 1.03,
        rotateY: tiltDegree,
        boxShadow: "0 8px 30px rgba(62, 39, 35, 0.2)",
      }}
      transition={{
        duration: 0.3,
        ease: [0.16, 1, 0.3, 1],
      }}
      className={cn("will-change-transform", className)}
      style={{ transformStyle: "preserve-3d" }}
    >
      {children}
    </motion.div>
  );
}
