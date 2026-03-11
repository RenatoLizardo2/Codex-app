"use client";

import { motion } from "motion/react";

import { cn } from "@/src/lib/utils/cn";

type StaggerChildrenProps = {
  children: React.ReactNode;
  className?: string;
  staggerDelay?: number;
  as?: React.ElementType;
};

const containerVariants = (staggerDelay: number) => ({
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: staggerDelay,
    },
  },
});

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.3,
      ease: [0.16, 1, 0.3, 1],
    },
  },
};

export function StaggerChildren({
  children,
  className,
  staggerDelay = 0.05,
  as: Component = "div",
}: StaggerChildrenProps) {
  const MotionComponent = motion.create(Component);

  return (
    <MotionComponent
      variants={containerVariants(staggerDelay)}
      initial="hidden"
      animate="visible"
      className={className}
    >
      {children}
    </MotionComponent>
  );
}

type StaggerItemProps = {
  children: React.ReactNode;
  className?: string;
};

export function StaggerItem({ children, className }: StaggerItemProps) {
  return (
    <motion.div variants={itemVariants} className={cn(className)}>
      {children}
    </motion.div>
  );
}
