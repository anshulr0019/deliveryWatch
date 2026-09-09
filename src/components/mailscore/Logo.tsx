import Link from "next/link";

export function Logo({
  href = "/",
  compact = false,
  size = "md",
}: {
  href?: string;
  compact?: boolean;
  size?: "sm" | "md" | "lg";
}) {
  const dim = size === "sm" ? 30 : size === "lg" ? 42 : 36;
  const iconSize = size === "sm" ? 20 : size === "lg" ? 28 : 24;

  return (
    <Link href={href} className="group inline-flex items-center gap-2.5">
      {/* Cool Geometric Vector Icon Badge */}
      <span
        style={{ width: dim, height: dim }}
        className="relative flex shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#0B201A] via-[#0F372E] to-[#08221B] shadow-[0_3px_10px_rgba(15,55,46,0.22),0_1px_2px_rgba(0,0,0,0.12)] ring-1 ring-white/20 transition-all duration-300 group-hover:scale-105 group-hover:shadow-[0_6px_18px_rgba(15,55,46,0.32)] group-hover:ring-[#10B981]/50"
      >
        {/* Ambient inner rim reflection */}
        <span className="pointer-events-none absolute inset-[1px] rounded-[11px] bg-gradient-to-b from-white/15 to-transparent opacity-80" />

        <svg
          style={{ width: iconSize, height: iconSize }}
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="relative z-10 transition-transform duration-300 group-hover:scale-105"
        >
          {/* Radar Wave Arcs (Monitoring/Watch) */}
          <path
            d="M14.5 4.5C17.5 5.5 19.5 8.5 19.5 12"
            stroke="#10B981"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeDasharray="2.5 2.5"
            opacity="0.6"
          />
          <path
            d="M13 7.5C15 8.2 16.5 10 16.5 12"
            stroke="#34D399"
            strokeWidth="1.6"
            strokeLinecap="round"
            opacity="0.85"
          />

          {/* Active Live Radar Beacon Dot */}
          <circle cx="17.5" cy="6.5" r="1.5" fill="#10B981" />
          <circle
            cx="17.5"
            cy="6.5"
            r="1.5"
            fill="#34D399"
            className="animate-ping opacity-75"
            style={{ transformOrigin: "17.5px 6.5px" }}
          />

          {/* Origami Delivery Glider / Mail Wing (Deliver) */}
          <path
            d="M3.5 10.5L12 15L20.5 10.5L12 6L3.5 10.5Z"
            fill="url(#dw-fold-top)"
            stroke="#A7F3D0"
            strokeWidth="1.3"
            strokeLinejoin="round"
          />
          <path
            d="M3.5 10.5L12 15V20.5L3.5 16V10.5Z"
            fill="url(#dw-fold-left)"
            stroke="#6EE7B7"
            strokeWidth="1.2"
            strokeLinejoin="round"
          />
          <path
            d="M20.5 10.5L12 15V20.5L20.5 16V10.5Z"
            fill="url(#dw-fold-right)"
            stroke="#34D399"
            strokeWidth="1.2"
            strokeLinejoin="round"
          />

          <defs>
            <linearGradient id="dw-fold-top" x1="3.5" y1="6" x2="20.5" y2="15" gradientUnits="userSpaceOnUse">
              <stop stopColor="#FFFFFF" stopOpacity="0.95" />
              <stop offset="1" stopColor="#E2FBEF" stopOpacity="0.85" />
            </linearGradient>
            <linearGradient id="dw-fold-left" x1="3.5" y1="10.5" x2="12" y2="20.5" gradientUnits="userSpaceOnUse">
              <stop stopColor="#10B981" stopOpacity="0.75" />
              <stop offset="1" stopColor="#059669" stopOpacity="0.9" />
            </linearGradient>
            <linearGradient id="dw-fold-right" x1="12" y1="10.5" x2="20.5" y2="20.5" gradientUnits="userSpaceOnUse">
              <stop stopColor="#34D399" stopOpacity="0.85" />
              <stop offset="1" stopColor="#10B981" stopOpacity="0.95" />
            </linearGradient>
          </defs>
        </svg>
      </span>

      {!compact && (
        <span className="font-apple text-[17px] font-bold tracking-tight text-[#0B1311]">
          Delivery<span className="text-[#0F372E]">Watch</span>
        </span>
      )}
    </Link>
  );
}

