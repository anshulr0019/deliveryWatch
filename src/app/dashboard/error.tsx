"use client";

import Link from "next/link";

export default function DashboardError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="mx-auto max-w-lg rounded-2xl border border-rose-200 bg-rose-50/60 p-8 text-center shadow-md">
      <div className="eyebrow !text-rose-700">Something went wrong</div>
      <h2 className="font-display mt-2 text-xl font-bold text-[#0B1311]">We couldn&apos;t load this page</h2>
      <p className="mt-2 text-sm text-slate-600">{error.message || "Unexpected error."}</p>
      <div className="mt-6 flex justify-center gap-3">
        <button type="button" onClick={reset} className="btn-primary">
          Try again
        </button>
        <Link href="/dashboard" className="btn-secondary">
          Back to dashboard
        </Link>
      </div>
    </div>
  );
}
