import type { ThemeResultSummary } from "@/src/lib/saq/engine/results";

interface ReportThemeCardProps {
  themeTitle: string;
  summary: ThemeResultSummary;
  className?: string;
}

function computeThemeReadiness(summary: ThemeResultSummary): {
  score: number;
  level: "Early" | "Developing" | "Advanced";
} {
  const completion = summary.completionRate; // 0–100
  const totalPriority =
    summary.highPriorityCount + summary.mediumPriorityCount + summary.lowPriorityCount || 1;
  const highShare = summary.highPriorityCount / totalPriority; // 0–1

  const scoreRaw = 0.7 * completion + 0.3 * (100 - highShare * 100);
  const score = Math.max(0, Math.min(100, Math.round(scoreRaw)));

  let level: "Early" | "Developing" | "Advanced";
  if (score < 40) level = "Early";
  else if (score < 70) level = "Developing";
  else level = "Advanced";

  return { score, level };
}

export function ReportThemeCard({
  themeTitle,
  summary,
  className = "",
}: ReportThemeCardProps) {
  const completionPct = Math.round(summary.completionRate);
  const readiness = computeThemeReadiness(summary);
  const readinessChip =
    readiness.level === "Early"
      ? "border-rose-200 bg-rose-50 text-rose-800"
      : readiness.level === "Developing"
      ? "border-amber-200 bg-amber-50 text-amber-800"
      : "border-emerald-200 bg-emerald-50 text-emerald-800";
  const readinessBar =
    readiness.level === "Early"
      ? "bg-rose-400"
      : readiness.level === "Developing"
      ? "bg-amber-400"
      : "bg-emerald-500";

  return (
    <div
      className={`saq-theme-card saq-export-break-after rounded border border-slate-200 bg-white p-4 print:p-3 print:text-sm ${className}`}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <h3 className="font-semibold text-slate-900 print:text-xs">
          {themeTitle}
        </h3>
        <div className="flex items-center gap-2">
          <span className="tabular-nums text-xs text-slate-600 print:text-[10px]">
            {readiness.score}%
          </span>
          <span
            className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide print:text-[10px] ${readinessChip}`}
            title="Theme readiness (derived from completion and priority balance)"
          >
            {readiness.level}
          </span>
        </div>
      </div>

      <div className="mt-2 h-2.5 w-full overflow-hidden rounded-full bg-slate-200">
        <div
          className={`h-full rounded-full ${readinessBar}`}
          style={{ width: `${readiness.score}%` }}
        />
      </div>
      <div className="saq-theme-metrics mt-3 grid grid-cols-2 gap-x-4 gap-y-3 text-sm print:mt-2 print:text-xs sm:grid-cols-4">
        <div className="flex flex-col gap-0.5">
          <span className="text-xs font-medium uppercase tracking-wide text-slate-500">Completion</span>
          <span className="font-bold tabular-nums text-slate-900">{completionPct}%</span>
        </div>
        <div className="flex flex-col gap-0.5">
          <span className="text-xs font-medium uppercase tracking-wide text-slate-500">Targets met</span>
          <span className="font-bold tabular-nums text-slate-900">{summary.targetMetCount}</span>
        </div>
        <div className="flex flex-col gap-0.5">
          <span className="text-xs font-medium uppercase tracking-wide text-slate-500">Pass L1 / L2 / L3</span>
          <span className="font-bold tabular-nums text-slate-900">
            {summary.passLevel1Count} / {summary.passLevel2Count} / {summary.passLevel3Count}
          </span>
        </div>
        <div className="flex flex-col gap-0.5">
          <span className="text-xs font-medium uppercase tracking-wide text-slate-500">Priorities H / M / L</span>
          <span className="font-bold tabular-nums text-slate-900">
            {summary.highPriorityCount} / {summary.mediumPriorityCount} / {summary.lowPriorityCount}
          </span>
        </div>
      </div>
    </div>
  );
}
