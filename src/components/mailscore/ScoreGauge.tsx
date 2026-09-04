"use client";

import { useEffect, useState } from "react";
import { scoreColor, scoreLabel } from "@/lib/score-ui";

interface ScoreGaugeProps {
  score: number;
  size?: number;
  strokeWidth?: number;
  grade?: string;
  subtitle?: string;
}

export function ScoreGauge({ score, size = 200, strokeWidth = 12, grade, subtitle }: ScoreGaugeProps) {
  const [animated, setAnimated] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => setAnimated(score), 60);
    return () => clearTimeout(t);
  }, [score]);

  const r = (size - strokeWidth) / 2;
  const c = 2 * Math.PI * r;
  const offset = c - (Math.max(0, Math.min(100, animated)) / 100) * c;
  const color = scoreColor(score);

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <defs>
          <linearGradient id="gauge-gold" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#E8D2A2" />
            <stop offset="50%" stopColor="#C8A96E" />
            <stop offset="100%" stopColor="#967840" />
          </linearGradient>
        </defs>
        <circle cx={size / 2} cy={size / 2} r={r} stroke="rgba(255,255,255,0.06)" strokeWidth={strokeWidth} fill="none" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={score >= 85 ? "url(#gauge-gold)" : color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          fill="none"
          strokeDasharray={c}
          strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 1.2s cubic-bezier(0.2, 0.7, 0.2, 1)", filter: `drop-shadow(0 0 10px ${color}66)` }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <div className="font-display text-5xl font-semibold leading-none tracking-tight" style={{ color, fontSize: size * 0.26 }}>
          {score}
        </div>
        <div className="mt-1 text-[10px] uppercase tracking-[0.2em] text-muted-2" style={{ fontSize: Math.max(9, size * 0.055) }}>
          {grade ? `Grade ${grade}` : "/ 100"}
        </div>
        {subtitle !== undefined ? (
          <div className="mt-1 text-xs text-muted" style={{ fontSize: Math.max(10, size * 0.06) }}>
            {subtitle}
          </div>
        ) : (
          <div className="mt-1 text-xs text-muted" style={{ fontSize: Math.max(10, size * 0.06) }}>
            {scoreLabel(score)}
          </div>
        )}
      </div>
    </div>
  );
}
