import type {
  CapabilityScore,
  CommonEvidenceItem,
  Question,
  StandardClauseRef,
} from "@/src/lib/saq/questionnaire.types";
import { formatStandardClauseLabel } from "@/src/lib/saq/standards.repository";

const LEVELS: CapabilityScore[] = [1, 2, 3];

function clauseLabels(clauses?: StandardClauseRef[]): string[] {
  return (clauses ?? [])
    .map((item) => formatStandardClauseLabel(item.standardId, item.clause))
    .filter((label): label is string => Boolean(label));
}

function evidenceForLevel(
  items: CommonEvidenceItem[] | undefined,
  score: CapabilityScore,
): CommonEvidenceItem[] {
  return (items ?? []).filter(
    (item) => item.supportsLevel === score && item.text.trim().length > 0,
  );
}

export function QuestionHelp({
  question,
  selectedScore,
}: {
  question: Pick<
    Question,
    "whyItMatters" | "evidenceExpected" | "commonEvidence" | "standardClauses" | "answerOptions"
  >;
  selectedScore?: CapabilityScore;
}) {
  const why = question.whyItMatters?.trim();
  const evidenceExpected = question.evidenceExpected?.trim();
  const related = clauseLabels(question.standardClauses);
  const levels = LEVELS.flatMap((score) => {
    const option = question.answerOptions.find((item) => item.score === score);
    const description = option?.description?.trim();
    const practice = option?.levelInPractice?.trim();
    const evidence = evidenceForLevel(question.commonEvidence, score);
    if (!description && !practice && evidence.length === 0) return [];
    return [{ score, description, practice, evidence }];
  });

  if (!why && !evidenceExpected && related.length === 0 && levels.length === 0) {
    return null;
  }

  return (
    <details className="mt-2 rounded-md border border-slate-200 border-l-2 border-l-emerald-600 bg-slate-50 px-3 py-2 text-xs text-slate-700">
      <summary className="cursor-pointer font-medium text-slate-800">Help</summary>
      <div className="mt-2 space-y-3 leading-relaxed">
        {why ? (
          <p>
            <span className="font-medium text-slate-800">Why this matters. </span>
            {why}
          </p>
        ) : null}
        {levels.length > 0 ? (
          <ul className="space-y-2">
            {levels.map((level) => {
              const selected = selectedScore === level.score;
              return (
                <li
                  key={level.score}
                  className={selected ? "rounded-md bg-emerald-50 px-2 py-1.5" : undefined}
                >
                  <p>
                    <span className="font-medium text-slate-800">
                      Level {level.score}
                      {selected ? " · Selected" : ""}.
                    </span>{" "}
                    {level.description}
                  </p>
                  {level.practice ? (
                    <p className="mt-1 text-slate-600">
                      <span className="font-medium text-slate-800">In practice. </span>
                      {level.practice}
                    </p>
                  ) : null}
                  {level.evidence.length > 0 ? (
                    <ol className="mt-1 list-decimal space-y-0.5 pl-4 text-slate-600">
                      {level.evidence.map((item) => (
                        <li key={item.text}>{item.text}</li>
                      ))}
                    </ol>
                  ) : null}
                </li>
              );
            })}
          </ul>
        ) : null}
        {evidenceExpected ? (
          <p>
            <span className="font-medium text-slate-800">Evidence expected. </span>
            {evidenceExpected}
          </p>
        ) : null}
        {related.length > 0 ? (
          <p>
            <span className="font-medium text-slate-800">Related requirements. </span>
            {related.join(" · ")}
          </p>
        ) : null}
      </div>
    </details>
  );
}
