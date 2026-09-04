import Link from "next/link";

export function Logo({ href = "/", compact = false }: { href?: string; compact?: boolean }) {
  return (
    <Link href={href} className="group inline-flex items-center gap-2.5">
      <span className="relative flex h-8 w-8 items-center justify-center rounded-lg border border-[#0F372E]/20 bg-gradient-to-br from-[#ECFDF5] via-[#D1FAE5] to-[#A7F3D0] shadow-sm">
        <svg viewBox="0 0 24 24" className="h-4.5 w-4.5" fill="none" aria-hidden>
          <path d="M12 3 4.5 6v5c0 4.6 3.2 8.6 7.5 10 4.3-1.4 7.5-5.4 7.5-10V6L12 3Z" stroke="url(#dw-g)" strokeWidth="1.6" strokeLinejoin="round" />
          <path d="M8.5 12.2 11 14.6l4.6-5" stroke="#0F372E" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          <defs>
            <linearGradient id="dw-g" x1="4" y1="3" x2="20" y2="21">
              <stop stopColor="#0F372E" />
              <stop offset="1" stopColor="#10B981" />
            </linearGradient>
          </defs>
        </svg>
        <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-[#10B981] ring-2 ring-white" />
      </span>
      {!compact && (
        <span className="font-display text-lg font-bold tracking-tight text-[#0B1311]">
          Deliver<span className="text-[#0F372E]">Watch</span>
        </span>
      )}
    </Link>
  );
}
