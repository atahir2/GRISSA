import type {
  Theme,
  ScopeItem,
  Question,
} from "@/src/lib/saq/questionnaire.types";
import type {
  ScopeSelection,
  AssessmentAnswer,
} from "@/src/lib/saq/engine/results";
import type { CapabilityScore } from "@/src/lib/saq/engine/scoring";
import { SectionHeader } from "./SectionHeader";
import { CapabilitySelector } from "./CapabilitySelector";
import { SummaryCard } from "./SummaryCard";

interface QuestionnaireStepProps {
  themes: Theme[];
  scopeItems: ScopeItem[];
  questions: Question[];
  scopeSelections: ScopeSelection[];
  answers: AssessmentAnswer[];
  onChange: (answers: AssessmentAnswer[]) => void;
  readOnly?: boolean;
}

export function QuestionnaireStep({
  themes,
  scopeItems,
  questions,
  scopeSelections,
  answers,
  onChange,
  readOnly = false,
}: QuestionnaireStepProps) {
  const inScopeScopeIds = new Set(
    scopeSelections.filter((s) => s.inScope).map((s) => s.scopeId)
  );

  const inScopeQuestions = questions.filter((q) =>
    inScopeScopeIds.has(q.scopeId)
  );

  const answeredCount = inScopeQuestions.filter((q) =>
    answers.some((a) => a.questionId === q.id && a.selectedScore !== undefined)
  ).length;

  const totalInScope = inScopeQuestions.length;
  const completionRate =
    totalInScope === 0 ? 0 : Math.round((answeredCount / totalInScope) * 100);

  const getAnswer = (questionId: string): AssessmentAnswer | undefined =>
    answers.find((a) => a.questionId === questionId);

  const upsertAnswer = (questionId: string, score: CapabilityScore | undefined) => {
    if (readOnly) return;
    if (score === undefined) {
      onChange(answers.filter((a) => a.questionId !== questionId));
      return;
    }
    const existing = getAnswer(questionId);
    const base: AssessmentAnswer =
      existing ?? {
        assessmentId: "local-assessment",
        questionId,
      };
    const next = answers.filter((a) => a.questionId !== questionId);
    next.push({ ...base, selectedScore: score });
    onChange(next);
  };

  const getThemeAnsweredCount = (themeId: string) => {
    const themeScopeIds = new Set(
      scopeItems
        .filter((s) => s.themeId === themeId && inScopeScopeIds.has(s.id))
        .map((s) => s.id)
    );
    const themeQuestions = inScopeQuestions.filter((q) =>
      themeScopeIds.has(q.scopeId)
    );
    return themeQuestions.filter((q) =>
      answers.some((a) => a.questionId === q.id && a.selectedScore !== undefined)
    ).length;
  };

  const getThemeTotal = (themeId: string) => {
    const themeScopeIds = new Set(
      scopeItems
        .filter((s) => s.themeId === themeId && inScopeScopeIds.has(s.id))
        .map((s) => s.id)
    );
    return inScopeQuestions.filter((q) => themeScopeIds.has(q.scopeId)).length;
  };

  if (totalInScope === 0) {
    return (
      <div className="space-y-6">
        <SectionHeader
          title="Questionnaire"
          subtitle="Answer each question with a capability level from 1 to 3."
        />
        <div className="rounded-lg border border-slate-200 bg-amber-50 p-4 text-sm text-amber-800">
          No scope items are in scope. Go back to <strong>Scope & Goals</strong> and mark at least one topic area as in scope.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {readOnly && (
        <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
          You have <strong>view-only</strong> access. Answers are shown for review but cannot be changed.
        </div>
      )}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <SectionHeader
          title="Questionnaire"
          subtitle="Answer each in-scope question with the current capability level (1–3). 
          Level 1 = initial; 2 = developing; 3 = established."
        />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <SummaryCard
            label="Questions"
            value={`${answeredCount} / ${totalInScope}`}
          />
          <SummaryCard
            label="Completion"
            value={`${completionRate}%`}
            accent="primary"
          />
        </div>
      </div>

      <div className="space-y-6">
        {themes.map((theme) => {
          const themeScopes = scopeItems.filter(
            (s) => s.themeId === theme.id && inScopeScopeIds.has(s.id)
          );
          if (themeScopes.length === 0) return null;
          const themeTotal = getThemeTotal(theme.id);
          const themeAnswered = getThemeAnsweredCount(theme.id);
          const themePct =
            themeTotal === 0 ? 0 : Math.round((themeAnswered / themeTotal) * 100);
          return (
            <section
              key={theme.id}
              className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm"
            >
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 bg-slate-50 px-4 py-3">
                <h3 className="text-base font-semibold text-slate-900">
                  {theme.title}
                </h3>
                <span className="text-xs font-medium text-slate-600">
                  {themeAnswered} / {themeTotal} answered ({themePct}%)
                </span>
              </div>
              <div className="divide-y divide-slate-100">
                {themeScopes.map((scope) => {
                  const scopeQuestions = inScopeQuestions.filter(
                    (q) => q.scopeId === scope.id
                  );
                  if (scopeQuestions.length === 0) return null;
                  return (
                    <div key={scope.id} className="p-4">
                      <div className="mb-3 flex items-center gap-2">
                        <span className="rounded bg-slate-200 px-2 py-0.5 text-xs font-medium text-slate-700">
                          {scope.code}
                        </span>
                        <span className="text-sm font-medium text-slate-800">
                          {scope.label}
                        </span>
                      </div>
                      <ul className="space-y-4">
                        {scopeQuestions.map((q) => {
                          const ans = getAnswer(q.id);
                          return (
                            <li
                              key={q.id}
                              className={`rounded-lg border bg-white p-4 ${
                                ans?.selectedScore === undefined
                                  ? "border-amber-200 bg-amber-50/30"
                                  : "border-slate-200"
                              }`}
                            >
                              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center gap-2 text-xs text-slate-500">
                                    <span className="font-medium">{q.code}</span>
                                    {q.lifecyclePhase && (
                                      <span>· {q.lifecyclePhase}</span>
                                    )}
                                    {q.associatedMetric && q.associatedMetric !== "N/A" && (
                                      <span>· {q.associatedMetric}</span>
                                    )}
                                  </div>
                                  <p className="mt-1 text-sm font-medium text-slate-900">
                                    {q.text}
                                  </p>
                                  {q.reference && (
                                    <p className="mt-1 text-xs text-slate-500">
                                      Reference: {q.reference}
                                    </p>
                                  )}
                                </div>
                                <div className="w-full shrink-0 lg:w-80 lg:max-w-md lg:pl-4">
                                  <CapabilitySelector
                                    answerOptions={q.answerOptions}
                                    value={ans?.selectedScore}
                                    onChange={(score) =>
                                      upsertAnswer(q.id, score)
                                    }
                                    showNotAnswered={true}
                                    disabled={readOnly}
                                  />
                                </div>
                              </div>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
