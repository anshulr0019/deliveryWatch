export default function DashboardLoading() {
  return (
    <div className="space-y-6">
      <div className="h-8 w-56 rounded-lg shimmer" />
      <div className="grid gap-4 sm:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-28 rounded-2xl border border-white/[0.06] shimmer" />
        ))}
      </div>
      <div className="h-24 rounded-2xl border border-white/[0.06] shimmer" />
      <div className="h-24 rounded-2xl border border-white/[0.06] shimmer" />
      <div className="h-24 rounded-2xl border border-white/[0.06] shimmer" />
    </div>
  );
}
