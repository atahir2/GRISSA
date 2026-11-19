/** Shown when printing from the browser only; on screen the same copy appears in ReportInfoBanner. */
export function ReportPurposeNote() {
  return (
    <div className="saq-export-break-after mt-4 hidden rounded border border-slate-200 bg-slate-50/60 px-4 py-3 text-sm text-slate-700 print:mt-3 print:block print:py-2 print:text-xs">
      <p className="font-medium text-slate-900">Report purpose</p>
      <p className="mt-1 leading-relaxed">
        This report is intended for <strong>internal use</strong> to support sustainability baseline review,
        stakeholder discussion, and improvement prioritisation. It can help prepare for standards alignment
        and certification-readiness planning.
      </p>
      <p className="mt-2 leading-relaxed font-medium text-slate-800">
        This report represents a sustainability readiness baseline and does not constitute a certification outcome.
      </p>
    </div>
  );
}

