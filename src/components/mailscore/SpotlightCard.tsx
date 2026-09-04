"use client";

import { useRef, useState, type CSSProperties, type MouseEvent, type ReactNode } from "react";

interface SpotlightCardProps {
  children: ReactNode;
  className?: string;
  innerClassName?: string;
  spotlightColor?: string;
  borderGlowColor?: string;
  style?: CSSProperties;
}

export function SpotlightCard({
  children,
  className = "",
  innerClassName = "",
  spotlightColor = "rgba(16, 185, 129, 0.04)",
  borderGlowColor = "rgba(16, 185, 129, 0.35)",
  style,
}: SpotlightCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ x: -200, y: -200 });
  const [opacity, setOpacity] = useState(0);

  const handleMouseMove = (e: MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    setPosition({ x: e.clientX - rect.left, y: e.clientY - rect.top });
    setOpacity(1);
  };

  return (
    <div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={() => setOpacity(0)}
      className={`group relative rounded-2xl p-[1px] transition-all duration-300 ${className}`}
      style={{ background: "#E2E8F0", ...style }}
    >
      {/* 1px Specular Border Glint that follows mouse */}
      <div
        className="pointer-events-none absolute inset-0 rounded-2xl transition-opacity duration-500 ease-out"
        style={{
          opacity,
          background: `radial-gradient(360px circle at ${position.x}px ${position.y}px, ${borderGlowColor}, transparent 70%)`,
        }}
        aria-hidden="true"
      />
      {/* Inner card surface */}
      <div
        className={`relative h-full rounded-[calc(1rem-1px)] bg-white shadow-[0_4px_24px_-6px_rgba(0,0,0,0.05)] transition-all duration-300 ${innerClassName}`}
      >
        <div
          className="pointer-events-none absolute inset-0 rounded-[calc(1rem-1px)] transition-opacity duration-500 ease-out"
          style={{
            opacity,
            background: `radial-gradient(400px circle at ${position.x}px ${position.y}px, ${spotlightColor}, transparent 65%)`,
          }}
          aria-hidden="true"
        />
        <div className="relative z-10 h-full">{children}</div>
      </div>
    </div>
  );
}
