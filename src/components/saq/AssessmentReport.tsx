"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { getQuestionnaireConfig } from "@/src/lib/saq/questionnaire.repository";
import { buildAssessmentResults } from "@/src/lib/saq/engine/results";
import { buildActionPlan, type ExistingActionMetadata } from "@/src/lib/saq/engine/actions";
import { buildAssessmentInterpretation } from "@/src/lib/saq/engine/interpretation";
import {
  getAssessmentAccess,
  loadScopeSelections,
  loadAnswers,
  loadActionMetadata,
} from "@/src/lib/saq/assessment.repository";
import type { AssessmentRole } from "@/src/lib/saq/permissions";
import { useAssessmentVersionRoute } from "./useAssessmentVersionRoute";
import type { ScopeSelection, AssessmentAnswer } from "@/src/lib/saq/engine/results";
import type { EffortRequired } from "@/src/lib/saq/engine/scoring";
import { ReportMetaList, GRISSA_REPORT_PAGE_DESCRIPTION } from "./ReportHeader";
import { GrissaPageHeader, GrissaPageTitleStrip } from "./GrissaPageHeader";
import { ReportSection } from "./ReportSection";
import { ReportSummaryCard } from "./ReportSummaryCard";
import { ReportThemeCard } from "./ReportThemeCard";
import { ReportInfoBanner } from "./ReportInfoBanner";
import { ReportPurposeNote } from "./ReportPurposeNote";
import { MethodologyNote } from "./MethodologyNote";
import { ReportReadinessMeaning } from "./ReportReadinessMeaning";
import { ReadinessLegend } from "./ReadinessLegend";
import { ReportActionGroup } from "./ReportActionGroup";
import { ActionPlanSectionIntro } from "./ActionPlanSectionIntro";
import { ReadinessHeroCard } from "./ReadinessHeroCard";
import { StrengthsImprovementPanel } from "./StrengthsImprovementPanel";
import { ThemeReadinessSnapshot } from "./ThemeReadinessSnapshot";
import { StrategicRecommendationsCard } from "./StrategicRecommendationsCard";

interface AssessmentReportProps {
  assessmentId: string;
}

export function AssessmentReport({ assessmentId }: AssessmentReportProps) {
  const reportRef = useRef<HTMLDivElement>(null);
  const {
    versions,
    versionsLoading,
    versionError,
    effectiveVersionId,
    currentVersion,
  } = useAssessmentVersionRoute(assessmentId);

  const [dataLoading, setDataLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [myRole, setMyRole] = useState<AssessmentRole | null>(null);
  const [exporting, setExporting] = useState(false);
  const [isExportMode] = useState(false);
  const [assessmentName, setAssessmentName] = useState<string | null>(null);
  const [createdAt, setCreatedAt] = useState<Date | null>(null);
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);
  const [scopeSelections, setScopeSelections] = useState<ScopeSelection[]>([]);
  const [answers, setAnswers] = useState<AssessmentAnswer[]>([]);
  const [effortByQuestionId, setEffortByQuestionId] = useState<
    Record<string, EffortRequired>
  >({});
  const [actionMetadataByQuestionId, setActionMetadataByQuestionId] = useState<
    Record<string, ExistingActionMetadata>
  >({});

  const questionnaire = useMemo(() => getQuestionnaireConfig(), []);
  const { scopeItems, themes } = questionnaire;

  const loadData = useCallback(async () => {
    if (!effectiveVersionId || versionsLoading) return;
    setDataLoading(true);
    setError(null);
    try {
      const access = await getAssessmentAccess(assessmentId);
      if (!access) {
        setError("Assessment not found.");
        return;
      }
      setMyRole(access.myRole);
      const assessment = access.assessment;
      const [scope, ans, meta] = await Promise.all([
        loadScopeSelections(assessmentId, effectiveVersionId),
        loadAnswers(assessmentId, effectiveVersionId),
        loadActionMetadata(assessmentId, effectiveVersionId),
      ]);
      setAssessmentName(assessment.organisationName);
      setCreatedAt(
        assessment.createdAt instanceof Date
          ? assessment.createdAt
          : new Date(assessment.createdAt)
      );
      setUpdatedAt(
        assessment.updatedAt instanceof Date
          ? assessment.updatedAt
          : new Date(assessment.updatedAt as string)
      );
      const scopeByScopeId = new Map(scope.map((s) => [s.scopeId, s]));
      const mergedScope = scopeItems.map((si) => {
        const loaded = scopeByScopeId.get(si.id);
        return loaded
          ? { ...loaded, assessmentId }
          : {
              assessmentId,
              scopeId: si.id,
              inScope: false,
              targetCapability: undefined as 1 | 2 | 3 | undefined,
            };
      });
      setScopeSelections(mergedScope);
      setAnswers(ans.map((a) => ({ ...a, assessmentId })));
      const effort: Record<string, EffortRequired> = {};
      const metadata: Record<string, ExistingActionMetadata> = {};
      for (const [qId, m] of Object.entries(meta)) {
        if (m.effortRequired) effort[qId] = m.effortRequired;
        metadata[qId] = {
          leader: m.leader,
          deadline: m.deadline,
          status: m.status,
          remarks: m.remarks,
        };
      }
      setEffortByQuestionId(effort);
      setActionMetadataByQuestionId(metadata);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Failed to load assessment."
      );
    } finally {
      setDataLoading(false);
    }
  }, [assessmentId, scopeItems, effectiveVersionId, versionsLoading]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const combinedError = versionError || error;
  const loading =
    versionsLoading ||
    dataLoading ||
    (!!assessmentId && !effectiveVersionId && !versionError);

  const assessmentResults = useMemo(
    () => buildAssessmentResults(scopeSelections, answers),
    [scopeSelections, answers]
  );

  const actionPlan = useMemo(
    () =>
      buildActionPlan(
        assessmentResults,
        effortByQuestionId,
        actionMetadataByQuestionId
      ),
    [assessmentResults, effortByQuestionId, actionMetadataByQuestionId]
  );

  const interpretation = useMemo(
    () => buildAssessmentInterpretation(assessmentResults, actionPlan),
    [assessmentResults, actionPlan]
  );

  const summary = assessmentResults.summary;
  const actionSummary = actionPlan.summary;
  const themeTitleById = useMemo(() => {
    const map = new Map<string, string>();
    for (const t of themes) map.set(t.id, t.title);
    return map;
  }, [themes]);

  const actionPlanInterpretation = useMemo(() => {
    const total =
      actionSummary.immediateCount +
      actionSummary.urgentCount +
      actionSummary.plannedCount +
      actionSummary.lowPriorityImplementationCount +
      actionSummary.noActionNeededCount;
    const safeTotal = total || 1;
    const urgentShare =
      (actionSummary.immediateCount + actionSummary.urgentCount) / safeTotal;

    if (urgentShare >= 0.5) {
      return "The action profile is dominated by urgent items, indicating significant improvement needs that should be planned and resourced in the short term.";
    }
    if (actionSummary.plannedCount >= actionSummary.urgentCount) {
      return "The action profile suggests a focused set of planned improvements that can be sequenced across short- to medium-term implementation.";
    }
    return "The action profile indicates a balanced mix of priorities; use the action plan to sequence improvements and track ownership and deadlines.";
  }, [actionSummary]);

  const handleExportPdf = useCallback(async () => {
    setExporting(true);
    try {
      const { pdf } = await import("@react-pdf/renderer");
      const { AssessmentReportPDF } = await import("./AssessmentReportPDF");

      const themeTitles: Record<string, string> = Object.fromEntries(themeTitleById);

      const doc = (
        <AssessmentReportPDF
          assessmentId={assessmentId}
          assessmentName={assessmentName}
          createdAt={createdAt}
          updatedAt={updatedAt}
          assessmentResults={assessmentResults}
          actionPlan={actionPlan}
          interpretation={interpretation}
          themeTitleById={themeTitles}
          actionPlanInterpretation={actionPlanInterpretation}
        />
      );

      const blob = await pdf(doc).toBlob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `GRISSA-Report-${(assessmentName ?? "report").replace(/[^a-zA-Z0-9-_]/g, "_") || "report"}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      console.error("PDF export failed:", e);
      alert("Export failed. " + message);
    } finally {
      setExporting(false);
    }
  }, [
    assessmentId,
    assessmentName,
    createdAt,
    updatedAt,
    assessmentResults,
    actionPlan,
    interpretation,
    themeTitleById,
    actionPlanInterpretation,
  ]);

  const actionItemsByTheme = useMemo(() => {
    const grouped = new Map<string, typeof actionPlan.actionItems>();
    for (const item of actionPlan.actionItems) {
      const themeId = item.themeId ?? "unknown";
      const arr = grouped.get(themeId) ?? [];
      arr.push(item);
      grouped.set(themeId, arr);
    }
    return grouped;
  }, [actionPlan]);

  if (loading) {
    return (
      <main className="min-h-0 flex-1 bg-transparent">
        <div className="mx-auto max-w-7xl px-4 py-16 text-center">
          <p className="text-slate-400">Loading report…</p>
          <div className="mx-auto mt-4 h-1 w-32 animate-pulse rounded bg-slate-600" />
        </div>
      </main>
    );
  }

  const formatDate = (d: Date) =>
    d.toLocaleDateString(undefined, { dateStyle: "medium" });

  if (combinedError) {
    return (
      <main className="min-h-0 flex-1 bg-transparent">
        <div className="mx-auto max-w-7xl px-4 py-16">
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-800">
            {combinedError}
          </div>
          <Link
            href="/saq/manage"
            className="mt-4 inline-block text-sm font-medium text-emerald-600 hover:underline"
          >
            Back to assessments
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-0 flex-1 bg-transparent pb-12 print:bg-white print:pb-0">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 print:max-w-none print:px-4 print:py-4">
        <GrissaPageHeader
          className="print:hidden"
          title="GRISSA Report"
          description={GRISSA_REPORT_PAGE_DESCRIPTION}
        />

        <div className="mb-4 print:hidden">
          <ReportInfoBanner />
        </div>

        {/* Match Dashboard layout: stacked left meta, dates centre, actions right (screen only). */}
        <header className="mb-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm print:hidden">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between lg:gap-8">
            <dl className="flex min-w-0 flex-col gap-2 text-xs text-slate-600 lg:max-w-[40%]">
              <div>
                <dt className="inline font-medium text-slate-500">Assessment ID:</dt>
                <dd className="inline font-mono text-slate-900"> {assessmentId}</dd>
              </div>
              <div>
                <dt className="inline font-medium text-slate-500">Organisation:</dt>
                <dd className="inline text-slate-900">
                  {" "}
                  {assessmentName ?? "—"}
                </dd>
              </div>
              <div>
                <dt className="inline font-medium text-slate-500">Version:</dt>
                <dd className="inline text-slate-900">
                  {" "}
                  {currentVersion
                    ? `v${currentVersion.versionNumber} (${currentVersion.status})`
                    : "—"}
                </dd>
              </div>
            </dl>

            <dl className="flex min-w-[10rem] flex-col gap-2 text-xs text-slate-600 lg:flex-1 lg:items-start lg:self-stretch xl:mx-auto xl:max-w-sm">
              <div>
                <dt className="inline font-medium text-slate-500">Created:</dt>
                <dd className="inline text-slate-900">
                  {" "}
                  {createdAt ? formatDate(createdAt) : "—"}
                </dd>
              </div>
              <div>
                <dt className="inline font-medium text-slate-500">Updated:</dt>
                <dd className="inline text-slate-900">
                  {" "}
                  {updatedAt ? formatDate(updatedAt) : "—"}
                </dd>
              </div>
            </dl>

            <div className="flex shrink-0 flex-col gap-2 lg:items-end">
              <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Quick actions
              </span>
              <div className="flex flex-wrap gap-2">
                <Link
                  href={
                    effectiveVersionId
                      ? `/saq/assessment/${assessmentId}?versionId=${effectiveVersionId}`
                      : `/saq/assessment/${assessmentId}`
                  }
                  className="inline-flex items-center rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2"
                >
                  Resume assessment
                </Link>
                <Link
                  href={
                    effectiveVersionId
                      ? `/saq/dashboard/${assessmentId}?versionId=${effectiveVersionId}`
                      : `/saq/dashboard/${assessmentId}`
                  }
                  className="inline-flex items-center rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2"
                >
                  View dashboard
                </Link>
                <button
                  type="button"
                  onClick={handleExportPdf}
                  disabled={exporting}
                  className="inline-flex items-center rounded-lg border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-medium text-slate-600 shadow-sm hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 disabled:opacity-60"
                >
                  {exporting ? "Exporting…" : "Export PDF"}
                </button>
              </div>
            </div>
          </div>
        </header>

        {myRole && effectiveVersionId && versions.length > 1 && (
          <div className="mb-6 rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600 shadow-sm print:hidden">
            Currently Viewing Version:{" "}
            <span className="font-medium text-slate-900">
              {currentVersion ? `v${currentVersion.versionNumber}` : "unknown"}
            </span>
            . Manage versions from Workspace.
          </div>
        )}

        {/* Report body card: title sits above this on screen (matches Dashboard/Assessment). */}
        <div
          ref={reportRef}
          className={`saq-report-root rounded-lg border border-slate-200 bg-white p-8 shadow-sm print:border-0 print:shadow-none print:p-0 ${isExportMode ? "saq-export-mode" : ""}`}
        >
          {!isExportMode && (
            <>
              {/* Browser print: outer chrome is hidden; title + assessment meta live here only when printing. */}
              <div className="hidden print:mb-6 print:block print:border-b print:border-slate-300 print:pb-6">
                <GrissaPageTitleStrip
                  descriptionTone="onLight"
                  title="GRISSA Report"
                  description={GRISSA_REPORT_PAGE_DESCRIPTION}
                  className="[&_h1]:print:text-xl [&_p]:print:text-xs [&_span]:print:bg-none [&_span]:print:bg-clip-border [&_span]:print:text-emerald-800"
                />
                <ReportMetaList
                  organisationName={assessmentName ?? "—"}
                  assessmentId={assessmentId}
                  createdAt={createdAt}
                  updatedAt={updatedAt}
                  className="mt-4 print:mt-3"
                />
              </div>
            </>
          )}

          <ReportPurposeNote />
          <MethodologyNote />

          {/* A. Assessment interpretation */}
          <ReportSection title="Assessment interpretation" className="report-section-first">
            <div className="space-y-4 print:space-y-3">
              <ReadinessHeroCard interpretation={interpretation} summary={summary} />
              <ReportReadinessMeaning readinessLevel={interpretation.readinessLevel} />
              <StrengthsImprovementPanel
                strengths={interpretation.strengths}
                improvementAreas={interpretation.improvementAreas}
              />
              <ThemeReadinessSnapshot themes={assessmentResults.themeResults} />
              <ReadinessLegend />
              <StrategicRecommendationsCard
                recommendations={interpretation.strategicRecommendations}
              />
            </div>
          </ReportSection>

          {/* B. Assessment summary */}
          <ReportSection title="Assessment summary" className="mt-6">
            <div className="space-y-4 print:space-y-3">
              <div className="saq-export-break-after">
                <h3 className="text-sm font-semibold text-slate-900 print:text-xs">
                  Overview
                </h3>
                <div className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-3 print:grid-cols-5">
                  <ReportSummaryCard label="Total themes" value={summary.totalThemes} />
                  <ReportSummaryCard label="In-scope items" value={summary.inScopeCount} />
                  <ReportSummaryCard label="Total questions" value={summary.totalQuestions} icon="questions" />
                  <ReportSummaryCard label="Answered" value={summary.answeredQuestions} />
                  <ReportSummaryCard
                    label="Completion"
                    value={`${Math.round(summary.completionRate)}%`}
                    icon="completion"
                  />
                </div>
              </div>

              <div className="saq-export-break-after">
                <h3 className="text-sm font-semibold text-slate-900 print:text-xs">
                  Capability & targets
                </h3>
                <div className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-4 print:grid-cols-4">
                  <ReportSummaryCard label="Pass level 1" value={summary.passLevel1Count} />
                  <ReportSummaryCard label="Pass level 2" value={summary.passLevel2Count} />
                  <ReportSummaryCard label="Pass level 3" value={summary.passLevel3Count} />
                  <ReportSummaryCard label="Targets met" value={summary.targetMetCount} icon="targets" />
                </div>
              </div>

              <div className="saq-export-break-after">
                <h3 className="text-sm font-semibold text-slate-900 print:text-xs">
                  Improvement priorities
                </h3>
                <div className="mt-2 flex flex-wrap gap-3">
                  <ReportSummaryCard label="High priority" value={summary.highPriorityCount} icon="gaps" />
                  <ReportSummaryCard label="Medium priority" value={summary.mediumPriorityCount} />
                  <ReportSummaryCard label="Low priority" value={summary.lowPriorityCount} />
                </div>
              </div>
            </div>
          </ReportSection>

          {/* E. Theme summaries */}
          <ReportSection title="Theme summaries">
            <div className="space-y-3">
              {assessmentResults.themeResults.map((tr) => (
                <ReportThemeCard
                  key={tr.themeId}
                  themeTitle={tr.themeTitle}
                  summary={tr.summary}
                />
              ))}
            </div>
          </ReportSection>

          {/* F. Action plan summary */}
          <ReportSection title="Action plan summary">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 print:grid-cols-6">
              <ReportSummaryCard
                label="Total action items"
                value={actionSummary.totalActionItems}
                icon="actions"
              />
              <ReportSummaryCard
                label="Immediate"
                value={actionSummary.immediateCount}
              />
              <ReportSummaryCard label="Urgent" value={actionSummary.urgentCount} />
              <ReportSummaryCard label="Planned" value={actionSummary.plannedCount} />
              <ReportSummaryCard
                label="Low priority"
                value={actionSummary.lowPriorityImplementationCount}
              />
              <ReportSummaryCard
                label="No action needed"
                value={actionSummary.noActionNeededCount}
              />
            </div>
            <p className="mt-2 text-sm text-slate-700 print:text-xs">
              {actionPlanInterpretation}
            </p>
          </ReportSection>

          {/* G. Detailed action plan */}
          <ActionPlanSectionIntro />
          <ReportSection title="Detailed action plan" className="mt-4">
            {actionPlan.actionItems.length === 0 ? (
              <p className="rounded border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600 print:py-2">
                No action items.
              </p>
            ) : (
              <div className="space-y-2">
                {Array.from(actionItemsByTheme.entries())
                  .sort((a, b) => {
                    const ta = themeTitleById.get(a[0]) ?? a[0];
                    const tb = themeTitleById.get(b[0]) ?? b[0];
                    return ta.localeCompare(tb);
                  })
                  .map(([themeId, items]) => (
                    <ReportActionGroup
                      key={themeId}
                      themeTitle={themeTitleById.get(themeId) ?? "Other / Uncategorised"}
                      items={items}
                      exportMode={isExportMode}
                    />
                  ))}
              </div>
            )}
          </ReportSection>
        </div>
      </div>
    </main>
  );
}
