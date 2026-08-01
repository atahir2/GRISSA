import type {
  AnswerOption,
  CapabilityScore,
} from "@/src/lib/saq/questionnaire.types";

export interface CapabilitySelectorProps {
  value: CapabilityScore | undefined;
  onChange: (score: CapabilityScore | undefined) => void;
  /** Question-specific options from `questionnaire.data.json` (scores 1–3 + descriptions). */
  answerOptions: Pick<AnswerOption, "score" | "description">[];
  /** Show "Not answered" state when value is undefined */
  showNotAnswered?: boolean;
  label?: string;
  className?: string;
  disabled?: boolean;
}

const LEVELS: { score: CapabilityScore; label: string }[] = [
  { score: 1, label: "1" },
  { score: 2, label: "2" },
  { score: 3, label: "3" },
];

function descriptionForScore(
  answerOptions: Pick<AnswerOption, "score" | "description">[],
  score: CapabilityScore,
): string | undefined {
  const opt = answerOptions.find((o) => o.score === score);
  const text = opt?.description?.trim();
  return text && text.length > 0 ? text : undefined;
}

/** Short hint for button `title` (keep compact). */
function previewHint(description: string, maxLen = 100): string {
  const t = description.trim();
  if (t.length <= maxLen) return t;
  return `${t.slice(0, maxLen - 1)}…`;
}

export function CapabilitySelector({
  value,
  onChange,
  answerOptions,
  showNotAnswered = true,
  label = "Current Capability level",
  className = "",
  disabled = false,
}: CapabilitySelectorProps) {
  const selectedDescription =
    value !== undefined ? descriptionForScore(answerOptions, value) : undefined;

  return (
    <div className={`flex w-full flex-col items-end ${className}`}>
      <span className="mb-1.5 block w-full text-right text-xs font-medium text-slate-600">
        {label}
      </span>
      <div className="flex shrink-0 flex-nowrap items-center justify-end gap-2">
        {LEVELS.map(({ score, label: l }) => {
          const isSelected = value === score;
          const levelDesc = descriptionForScore(answerOptions, score);
          return (
            <button
              key={score}
              type="button"
              disabled={disabled}
              title={levelDesc ? previewHint(levelDesc, 140) : `Level ${score}`}
              onClick={() => !disabled && onChange(value === score ? undefined : score)}
              className={`inline-flex min-w-[2.5rem] items-center justify-center rounded-lg border px-3 py-2 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-1 ${
                disabled
                  ? "cursor-not-allowed border-slate-200 bg-slate-100 text-slate-500"
                  : isSelected
                    ? "border-emerald-600 bg-emerald-50 text-emerald-800 ring-1 ring-emerald-600"
                    : "border-slate-300 bg-white text-slate-700 hover:border-slate-400 hover:bg-slate-50"
              }`}
            >
              {l}
            </button>
          );
        })}
        {showNotAnswered && value === undefined && (
          <span className="text-right text-xs italic text-slate-400">Not answered yet</span>
        )}
      </div>
      {value !== undefined && (
        <div className="mt-2 w-full rounded-md border border-slate-200 bg-slate-50 px-2.5 py-2 text-left text-xs text-slate-700">
          <p className="text-slate-700">
            {selectedDescription ?? "No description available for this level."}
          </p>
        </div>
      )}
    </div>
  );
}
