export function MethodologyNote() {
  return (
    <div className="saq-export-break-after mt-4 rounded border border-slate-200 bg-slate-50/50 px-4 py-3 text-sm text-slate-700 print:mt-3 print:py-2 print:text-xs">
      <h3 className="font-semibold text-slate-900">Assessment methodology</h3>
      <ul className="mt-2 list-inside list-disc space-y-1 leading-relaxed">
        <li>
          This report reflects a <strong>readiness baseline</strong>, not a certification decision.
        </li>
        <li>
          Questions are assessed using <strong>capability levels 1–3</strong> (foundational to advanced).
        </li>
        <li>
          Priorities are derived from impact magnitude, likelihood, and target/readiness gaps.
        </li>
        <li>
          <strong>Importance</strong> (High / Medium / Low) is how significant the gap is.
        </li>
        <li>
          <strong>Effort</strong> (S / M / L) is the size of the work. It is chosen on the action plan.
        </li>
        <li>
          <strong>When to act</strong> (Immediate / Urgent / Planned) is calculated from importance, effort, and the gap to target.
        </li>
        <li>
          The opening recommendations (Immediate / Short term / Medium term / Consolidate) are overall advice for the organisation. They are separate from each action’s when-to-act label.
        </li>
        <li>
          The action plan is intended to guide <strong>sequencing and improvement planning</strong>.
        </li>
      </ul>
    </div>
  );
}
