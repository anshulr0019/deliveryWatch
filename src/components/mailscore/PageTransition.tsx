"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { MotionConfig, motion, useReducedMotion } from "motion/react";

/** A restrained route transition for dashboard pages. */
export function PageTransition({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const reduceMotion = useReducedMotion();

  return (
    <MotionConfig reducedMotion="user">
      <motion.div
        key={pathname}
        initial={reduceMotion ? false : { opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={reduceMotion ? { duration: 0 } : { duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
      >
        {children}
      </motion.div>
    </MotionConfig>
  );
}
