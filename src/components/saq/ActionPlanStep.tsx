import type { ActionPlan } from "@/src/lib/saq/engine/actions";
import type { EffortRequired } from "@/src/lib/saq/engine/scoring";
import { SectionHeader } from "./SectionHeader";
import { SummaryCard } from "./SummaryCard";
import { PriorityBadge } from "./PriorityBadge";
import { ImplementationPriorityBadge } from "./ImplementationPriorityBadge";

export type ActionMetadataPatch = {
  leader?: string;
  deadline?: string;
  status?: "Planned" | "In Progress" | "Completed";
  remarks?: string;
};

interface ActionPlanStepProps {
  actionPlan: ActionPlan;
  onEffortChange: (questionId: string, effort: EffortRequired) => void;
  onActionMetadataChange?: (questionId: string, patch: ActionMetadataPatch) => void;
  readOnly?: boolean;
}

const EFFORT_OPTIONS: EffortRequired[] = ["Low", "Medium", "High"];
const STATUS_OPTIONS: Array<"Planned" | "In Progress" | "Completed"> = [
  "Planned",
  "In Progress",
  "Completed",
];

export function ActionPlanStep({
  actionPlan,
  onEffortChange,
  onActionMetadataChange,
  readOnly = false,
}: ActionPlanStepProps) {
  const summary = actionPlan.summary;

  return (
    <div className="space-y-8">
      {readOnly && (
        <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
          You have <strong>view-only</strong> access. Action metadata cannot be edited.
        </div>
      )}
      <SectionHeader
        title="Action Plan"
        subtitle="Prioritised actions derived from your answers. Set effort required and optionally assign leader, deadline, status and remarks for each item."
      />

      <section>
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
          Summary
        </h3>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          <SummaryCard
            label="Total items"
            value={summary.totalActionItems}
            accent="primary"
          />
          <SummaryCard
            label="High / Medium / Low"
            value={`${summary.highPriorityCount} / ${summary.mediumPriorityCount} / ${summary.lowPriorityCount}`}
          />
          <SummaryCard
            label="Immediate / Urgent / Planned"
            value={`${summary.immediateCount} / ${summary.urgentCount} / ${summary.plannedCount}`}
          />
          <SummaryCard
            label="Low priority impl."
            value={summary.lowPriorityImplementationCount}
          />
          <SummaryCard
            label="No action needed"
            value={summary.noActionNeededCount}
          />
        </div>
      </section>

      <section className="space-y-4">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
          Action items
        </h3>
        {actionPlan.actionItems.length === 0 ? (
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-6 text-center text-sm text-slate-600">
            No action items. Complete the questionnaire and review results first; items are generated for in-scope questions with improvement priorities.
          </div>
        ) : (
          <ul className="space-y-4">
            {actionPlan.actionItems.map((item) => (
              <li
                key={item.questionId}
                className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm"
              >
                <div className="p-4">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0 flex-1 space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded bg-slate-200 px-2 py-0.5 text-xs font-medium text-slate-700">
                          {item.questionCode}
                        </span>
                        <PriorityBadge level={item.improvementPriority} />
                        <ImplementationPriorityBadge
                          value={item.implementationPriority}
                        />
                      </div>
                      <p className="text-sm font-medium text-slate-900">
                        {item.questionText}
                      </p>
                      <p className="text-sm text-slate-600">
                        <span className="font-medium text-slate-700">
                          Recommended action:
                        </span>{" "}
                        {item.recommendedAction}
                      </p>
                    </div>
                    <div className="flex shrink-0 flex-col gap-2 sm:flex-row sm:items-center lg:flex-col lg:items-stretch">
                      <div>
                        <label className="mb-1 block text-xs font-medium text-slate-600">
                          Effort required
                        </label>
                        <select
                          disabled={readOnly}
                          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:cursor-not-allowed disabled:bg-slate-100 sm:w-auto lg:w-full"
                          value={item.effortRequired ?? ""}
                          onChange={(e) =>
                            onEffortChange(
                              item.questionId,
                              e.target.value as EffortRequired
                            )
                          }
                        >
                          <option value="">Set effort…</option>
                          {EFFORT_OPTIONS.map((opt) => (
                            <option key={opt} value={opt}>
                              {opt}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-slate-500">
                          Impl. priority:
                        </span>
                        <ImplementationPriorityBadge
                          value={item.implementationPriority}
                        />
                      </div>
                    </div>
                  </div>
                  {onActionMetadataChange && (
                    <div className={`border-t border-slate-200 bg-slate-50/50 px-4 py-3 ${readOnly ? "opacity-90" : ""}`}>
                      <p className="mb-3 text-xs font-medium uppercase tracking-wide text-slate-500">
                        Optional: assign and track
                      </p>
                      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                        <div>
                          <label className="mb-0.5 block text-xs font-medium text-slate-600">
                            Leader
                          </label>
                          <input
                            type="text"
                            disabled={readOnly}
                            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 disabled:cursor-not-allowed disabled:bg-slate-100"
                            placeholder="Name or role"
                            value={item.leader ?? ""}
                            onChange={(e) =>
                              onActionMetadataChange(item.questionId, {
                                leader: e.target.value.trim() || undefined,
                              })
                            }
                          />
                        </div>
                        <div>
                          <label className="mb-0.5 block text-xs font-medium text-slate-600">
                            Deadline
                          </label>
                          <input
                            type="date"
                            disabled={readOnly}
                            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 disabled:cursor-not-allowed disabled:bg-slate-100"
                            value={
                              item.deadline
                                ? item.deadline.slice(0, 10)
                                : ""
                            }
                            onChange={(e) =>
                              onActionMetadataChange(item.questionId, {
                                deadline: e.target.value || undefined,
                              })
                            }
                          />
                        </div>
                        <div>
                          <label className="mb-0.5 block text-xs font-medium text-slate-600">
                            Status
                          </label>
                          <select
                            disabled={readOnly}
                            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 disabled:cursor-not-allowed disabled:bg-slate-100"
                            value={item.status ?? ""}
                            onChange={(e) =>
                              onActionMetadataChange(item.questionId, {
                                status: (e.target
                                  .value as ActionMetadataPatch["status"]) || undefined,
                              })
                            }
                          >
                            <option value="">—</option>
                            {STATUS_OPTIONS.map((opt) => (
                              <option key={opt} value={opt}>
                                {opt}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="sm:col-span-2 lg:col-span-1">
                          <label className="mb-0.5 block text-xs font-medium text-slate-600">
                            Remarks
                          </label>
                          <input
                            type="text"
                            disabled={readOnly}
                            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 disabled:cursor-not-allowed disabled:bg-slate-100"
                            placeholder="Notes"
                            value={item.remarks ?? ""}
                            onChange={(e) =>
                              onActionMetadataChange(item.questionId, {
                                remarks: e.target.value.trim() || undefined,
                              })
                            }
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
