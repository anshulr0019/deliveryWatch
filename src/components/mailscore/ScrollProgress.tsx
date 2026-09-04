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
        background: "linear-gradient(90deg, #C8A96E 0%, #E8D2A2 60%, #F5E8C7 100%)",
        boxShadow: "0 0 16px rgba(200, 169, 110, 0.6), 0 0 4px rgba(232, 210, 162, 0.8)",
      }}
    />
  );
}
