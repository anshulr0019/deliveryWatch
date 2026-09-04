import Link from "next/link";

export default function DashboardNotFound() {
  return (
    <div className="mx-auto max-w-lg rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-md">
      <div className="eyebrow text-[#0F372E]">404</div>
      <h2 className="font-display mt-2 text-xl font-bold text-[#0B1311]">Domain not found</h2>
      <p className="mt-2 text-sm text-slate-600">It may have been removed, or it belongs to another account.</p>
      <Link href="/dashboard" className="btn-primary mt-6">
        Back to dashboard
      </Link>
    </div>
  );
}
