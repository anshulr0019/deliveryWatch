"use client";

import { useEffect } from "react";
import { useMotionValue, useSpring, motion } from "motion/react";

export function CursorGlow() {
  const cursorX = useMotionValue(-200);
  const cursorY = useMotionValue(-200);

  const springX = useSpring(cursorX, { stiffness: 80, damping: 18, mass: 0.6 });
  const springY = useSpring(cursorY, { stiffness: 80, damping: 18, mass: 0.6 });

  useEffect(() => {
    const handleMove = (e: MouseEvent) => {
      cursorX.set(e.clientX);
      cursorY.set(e.clientY);
    };
    window.addEventListener("mousemove", handleMove, { passive: true });
    return () => window.removeEventListener("mousemove", handleMove);
  }, [cursorX, cursorY]);

  return (
    <motion.div
      className="pointer-events-none fixed z-[1] rounded-full"
      style={{
        width: 400,
        height: 400,
        x: springX,
        y: springY,
        translateX: "-50%",
        translateY: "-50%",
        background:
          "radial-gradient(circle, rgba(200,169,110,0.06) 0%, rgba(200,169,110,0.018) 40%, transparent 70%)",
        filter: "blur(12px)",
      }}
      aria-hidden="true"
    />
  );
}
