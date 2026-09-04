"use client";

import { useRef, useEffect, useState } from "react";

interface MarqueeProps {
  items: { name: string; icon: string }[];
  speed?: number; // pixels per second
  gap?: number;   // gap between items in px
}

export function Marquee({ items, speed = 60, gap = 64 }: MarqueeProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [duration, setDuration] = useState(20);

  // Duplicate items so the strip is long enough to loop seamlessly
  const doubled = [...items, ...items, ...items];

  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;
    // Width of ONE set of items (we render 3x, so the loop resets at 1/3)
    const singleWidth = el.scrollWidth / 3;
    setDuration(singleWidth / speed);
  }, [speed]);

  return (
    <div className="marquee-outer" aria-hidden="true">
      <div
        ref={trackRef}
        className="marquee-track"
        style={{ animationDuration: `${duration}s` }}
      >
        {doubled.map((item, i) => (
          <div key={i} className="marquee-item" style={{ marginRight: gap }}>
            <span className="marquee-icon">{item.icon}</span>
            <span className="marquee-name">{item.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
