"use client";

import { useEffect } from "react";
import {
  motion,
  useMotionValue,
  useSpring,
  useTransform,
} from "motion/react";

export function LiveBackground() {
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  // Spring-smoothed mouse position — orb 1 follows closely
  const springX1 = useSpring(mouseX, { stiffness: 40, damping: 18, mass: 1.2 });
  const springY1 = useSpring(mouseY, { stiffness: 40, damping: 18, mass: 1.2 });

  // Orb 2 lags behind (parallax)
  const springX2 = useSpring(mouseX, { stiffness: 18, damping: 22, mass: 2 });
  const springY2 = useSpring(mouseY, { stiffness: 18, damping: 22, mass: 2 });

  // Orb 3 floats in opposite direction
  const springX3 = useSpring(mouseX, { stiffness: 8, damping: 28, mass: 3 });
  const springY3 = useSpring(mouseY, { stiffness: 8, damping: 28, mass: 3 });

  // Map mouse position to translate offsets
  const orb1X = useTransform(springX1, [0, 1], [-120, 120]);
  const orb1Y = useTransform(springY1, [0, 1], [-80, 80]);
  const orb2X = useTransform(springX2, [0, 1], [80, -80]);
  const orb2Y = useTransform(springY2, [0, 1], [60, -60]);
  const orb3X = useTransform(springX3, [0, 1], [-60, 60]);
  const orb3Y = useTransform(springY3, [0, 1], [-40, 40]);

  // Dynamic radial gradient follows cursor
  const gradX = useTransform(springX1, [0, 1], [25, 75]);
  const gradY = useTransform(springY1, [0, 1], [15, 60]);

  useEffect(() => {
    const handleMove = (e: MouseEvent) => {
      mouseX.set(e.clientX / window.innerWidth);
      mouseY.set(e.clientY / window.innerHeight);
    };
    window.addEventListener("mousemove", handleMove, { passive: true });
    return () => window.removeEventListener("mousemove", handleMove);
  }, [mouseX, mouseY]);

  return (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden" aria-hidden="true">
      {/* Cursor-reactive gradient mesh overlay */}
      <motion.div
        className="absolute inset-0"
        style={{
          background: useTransform(
            [gradX, gradY],
            ([x, y]) =>
              `radial-gradient(ellipse 80% 70% at ${x}% ${y}%, rgba(200,169,110,0.035) 0%, transparent 65%)`
          ),
        }}
      />

      {/* Orb 1 — primary champagne gold */}
      <motion.div
        className="absolute rounded-full"
        style={{
          width: 700,
          height: 700,
          top: "calc(50% - 350px)",
          left: "calc(50% - 350px)",
          x: orb1X,
          y: orb1Y,
          background:
            "radial-gradient(circle, rgba(200,169,110,0.12) 0%, rgba(200,169,110,0.035) 45%, transparent 70%)",
          filter: "blur(60px)",
        }}
      />

      {/* Orb 2 — warm soft gold */}
      <motion.div
        className="absolute rounded-full"
        style={{
          width: 500,
          height: 500,
          top: "20%",
          right: "5%",
          x: orb2X,
          y: orb2Y,
          background:
            "radial-gradient(circle, rgba(232,210,162,0.09) 0%, rgba(232,210,162,0.025) 50%, transparent 70%)",
          filter: "blur(55px)",
        }}
      />

      {/* Orb 3 — deep bronze gold */}
      <motion.div
        className="absolute rounded-full"
        style={{
          width: 420,
          height: 420,
          top: "40%",
          left: "5%",
          x: orb3X,
          y: orb3Y,
          background:
            "radial-gradient(circle, rgba(150,120,64,0.08) 0%, rgba(150,120,64,0.02) 50%, transparent 70%)",
          filter: "blur(50px)",
        }}
      />

      {/* Bottom ambient glow */}
      <div
        className="absolute bottom-0 left-1/2 h-[300px] w-[1200px] -translate-x-1/2"
        style={{
          background:
            "radial-gradient(ellipse at center bottom, rgba(200,169,110,0.03) 0%, transparent 70%)",
          filter: "blur(40px)",
        }}
      />
    </div>
  );
}
