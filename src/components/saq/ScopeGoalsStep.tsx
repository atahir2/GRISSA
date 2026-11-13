import type {
  Theme,
  ScopeItem,
} from "@/src/lib/saq/questionnaire.types";
import type { ScopeSelection } from "@/src/lib/saq/engine/results";
import { SectionHeader } from "./SectionHeader";
import { TargetCapabilitySelect } from "./TargetCapabilitySelect";

interface ScopeGoalsStepProps {
  themes: Theme[];
  scopeItems: ScopeItem[];
  scopeSelections: ScopeSelection[];
  onChange: (selections: ScopeSelection[]) => void;
  readOnly?: boolean;
}

export function ScopeGoalsStep({
  themes,
  scopeItems,
  scopeSelections,
  onChange,
  readOnly = false,
}: ScopeGoalsStepProps) {
  const upsertSelection = (
    scopeId: string,
    patch: Partial<ScopeSelection>
  ) => {
    if (readOnly) return;
    const existing = scopeSelections.find((s) => s.scopeId === scopeId);
    const base: ScopeSelection =
      existing ?? {
        assessmentId: "local-assessment",
        scopeId,
        inScope: false,
      };
    const next = scopeSelections.filter((s) => s.scopeId !== scopeId);
    next.push({ ...base, ...patch });
    onChange(next);
  };

  const getSelection = (scopeId: string): ScopeSelection | undefined =>
    scopeSelections.find((s) => s.scopeId === scopeId);

  return (
    <div className="space-y-8">
      {readOnly && (
        <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
          You have <strong>view-only</strong> access to this assessment. You can review scope and goals but cannot change them.
        </div>
      )}
      <SectionHeader
        title="Scope & Goals"
        subtitle="Define which topic areas are in scope for this assessment and set optional target capability levels (1–3) for each."
      />

      <div className="rounded-lg border border-slate-200 bg-slate-50/50 p-4">
        <h3 className="text-sm font-medium text-slate-700">What does this mean?</h3>
        <ul className="mt-2 space-y-1 text-sm text-slate-600">
          <li>
            <strong>In scope:</strong> Topic areas you want to assess. Only in-scope items will appear in the questionnaire and in results.
          </li>
          <li>
            <strong>Target capability:</strong> The capability level (1–3) you aim to reach and check if you are on track. Use the dropdown to set or clear it.
          </li>
        </ul>
      </div>

      <div className="space-y-6">
        {themes.map((theme) => {
          const themeScopes = scopeItems.filter((s) => s.themeId === theme.id);
          if (themeScopes.length === 0) return null;
          return (
            <section
              key={theme.id}
              className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm"
            >
              <div className="border-b border-slate-200 bg-slate-50 px-4 py-3">
                <h3 className="text-base font-semibold text-slate-900">
                  {theme.title}
                </h3>
              </div>
              <ul className="divide-y divide-slate-200">
                {themeScopes.map((scope) => {
                  const sel = getSelection(scope.id);
                  const inScope = sel?.inScope ?? false;
                  const target = sel?.targetCapability;
                  return (
                    <li key={scope.id} className="px-4 py-4">
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="inline-flex rounded bg-slate-200 px-2 py-0.5 text-xs font-medium text-slate-700">
                              {scope.code}
                            </span>
                            <span className="text-sm font-medium text-slate-900">
                              {scope.label}
                            </span>
                          </div>
                        </div>
                        <div className="flex shrink-0 flex-col gap-3 sm:flex-row sm:items-center">
                          <label className={`inline-flex items-center gap-2 ${readOnly ? "cursor-default opacity-80" : "cursor-pointer"}`}>
                            <input
                              type="checkbox"
                              disabled={readOnly}
                              className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 disabled:cursor-not-allowed"
                              checked={inScope}
                              onChange={(e) =>
                                upsertSelection(scope.id, {
                                  inScope: e.target.checked,
                                  targetCapability: e.target.checked ? target : undefined,
                                })
                              }
                            />
                            <span className="text-sm font-medium text-slate-700">
                              In scope
                            </span>
                          </label>
                          <TargetCapabilitySelect
                            scopeId={scope.id}
                            inScope={inScope}
                            value={target}
                            readOnly={readOnly}
                            onChange={(nextTarget) =>
                              upsertSelection(scope.id, {
                                targetCapability: nextTarget,
                              })
                            }
                          />
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </section>
          );
        })}
      </div>
    </div>
  );
}
