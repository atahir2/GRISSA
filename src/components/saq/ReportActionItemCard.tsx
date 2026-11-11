import type { ActionItem } from "@/src/lib/saq/engine/actions";
import { formatCapabilityGap, formatEffortLabel } from "@/src/lib/saq/engine/scoring";

function effortText(item: ActionItem): string | undefined {
  if (item.effortRequired) return formatEffortLabel(item.effortRequired);
  if (item.suggestedEffort) return formatEffortLabel(item.suggestedEffort, true);
  return undefined;
}

interface ReportActionItemCardProps {
  item: ActionItem;
  themeTitle?: string;
  exportMode?: boolean;
}

function metaPill(label: string, value: string) {
  return (
    <span className="inline-flex items-center gap-1 rounded-md bg-slate-50 px-2 py-1 text-[11px] text-slate-700">
      <span className="font-semibold text-slate-600">{label}</span>
      <span className="text-slate-900">{value}</span>
    </span>
  );
}

function MetaRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-2 text-[13px] leading-relaxed">
      <span className="font-medium text-slate-600 shrink-0">{label}:</span>
      <span className="text-slate-900">{value}</span>
    </div>
  );
}

export function ReportActionItemCard({ item, themeTitle, exportMode = false }: ReportActionItemCardProps) {
  const priorityBorder =
    item.improvementPriority === "High"
      ? "border-l-[6px] border-l-rose-600"
      : item.improvementPriority === "Medium"
      ? "border-l-[6px] border-l-amber-600"
      : "border-l-[6px] border-l-slate-400";

  const hasLowerMeta = item.leader || item.deadline || item.status;

  if (exportMode) {
    const metaParts: string[] = [];
    metaParts.push(`Priority: ${item.improvementPriority}`);
    if (item.implementationPriority) metaParts.push(`When to act: ${item.implementationPriority}`);
    const effort = effortText(item);
    if (effort) metaParts.push(`Effort: ${effort}`);
    metaParts.push(formatCapabilityGap(item.capabilityGap));
    const topMetaLine = metaParts.join(" · ");

    return (
      <article className={`saq-action-item-card saq-export-break-after break-inside-avoid rounded border border-slate-200 bg-white p-4 ${priorityBorder}`}>
        {/* A. Code + theme (one line) */}
        <div className="text-[13px] text-slate-600 leading-relaxed">
          <span className="font-mono font-medium text-slate-700">{item.questionCode}</span>
          {themeTitle && <span className="text-slate-500"> · {themeTitle}</span>}
        </div>

        {/* B. Single top metadata line: Priority · Implementation · Effort */}
        <div className="mt-1.5 text-[13px] leading-relaxed text-slate-700">
          {topMetaLine}
        </div>

        {/* C. Question text */}
        <p className="mt-4 text-[14px] font-semibold leading-relaxed text-slate-900">
          {item.questionText}
        </p>

        {/* D. Recommended action */}
        <p className="mt-3 text-[13px] leading-relaxed text-slate-700">
          <span className="font-semibold text-slate-800">Recommended action:</span>{" "}
          {item.recommendedAction}
        </p>

        {/* E. Lower metadata only: Leader, Deadline, Status (no Implementation/Effort) */}
        {hasLowerMeta && (
          <div className="mt-4 space-y-2.5 border-t border-slate-100 pt-3">
            {item.leader && <MetaRow label="Assignee" value={item.leader} />}
            {item.deadline && <MetaRow label="Deadline" value={item.deadline} />}
            {item.status && <MetaRow label="Status" value={item.status} />}
          </div>
        )}

        {/* F. Remarks only if present */}
        {item.remarks && (
          <div className="mt-4 rounded-md bg-slate-50 px-3 py-2 text-[13px] leading-relaxed text-slate-700">
            <span className="font-semibold text-slate-800">Next step:</span>{" "}
            {item.remarks}
          </div>
        )}
      </article>
    );
  }

  const topMetaParts: string[] = [];
  topMetaParts.push(`Priority: ${item.improvementPriority}`);
  if (item.implementationPriority) topMetaParts.push(`When to act: ${item.implementationPriority}`);
  const screenEffort = effortText(item);
  if (screenEffort) topMetaParts.push(`Effort: ${screenEffort}`);
  topMetaParts.push(formatCapabilityGap(item.capabilityGap));
  const topMetaLineScreen = topMetaParts.join(" · ");
  const hasLowerMetaScreen = item.leader || item.deadline || item.status;

  return (
    <article className={`saq-action-item-card saq-export-break-after break-inside-avoid rounded border border-slate-200 bg-white p-4 print:p-3 ${priorityBorder}`}>
      {/* A. Code + theme */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-mono text-xs text-slate-700">{item.questionCode}</span>
        {themeTitle && <span className="text-xs text-slate-500">· {themeTitle}</span>}
      </div>
      {/* B. Single top metadata line */}
      <p className="mt-1.5 text-xs text-slate-600">{topMetaLineScreen}</p>

      {/* C. Main content */}
      <div className="mt-4">
        <p className="text-sm font-semibold text-slate-900">
          {item.questionText}
        </p>
        <p className="mt-3 text-sm text-slate-700">
          <span className="font-semibold text-slate-800">Recommended action:</span>{" "}
          {item.recommendedAction}
        </p>
      </div>

      {/* D. Lower metadata only: Leader, Deadline, Status */}
      {hasLowerMetaScreen && (
        <div className="mt-4 flex flex-wrap gap-2">
          {item.leader && metaPill("Assignee", item.leader)}
          {item.deadline && metaPill("Deadline", item.deadline)}
          {item.status && metaPill("Status", item.status)}
        </div>
      )}

      {/* D. Remarks (only show if present) */}
      {item.remarks && (
        <div className="mt-4 rounded-md bg-slate-50 px-3 py-2 text-xs text-slate-700">
          <span className="font-semibold text-slate-800">Next step:</span>{" "}
          {item.remarks}
        </div>
      )}
    </article>
  );
}

