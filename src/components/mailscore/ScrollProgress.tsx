"use client";

import { motion, useScroll, useSpring, useTransform } from "motion/react";

export function ScrollProgress() {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, { stiffness: 120, damping: 30, restDelta: 0.001 });
  const opacity = useTransform(scrollYProgress, [0, 0.02], [0, 1]);

  return (
    <motion.div
      className="fixed top-0 left-0 right-0 z-[100] h-[2px] origin-left pointer-events-none"
      style={{
        scaleX,
        opacity,
        background: "linear-gradient(90deg, #0F372E 0%, #10B981 60%, #34D399 100%)",
        boxShadow: "0 0 16px rgba(16, 185, 129, 0.4), 0 0 4px rgba(15, 55, 46, 0.6)",
      }}
    />
  );
}
