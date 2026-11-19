import type { ThemeResultSummary } from "@/src/lib/saq/engine/results";
import { MetricBar } from "./MetricBar";

interface ThemePerformanceCardProps {
  themeTitle: string;
  summary: ThemeResultSummary;
  className?: string;
}

export function ThemePerformanceCard({
  themeTitle,
  summary,
  className = "",
}: ThemePerformanceCardProps) {
  const totalQuestions = summary.totalQuestions || 1;

  return (
    <div
      className={`rounded-xl border border-slate-200 bg-white p-5 shadow-sm ${className}`}
    >
      <h3 className="text-base font-semibold text-slate-900">{themeTitle}</h3>
      <div className="mt-4 space-y-4">
        <MetricBar
          label="Completion"
          value={summary.answeredQuestions}
          max={totalQuestions}
          variant="emerald"
        />
        <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
          <div>
            <span className="text-slate-500">Targets met</span>
            <p className="font-semibold text-slate-900">
              {summary.targetMetCount}
            </p>
          </div>
          <div>
            <span className="text-slate-500">Pass L1 / L2 / L3</span>
            <p className="font-semibold text-slate-900">
              {summary.passLevel1Count} / {summary.passLevel2Count} /{" "}
              {summary.passLevel3Count}
            </p>
          </div>
          <div>
            <span className="text-slate-500">Priorities</span>
            <p className="font-semibold text-slate-900">
              H:{summary.highPriorityCount} M:{summary.mediumPriorityCount} L:
              {summary.lowPriorityCount}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
