import type { AssessmentInterpretation } from "@/src/lib/saq/engine/interpretation";
import type { AssessmentResultsSummary } from "@/src/lib/saq/engine/results";

interface ReadinessHeroCardProps {
  interpretation: AssessmentInterpretation;
  summary: AssessmentResultsSummary;
}

export function ReadinessHeroCard({ interpretation, summary }: ReadinessHeroCardProps) {
  const completion = Math.round(summary.completionRate);

  const badgeClasses =
    interpretation.readinessLevel === "Early"
      ? "bg-rose-100 text-rose-900"
      : interpretation.readinessLevel === "Developing"
        ? "bg-amber-100 text-amber-900"
        : "bg-emerald-100 text-emerald-900";

  /** Same surface as other dashboard cards: solid white; left bar only for readiness (no gradients). */
  const leftAccent =
    interpretation.readinessLevel === "Early"
      ? "border-l-rose-500"
      : interpretation.readinessLevel === "Developing"
        ? "border-l-amber-500"
        : "border-l-emerald-600";

  return (
    <div
      className={`saq-readiness-hero saq-export-break-after rounded-xl border border-slate-200 border-l-4 bg-white px-6 py-5 shadow-sm sm:px-7 ${leftAccent}`}
    >
      <div className="saq-readiness-hero-inner flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="max-w-xl">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
            Overall readiness
          </h3>
          <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:gap-3">
            <span
              className={
                "inline-flex w-fit items-center rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide " +
                badgeClasses
              }
            >
              {interpretation.readinessLevel} readiness
            </span>
            <span className="text-xs leading-snug text-slate-600">
              Based on completion, targets, and improvement priorities.
            </span>
          </div>
          <p className="mt-3 text-sm leading-relaxed text-slate-700">
            {interpretation.summary}
          </p>
        </div>
        <dl className="saq-readiness-stats grid grid-cols-2 gap-3 text-sm sm:w-64">
          <div className="saq-hero-stat rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5">
            <dt className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-slate-500">
              <span className="text-emerald-600" aria-hidden>
                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>
              </span>
              Completion
            </dt>
            <dd className="mt-0.5 text-lg font-bold tabular-nums text-slate-900">
              {completion}%
            </dd>
          </div>
          <div className="saq-hero-stat rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5">
            <dt className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-slate-500">
              <span className="text-slate-600" aria-hidden>
                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="6" /><circle cx="12" cy="12" r="2" /></svg>
              </span>
              Targets met
            </dt>
            <dd className="mt-0.5 text-lg font-bold tabular-nums text-slate-900">
              {summary.targetMetCount}
            </dd>
          </div>
          <div className="saq-hero-stat rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5">
            <dt className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-slate-500">
              <span className="text-rose-600" aria-hidden>
                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>
              </span>
              High-priority gaps
            </dt>
            <dd className="mt-0.5 text-lg font-bold tabular-nums text-slate-900">
              {summary.highPriorityCount}
            </dd>
          </div>
          <div className="saq-hero-stat rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5">
            <dt className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-slate-500">
              <span className="text-slate-600" aria-hidden>
                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" /><line x1="8" y1="18" x2="21" y2="18" /><line x1="3" y1="6" x2="3.01" y2="6" /><line x1="3" y1="12" x2="3.01" y2="12" /><line x1="3" y1="18" x2="3.01" y2="18" /></svg>
              </span>
              Total questions
            </dt>
            <dd className="mt-0.5 text-lg font-bold tabular-nums text-slate-900">
              {summary.totalQuestions}
            </dd>
          </div>
        </dl>
      </div>
    </div>
  );
}

