import { GrissaPageTitleStrip } from "./GrissaPageHeader";

export const GRISSA_REPORT_PAGE_DESCRIPTION =
  "Prepared for sustainability baseline review and stakeholder discussion.";

interface ReportMetaListProps {
  organisationName: string;
  assessmentId: string;
  createdAt: Date | null;
  updatedAt: Date | null;
  className?: string;
}

/** Shared Organisation / Assessment ID / Created / Updated block (PDF, print-from-browser, standalone header). */
export function ReportMetaList({
  organisationName,
  assessmentId,
  createdAt,
  updatedAt,
  className = "",
}: ReportMetaListProps) {
  const formatDate = (d: Date) =>
    d.toLocaleDateString(undefined, { dateStyle: "medium" });

  return (
    <dl
      className={`report-meta-list grid grid-cols-1 gap-x-4 gap-y-1 text-sm print:text-xs sm:grid-cols-2 ${className}`}
    >
      <div>
        <dt className="inline font-medium text-slate-700">Organisation:</dt>
        <dd className="inline text-slate-900"> {organisationName}</dd>
      </div>
      <div>
        <dt className="inline font-medium text-slate-700">Assessment ID:</dt>
        <dd className="inline font-mono text-slate-700"> {assessmentId}</dd>
      </div>
      <div>
        <dt className="inline font-medium text-slate-700">Created: </dt>
        <dd className="inline text-slate-900">
          {createdAt ? formatDate(createdAt) : "—"}
        </dd>
      </div>
      <div>
        <dt className="inline font-medium text-slate-700">Updated: </dt>
        <dd className="inline text-slate-900">
          {updatedAt ? formatDate(updatedAt) : "—"}
        </dd>
      </div>
    </dl>
  );
}

interface ReportHeaderProps {
  organisationName: string;
  assessmentId: string;
  createdAt: Date | null;
  updatedAt: Date | null;
  /** Used by parent to toggle export layout; styling is driven by .saq-export-mode on container */
  exportMode?: boolean;
  /** Hide title/description strip (shown above the report frame on screen). */
  hideTitleStrip?: boolean;
  /** Omit meta block (shown in page toolbar on screen); still use for PDF / full header. */
  hideMetaList?: boolean;
}

export function ReportHeader({
  organisationName,
  assessmentId,
  createdAt,
  updatedAt,
  hideTitleStrip = false,
  hideMetaList = false,
}: ReportHeaderProps) {
  return (
    <header className="report-header border-b border-slate-300 pb-6 print:pb-4">
      {!hideTitleStrip && (
        <GrissaPageTitleStrip
          descriptionTone="onLight"
          className="report-title-block [&_h1]:print:text-xl [&_p]:print:text-xs [&_span]:print:bg-none [&_span]:print:bg-clip-border [&_span]:print:text-emerald-800"
          title="GRISSA Report"
          description={GRISSA_REPORT_PAGE_DESCRIPTION}
        />
      )}
      {!hideMetaList && (
        <ReportMetaList
          organisationName={organisationName}
          assessmentId={assessmentId}
          createdAt={createdAt}
          updatedAt={updatedAt}
          className={hideTitleStrip ? "" : "mt-4 print:mt-3"}
        />
      )}
    </header>
  );
}
