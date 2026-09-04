import Link from "next/link";

export default function DashboardNotFound() {
  return (
    <div className="mx-auto max-w-lg rounded-2xl border border-white/[0.08] bg-[#0B0D12] p-10 text-center">
      <div className="eyebrow">404</div>
      <h2 className="font-display mt-2 text-xl font-semibold text-white">Domain not found</h2>
      <p className="mt-2 text-sm text-muted">It may have been removed, or it belongs to another account.</p>
      <Link href="/dashboard" className="btn-gold mt-6">
        Back to dashboard
      </Link>
    </div>
  );
}
