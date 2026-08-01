export function DashboardInfoBanner() {
  return (
    <div
      className="rounded-xl border border-slate-600 bg-slate-800/80 px-5 py-4 shadow-sm shadow-black/10"
      role="status"
      aria-label="Dashboard context"
    >
      <p className="text-sm text-slate-200">
        This dashboard summarises your sustainability assessment status, target achievement,
        and action priorities. Use it to track progress, share high-level results with
        stakeholders, and prepare a baseline for certification, standards alignment, or
        regulatory readiness.
      </p>
    </div>
  );
}
