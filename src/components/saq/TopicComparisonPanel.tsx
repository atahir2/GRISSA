import type { CapabilityScore } from "@/src/lib/saq/engine/scoring";
import {
  buildTopicComparison,
  type AssessmentResults,
  type TopicGapStatus,
} from "@/src/lib/saq/engine/results";
import { PriorityBadge } from "./PriorityBadge";
import { SummaryCard } from "./SummaryCard";

const LEVEL_LABEL: Record<CapabilityScore, string> = {
  1: "1 Initial",
  2: "2 Developing",
  3: "3 Established",
};

const STATUS_CLASS: Record<TopicGapStatus, string> = {
  Met: "bg-emerald-50 text-emerald-800 ring-emerald-200",
  "Below target": "bg-amber-50 text-amber-900 ring-amber-200",
  "No target": "bg-slate-100 text-slate-700 ring-slate-200",
  "Not answered": "bg-rose-50 text-rose-800 ring-rose-200",
};

function levelText(score: CapabilityScore | undefined): string {
  if (score === undefined) return "—";
  return LEVEL_LABEL[score];
}

interface TopicComparisonPanelProps {
  assessmentResults: AssessmentResults;
  compact?: boolean;
}

export function TopicComparisonPanel({
  assessmentResults,
  compact = false,
}: TopicComparisonPanelProps) {
  const comparison = buildTopicComparison(assessmentResults);
  if (comparison.summary.inScopeTopics === 0) return null;

  return (
    <section className="space-y-4">
      <div>
        <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
          Target and current level
        </h3>
        <p className="mt-1 text-sm text-slate-600">
          Each topic shows the level you aimed for and the level recorded in the questionnaire.
          Topics below target are the ones the action plan turns into work.
        </p>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <SummaryCard label="Topics in scope" value={comparison.summary.inScopeTopics} />
        <SummaryCard label="Targets met" value={comparison.summary.met} accent="primary" />
        <SummaryCard label="Below target" value={comparison.summary.belowTarget} />
        <SummaryCard label="No target or unanswered" value={comparison.summary.noTarget + comparison.summary.notAnswered} />
      </div>
      {comparison.groups.map((group) => (
        <div key={group.themeId} className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 bg-slate-50 px-4 py-3">
            <h4 className="text-base font-semibold text-slate-900">{group.themeTitle}</h4>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-2 font-medium">Topic</th>
                  <th className="px-4 py-2 font-medium">Target</th>
                  <th className="px-4 py-2 font-medium">Current</th>
                  <th className="px-4 py-2 font-medium">Gap</th>
                  {!compact && <th className="px-4 py-2 font-medium">Gap priority</th>}
                </tr>
              </thead>
              <tbody>
                {group.topics.map((topic) => (
                  <tr key={topic.scopeId} className="border-t border-slate-100">
                    <td className="px-4 py-3 align-top">
                      <p className="font-medium text-slate-900">
                        {topic.scopeCode}: {topic.scopeLabel.replace(/^[^:]+:\s*/, "")}
                      </p>
                      {topic.questions.length > 1 && (
                        <p className="mt-1 text-xs text-slate-500">
                          {topic.questions
                            .map((question) =>
                              `${question.questionCode} ${question.selectedScore ?? "—"}`
                            )
                            .join(" · ")}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3 align-top text-slate-700">{levelText(topic.targetCapability)}</td>
                    <td className="px-4 py-3 align-top text-slate-700">{levelText(topic.currentScore)}</td>
                    <td className="px-4 py-3 align-top">
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ring-1 ${STATUS_CLASS[topic.status]}`}>
                        {topic.status}
                        {topic.gap !== undefined && topic.gap > 0 ? ` (${topic.gap})` : ""}
                      </span>
                    </td>
                    {!compact && (
                      <td className="px-4 py-3 align-top">
                        {topic.gapPriority ? <PriorityBadge level={topic.gapPriority} /> : <span className="text-slate-400">—</span>}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </section>
  );
}
