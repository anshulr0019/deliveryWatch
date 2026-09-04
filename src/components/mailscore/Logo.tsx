import Link from "next/link";

export function Logo({ href = "/", compact = false }: { href?: string; compact?: boolean }) {
  return (
    <Link href={href} className="group inline-flex items-center gap-2.5">
      <span className="relative flex h-8 w-8 items-center justify-center rounded-lg border border-gold/40 bg-gradient-to-br from-gold-light/20 via-gold/10 to-transparent">
        <svg viewBox="0 0 24 24" className="h-4.5 w-4.5" fill="none" aria-hidden>
          <path d="M12 3 4.5 6v5c0 4.6 3.2 8.6 7.5 10 4.3-1.4 7.5-5.4 7.5-10V6L12 3Z" stroke="url(#dw-g)" strokeWidth="1.5" strokeLinejoin="round" />
          <path d="M8.5 12.2 11 14.6l4.6-5" stroke="#E8D2A2" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          <defs>
            <linearGradient id="dw-g" x1="4" y1="3" x2="20" y2="21">
              <stop stopColor="#E8D2A2" />
              <stop offset="1" stopColor="#967840" />
            </linearGradient>
          </defs>
        </svg>
        <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-gold shadow-[0_0_8px_#C8A96E]" />
      </span>
      {!compact && (
        <span className="font-display text-lg font-semibold tracking-tight text-white">
          Deliver<span className="text-gold-gradient">Watch</span>
        </span>
      )}
    </Link>
  );
}
