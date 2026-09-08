export default function DashboardLoading() {
  return (
    <div className="space-y-6">
      <div className="h-8 w-56 rounded-xl bg-slate-100 animate-pulse border border-slate-200/80" />
      <div className="grid gap-4 sm:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-28 rounded-2xl border border-slate-200/80 bg-slate-50/80 animate-pulse" />
        ))}
      </div>
      <div className="h-24 rounded-2xl border border-slate-200/80 bg-slate-50/80 animate-pulse" />
      <div className="h-24 rounded-2xl border border-slate-200/80 bg-slate-50/80 animate-pulse" />
      <div className="h-24 rounded-2xl border border-slate-200/80 bg-slate-50/80 animate-pulse" />
    </div>
  );
}

