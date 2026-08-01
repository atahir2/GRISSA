interface TargetCapabilitySelectProps {
  scopeId: string;
  inScope: boolean;
  value: 1 | 2 | 3 | undefined;
  onChange: (value: 1 | 2 | 3 | undefined) => void;
  readOnly?: boolean;
}

const CAPABILITY_DESCRIPTIONS: Record<1 | 2 | 3, string> = {
  1: "Awareness is minimal, and practices are largely unstructured.",
  2: "Some measures exist, but they are inconsistent or not formalised.",
  3: "The RI is confident that the topic is systematically addressed with well-defined practices.",
};

export function TargetCapabilitySelect({
  scopeId,
  inScope,
  value,
  onChange,
  readOnly = false,
}: TargetCapabilitySelectProps) {
  if (!inScope) {
    return (
      <p className="text-xs text-slate-500">
        Set this topic to in scope to choose a target level.
      </p>
    );
  }

  const selectId = `target-capability-${scopeId}`;
  const helperId = `${selectId}-helper`;

  return (
    <div className="w-full sm:w-[17rem]">
      <label htmlFor={selectId} className="block text-xs font-medium text-slate-600">
        Target capability
      </label>
      <select
        id={selectId}
        disabled={readOnly}
        aria-describedby={helperId}
        value={value ?? ""}
        onChange={(e) => {
          const next = e.target.value;
          if (next === "1" || next === "2" || next === "3") {
            onChange(Number(next) as 1 | 2 | 3);
            return;
          }
          onChange(undefined);
        }}
        className="mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500"
      >
        <option value="">No target selected</option>
        <option value="1">Level 1: Initial / Ad hoc</option>
        <option value="2">Level 2: Developing / Partial</option>
        <option value="3">Level 3: Established / Assured</option>
      </select>

      <div
        id={helperId}
        className={`mt-2 rounded-md border px-2.5 py-2 text-xs ${
          value
            ? "border-slate-200 bg-slate-50 text-slate-700"
            : "border-transparent bg-transparent px-0 py-0 text-slate-500"
        }`}
      >
        {value ? (
          <p>
            <span className="font-medium">
              Level {value}:{" "}
              {value === 1
                ? "Initial / Ad hoc"
                : value === 2
                  ? "Developing / Partial"
                  : "Established / Assured"}
            </span>{" "}
            {CAPABILITY_DESCRIPTIONS[value]}
          </p>
        ) : (
          <p>Choose a target capability level for this topic.</p>
        )}
      </div>
    </div>
  );
}
