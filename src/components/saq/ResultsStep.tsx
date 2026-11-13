import type { AssessmentResults } from "@/src/lib/saq/engine/results";
import { SectionHeader } from "./SectionHeader";
import { SummaryCard } from "./SummaryCard";
import { TopicComparisonPanel } from "./TopicComparisonPanel";

interface ResultsStepProps {
  assessmentResults: AssessmentResults;
}

export function ResultsStep({ assessmentResults }: ResultsStepProps) {
  const summary = assessmentResults.summary;

  if (summary.totalQuestions === 0) {
    return (
      <div className="space-y-6">
        <SectionHeader
          title="Results"
          subtitle="What you aimed for, and the level recorded for each topic."
        />
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
          No in-scope questions. Define scope in step 1 and complete the questionnaire to see results here.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <SectionHeader
        title="Results"
        subtitle="Compare the target you set for each topic with the level recorded in the questionnaire. Topics below target are the starting point for the action plan."
      />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <SummaryCard
          label="Completion"
          value={`${summary.completionRate.toFixed(0)}%`}
          accent="primary"
        />
        <SummaryCard
          label="Questions answered"
          value={`${summary.answeredQuestions} / ${summary.totalQuestions}`}
        />
        <SummaryCard
          label="In-scope areas"
          value={`${summary.inScopeCount} / ${summary.totalScopes}`}
        />
      </div>
      <TopicComparisonPanel assessmentResults={assessmentResults} />
    </div>
  );
}
