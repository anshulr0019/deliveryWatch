"use client";

import Link from "next/link";

export default function DashboardError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="mx-auto max-w-lg rounded-2xl border border-red-400/30 bg-red-400/[0.06] p-8 text-center">
      <div className="eyebrow !text-red-300">Something went wrong</div>
      <h2 className="font-display mt-2 text-xl font-semibold text-white">We couldn&apos;t load this page</h2>
      <p className="mt-2 text-sm text-muted">{error.message || "Unexpected error."}</p>
      <div className="mt-6 flex justify-center gap-3">
        <button type="button" onClick={reset} className="btn-gold">
          Try again
        </button>
        <Link href="/dashboard" className="btn-ghost">
          Back to dashboard
        </Link>
      </div>
    </div>
  );
}
