/** Context banner on the Report page; same visual language as DashboardInfoBanner (dark SAQ canvas). */
export function ReportInfoBanner() {
  return (
    <div
      className="rounded-xl border border-slate-600 bg-slate-800/80 px-5 py-4 shadow-sm shadow-black/10"
      role="status"
      aria-label="Report context"
    >
      <div className="space-y-2 text-sm leading-relaxed text-slate-200">
        <p>
          This report is intended for internal use to support sustainability baseline review,
          stakeholder discussion, and improvement prioritisation. It can help prepare for
          standards alignment and certification-readiness planning.
        </p>
        <p className="font-medium text-slate-100">
          This report represents a sustainability readiness baseline and does not constitute a
          certification outcome.
        </p>
      </div>
    </div>
  );
}
