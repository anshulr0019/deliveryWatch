"use client";

import { useEffect, useRef } from "react";
import {
  motion,
  useMotionValue,
  useSpring,
  useTransform,
} from "motion/react";

export function LiveBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mouseX = useMotionValue(0.5);
  const mouseY = useMotionValue(0.5);

  // Raw mouse position for canvas grid warp
  const rawX = useRef(0.5);
  const rawY = useRef(0.5);
  const animFrame = useRef<number>(0);

  // Spring-smoothed mouse for orb parallax
  const springX1 = useSpring(mouseX, { stiffness: 40, damping: 18, mass: 1.2 });
  const springY1 = useSpring(mouseY, { stiffness: 40, damping: 18, mass: 1.2 });
  const springX2 = useSpring(mouseX, { stiffness: 18, damping: 22, mass: 2 });
  const springY2 = useSpring(mouseY, { stiffness: 18, damping: 22, mass: 2 });
  const springX3 = useSpring(mouseX, { stiffness: 8, damping: 28, mass: 3 });
  const springY3 = useSpring(mouseY, { stiffness: 8, damping: 28, mass: 3 });

  const orb1X = useTransform(springX1, [0, 1], [-140, 140]);
  const orb1Y = useTransform(springY1, [0, 1], [-90, 90]);
  const orb2X = useTransform(springX2, [0, 1], [90, -90]);
  const orb2Y = useTransform(springY2, [0, 1], [70, -70]);
  const orb3X = useTransform(springX3, [0, 1], [-70, 70]);
  const orb3Y = useTransform(springY3, [0, 1], [-50, 50]);

  const gradX = useTransform(springX1, [0, 1], [20, 80]);
  const gradY = useTransform(springY1, [0, 1], [10, 65]);

  useEffect(() => {
    const handleMove = (e: MouseEvent) => {
      const nx = e.clientX / window.innerWidth;
      const ny = e.clientY / window.innerHeight;
      mouseX.set(nx);
      mouseY.set(ny);
      rawX.current = nx;
      rawY.current = ny;
    };
    window.addEventListener("mousemove", handleMove, { passive: true });
    return () => window.removeEventListener("mousemove", handleMove);
  }, [mouseX, mouseY]);

  // Canvas-based interactive warped grid
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let lerpX = 0.5;
    let lerpY = 0.5;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    const GRID = 52; // grid cell size in px
    const WARP = 18; // max warp magnitude in px
    const LINE_COLOR = "rgba(15, 55, 46, 0.06)";

    const draw = () => {
      const w = canvas.width;
      const h = canvas.height;
      ctx.clearRect(0, 0, w, h);

      // Lerp toward raw mouse
      lerpX += (rawX.current - lerpX) * 0.06;
      lerpY += (rawY.current - lerpY) * 0.06;

      const cx = lerpX * w;
      const cy = lerpY * h;

      ctx.strokeStyle = LINE_COLOR;
      ctx.lineWidth = 1;

      // Vertical lines
      for (let x = 0; x <= w + GRID; x += GRID) {
        ctx.beginPath();
        // Sample multiple y points for a curved/warped line
        const steps = Math.ceil(h / 8);
        for (let s = 0; s <= steps; s++) {
          const y = (s / steps) * h;
          const dx = x - cx;
          const dy = y - cy;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const influence = Math.exp(-dist / (w * 0.45));
          const warpedX = x + (dx / (dist || 1)) * WARP * influence * -1;
          const warpedY = y + (dy / (dist || 1)) * WARP * influence * -1;
          if (s === 0) ctx.moveTo(warpedX, warpedY);
          else ctx.lineTo(warpedX, warpedY);
        }
        ctx.stroke();
      }

      // Horizontal lines
      for (let y = 0; y <= h + GRID; y += GRID) {
        ctx.beginPath();
        const steps = Math.ceil(w / 8);
        for (let s = 0; s <= steps; s++) {
          const x = (s / steps) * w;
          const dx = x - cx;
          const dy = y - cy;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const influence = Math.exp(-dist / (h * 0.45));
          const warpedX = x + (dx / (dist || 1)) * WARP * influence * -1;
          const warpedY = y + (dy / (dist || 1)) * WARP * influence * -1;
          if (s === 0) ctx.moveTo(warpedX, warpedY);
          else ctx.lineTo(warpedX, warpedY);
        }
        ctx.stroke();
      }

      // Draw cursor glow dot where mouse is
      const glowRadius = 180;
      const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, glowRadius);
      grad.addColorStop(0, "rgba(16, 185, 129, 0.07)");
      grad.addColorStop(0.5, "rgba(16, 185, 129, 0.03)");
      grad.addColorStop(1, "rgba(16, 185, 129, 0)");
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(cx, cy, glowRadius, 0, Math.PI * 2);
      ctx.fill();

      animFrame.current = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      window.removeEventListener("resize", resize);
      cancelAnimationFrame(animFrame.current);
    };
  }, []);

  return (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden" aria-hidden="true">

      {/* Canvas warped grid */}
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />

      {/* Cursor-reactive luminous glow overlay */}
      <motion.div
        className="absolute inset-0"
        style={{
          background: useTransform(
            [gradX, gradY],
            ([x, y]) =>
              `radial-gradient(ellipse 75% 65% at ${x}% ${y}%, rgba(16,185,129,0.055) 0%, rgba(236,253,245,0.3) 35%, transparent 65%)`
          ),
        }}
      />

      {/* Orb 1 — soft emerald mint, follows cursor closely */}
      <motion.div
        className="absolute rounded-full"
        style={{
          width: 700,
          height: 700,
          top: "-120px",
          left: "calc(50% - 350px)",
          x: orb1X,
          y: orb1Y,
          background:
            "radial-gradient(circle, rgba(16,185,129,0.085) 0%, rgba(236,253,245,0.45) 40%, transparent 70%)",
          filter: "blur(65px)",
        }}
      />

      {/* Orb 2 — pale pine sage, parallax opposite */}
      <motion.div
        className="absolute rounded-full"
        style={{
          width: 550,
          height: 550,
          top: "12%",
          right: "-130px",
          x: orb2X,
          y: orb2Y,
          background:
            "radial-gradient(circle, rgba(15,55,46,0.035) 0%, rgba(209,250,229,0.28) 50%, transparent 70%)",
          filter: "blur(60px)",
        }}
      />

      {/* Orb 3 — soft teal, slow drift */}
      <motion.div
        className="absolute rounded-full"
        style={{
          width: 480,
          height: 480,
          top: "42%",
          left: "-140px",
          x: orb3X,
          y: orb3Y,
          background:
            "radial-gradient(circle, rgba(52,211,153,0.055) 0%, rgba(240,253,250,0.18) 50%, transparent 70%)",
          filter: "blur(55px)",
        }}
      />

      {/* Bottom subtle ambient gradient */}
      <div
        className="absolute bottom-0 left-1/2 h-[400px] w-[1500px] -translate-x-1/2"
        style={{
          background:
            "radial-gradient(ellipse at center bottom, rgba(16,185,129,0.045) 0%, transparent 70%)",
          filter: "blur(45px)",
        }}
      />
    </div>
  );
}
