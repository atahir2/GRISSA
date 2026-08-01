"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AssessmentStepper } from "./AssessmentStepper";
import { ScopeGoalsStep } from "./ScopeGoalsStep";
import { QuestionnaireStep } from "./QuestionnaireStep";
import { ResultsStep } from "./ResultsStep";
import { ActionPlanStep } from "./ActionPlanStep";
import { getQuestionnaireConfig } from "@/src/lib/saq/questionnaire.repository";
import type {
  ScopeSelection,
  AssessmentAnswer,
} from "@/src/lib/saq/engine/results";
import { buildAssessmentResults } from "@/src/lib/saq/engine/results";
import { buildActionPlan, type ExistingActionMetadata } from "@/src/lib/saq/engine/actions";
import type { EffortRequired } from "@/src/lib/saq/engine/scoring";
import {
  getAssessmentAccess,
  loadScopeSelections,
  loadAnswers,
  loadActionMetadata,
  saveScopeSelections,
  saveAnswers,
  saveActionMetadata,
  type ActionMetadata,
} from "@/src/lib/saq/assessment.repository";
import { canEditAssessment, canEditAssessmentVersionContent } from "@/src/lib/saq/permissions";
import { useAssessmentVersionRoute } from "./useAssessmentVersionRoute";
import { GrissaPageHeader } from "./GrissaPageHeader";

const STEPS = ["Scope & Goals", "Questionnaire", "Results", "Action Plan"] as const;

type SaveStatus = "idle" | "saving" | "saved" | "error";

interface AssessmentLayoutProps {
  assessmentId?: string;
}

export function AssessmentLayout({ assessmentId }: AssessmentLayoutProps) {
  const router = useRouter();
  const {
    versions,
    versionsLoading,
    versionError,
    effectiveVersionId,
    currentVersion,
  } = useAssessmentVersionRoute(assessmentId);

  const [dataLoading, setDataLoading] = useState(!!assessmentId);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [assessmentName, setAssessmentName] = useState<string | null>(null);
  const [myRole, setMyRole] = useState<
    import("@/src/lib/saq/permissions").AssessmentRole | null
  >(null);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [currentStep, setCurrentStep] = useState(0);

  const { themes, scopeItems, questions } = useMemo(
    () => getQuestionnaireConfig(),
    []
  );

  const [scopeSelections, setScopeSelections] = useState<ScopeSelection[]>([]);
  const [answers, setAnswers] = useState<AssessmentAnswer[]>([]);
  const [effortByQuestionId, setEffortByQuestionId] = useState<
    Record<string, EffortRequired>
  >({});
  const [actionMetadataByQuestionId, setActionMetadataByQuestionId] = useState<
    Record<string, ExistingActionMetadata>
  >({});

  useEffect(() => {
    setCurrentStep(0);
  }, [effectiveVersionId]);

  useEffect(() => {
    if (!assessmentId) {
      setDataLoading(false);
      return;
    }
    if (!effectiveVersionId || versionsLoading) {
      return;
    }
    let cancelled = false;
    setDataLoading(true);
    setLoadError(null);
    (async () => {
      try {
        const access = await getAssessmentAccess(assessmentId);
        if (cancelled) return;
        if (!access) {
          setLoadError("Access denied or assessment not found.");
          setDataLoading(false);
          return;
        }
        setMyRole(access.myRole);
        const [scope, ans, meta] = await Promise.all([
          loadScopeSelections(assessmentId, effectiveVersionId),
          loadAnswers(assessmentId, effectiveVersionId),
          loadActionMetadata(assessmentId, effectiveVersionId),
        ]);
        if (cancelled) return;
        setAssessmentName(access.assessment.organisationName);
        const scopeByScopeId = new Map(scope.map((s) => [s.scopeId, s]));
        const mergedScope = scopeItems.map((si) => {
          const loaded = scopeByScopeId.get(si.id);
          return loaded
            ? { ...loaded, assessmentId }
            : { assessmentId, scopeId: si.id, inScope: false, targetCapability: undefined as 1 | 2 | 3 | undefined };
        });
        setScopeSelections(mergedScope);
        setAnswers(ans.map((a) => ({ ...a, assessmentId })));
        const effort: Record<string, EffortRequired> = {};
        const metadata: Record<string, ExistingActionMetadata> = {};
        for (const [qId, m] of Object.entries(meta) as [string, ActionMetadata][]) {
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
        if (!cancelled) {
          setLoadError(e instanceof Error ? e.message : "Failed to load assessment.");
        }
      } finally {
        if (!cancelled) setDataLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [assessmentId, effectiveVersionId, versionsLoading, scopeItems]);

  const canEditRole = myRole !== null && canEditAssessment(myRole);
  const canEditThisVersion =
    canEditRole && canEditAssessmentVersionContent(myRole, currentVersion?.status ?? null);
  const readOnly = assessmentId ? !canEditThisVersion : false;

  const loading =
    !!assessmentId &&
    !versionError &&
    (versionsLoading || dataLoading || !effectiveVersionId);

  const persistScope = useCallback(async () => {
    if (!assessmentId || !effectiveVersionId || !canEditThisVersion) return;
    setSaveStatus("saving");
    try {
      await saveScopeSelections(assessmentId, effectiveVersionId, scopeSelections);
      setSaveStatus("saved");
      setTimeout(() => setSaveStatus("idle"), 2000);
    } catch {
      setSaveStatus("error");
    }
  }, [assessmentId, effectiveVersionId, scopeSelections, canEditThisVersion]);

  const persistAnswers = useCallback(async () => {
    if (!assessmentId || !effectiveVersionId || !canEditThisVersion) return;
    setSaveStatus("saving");
    try {
      await saveAnswers(assessmentId, effectiveVersionId, answers);
      setSaveStatus("saved");
      setTimeout(() => setSaveStatus("idle"), 2000);
    } catch {
      setSaveStatus("error");
    }
  }, [assessmentId, effectiveVersionId, answers, canEditThisVersion]);

  const persistActionMetadata = useCallback(async () => {
    if (!assessmentId || !effectiveVersionId || !canEditThisVersion) return;
    setSaveStatus("saving");
    try {
      const combined: Record<string, ActionMetadata> = {};
      for (const [qId, effort] of Object.entries(effortByQuestionId)) {
        combined[qId] = { ...actionMetadataByQuestionId[qId], effortRequired: effort };
      }
      for (const [qId, m] of Object.entries(actionMetadataByQuestionId)) {
        if (!combined[qId]) combined[qId] = m;
      }
      await saveActionMetadata(assessmentId, effectiveVersionId, combined);
      setSaveStatus("saved");
      setTimeout(() => setSaveStatus("idle"), 2000);
    } catch {
      setSaveStatus("error");
    }
  }, [assessmentId, effectiveVersionId, effortByQuestionId, actionMetadataByQuestionId, canEditThisVersion]);

  const saveAllProgress = useCallback(async () => {
    if (!assessmentId || !effectiveVersionId || !canEditThisVersion) return;
    setSaveStatus("saving");
    try {
      await Promise.all([persistScope(), persistAnswers(), persistActionMetadata()]);
      setSaveStatus("saved");
      setTimeout(() => setSaveStatus("idle"), 2000);
    } catch {
      setSaveStatus("error");
    }
  }, [assessmentId, effectiveVersionId, canEditThisVersion, persistScope, persistAnswers, persistActionMetadata]);

  const assessmentResults = useMemo(
    () => buildAssessmentResults(scopeSelections, answers),
    [scopeSelections, answers]
  );

  const actionPlan = useMemo(
    () =>
      buildActionPlan(assessmentResults, effortByQuestionId, actionMetadataByQuestionId),
    [assessmentResults, effortByQuestionId, actionMetadataByQuestionId]
  );

  const inScopeCount = scopeSelections.filter((s) => s.inScope).length;
  const totalQuestions = assessmentResults.summary.totalQuestions;
  const answeredQuestions = assessmentResults.summary.answeredQuestions;
  const completionPct =
    totalQuestions === 0 ? 0 : Math.round((answeredQuestions / totalQuestions) * 100);

  const canProceedToResults = inScopeCount > 0;
  const canProceedToActionPlan = totalQuestions > 0;

  const canGoNext =
    currentStep === STEPS.length - 1
      ? true
      : currentStep === 0
      ? canProceedToResults
      : currentStep === 1
      ? totalQuestions === 0 || answeredQuestions > 0
      : currentStep === 2
      ? canProceedToActionPlan
      : true;

  const canGoBack = currentStep > 0;

  const blockReason =
    currentStep === 0 && !canProceedToResults
      ? "Select at least one scope item as in scope to continue."
      : currentStep === 1 && totalQuestions > 0 && answeredQuestions === 0
      ? "Answer at least one question to continue."
      : currentStep === 2 && !canProceedToActionPlan
      ? "Complete the questionnaire to view the action plan."
      : null;

  const goNext = useCallback(() => {
    const next = currentStep + 1;
    if (next >= STEPS.length) {
      if (assessmentId && effectiveVersionId) {
        persistActionMetadata().then(() =>
          router.push(`/saq/dashboard/${assessmentId}?versionId=${effectiveVersionId}`)
        );
      } else {
        router.push("/saq");
      }
      return;
    }
    if (assessmentId) {
      if (currentStep === 0) persistScope().then(() => setCurrentStep(next));
      else if (currentStep === 1) persistAnswers().then(() => setCurrentStep(next));
      else setCurrentStep(next);
    } else {
      setCurrentStep(next);
    }
  }, [assessmentId, effectiveVersionId, currentStep, persistScope, persistAnswers, persistActionMetadata, router]);

  const goBack = useCallback(() => {
    const prev = Math.max(0, currentStep - 1);
    if (assessmentId && currentStep === 1) {
      persistScope().then(() => setCurrentStep(prev));
    } else if (assessmentId && currentStep === 2) {
      persistAnswers().then(() => setCurrentStep(prev));
    } else {
      setCurrentStep(prev);
    }
  }, [assessmentId, currentStep, persistScope, persistAnswers]);

  const combinedError = versionError || loadError;
  const showSaveButton = !!assessmentId && canEditThisVersion;

  if (loading) {
    return (
      <main className="min-h-0 flex-1 bg-transparent">
      <div className="mx-auto max-w-7xl px-4 py-16 text-center">
          <p className="text-slate-400">Loading assessment…</p>
          <div className="mx-auto mt-4 h-1 w-32 animate-pulse rounded bg-slate-600" />
        </div>
      </main>
    );
  }

  if (combinedError && assessmentId) {
    return (
      <main className="min-h-0 flex-1 bg-transparent">
        <div className="mx-auto max-w-7xl px-4 py-16">
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-800">
            {combinedError.includes("Access denied") ? (
              <>
                <strong className="font-semibold">Access denied.</strong> You do not have permission to open this
                assessment, or it does not exist.
              </>
            ) : (
              combinedError
            )}
          </div>
          <button
            type="button"
            onClick={() => router.push("/saq/manage")}
            className="mt-4 text-sm font-medium text-emerald-600 hover:underline"
          >
            Back to assessments
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-0 flex-1 bg-transparent pb-12">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <GrissaPageHeader
          title="GRISSA Assessment"
          description="Prepare a certification baseline for your Research Infrastructure by defining scope, answering the questionnaire, and reviewing results and recommended actions."
        >
          {assessmentName && (
            <p className="mt-2 text-sm font-medium text-slate-300">
              Assessment: {assessmentName}
              {myRole && (
                <span className="ml-2 inline-flex rounded-full bg-slate-700 px-2 py-0.5 text-xs font-medium text-slate-100">
                  {myRole === "owner"
                    ? "Owner"
                    : myRole === "editor"
                      ? "Editor"
                      : myRole === "reviewer"
                        ? "Reviewer"
                        : "Viewer"}
                </span>
              )}
            </p>
          )}
          {readOnly && (
            <p className="mt-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
              {canEditRole && currentVersion && currentVersion.status !== "draft" ? (
                <>
                  This version is <strong>{currentVersion.status}</strong>. Content is read-only; switch to a draft
                  version or create a new version to edit.
                </>
              ) : (
                <>
                  You have <strong>view-only</strong> access. Editing is disabled; you can still review results and steps.
                </>
              )}
            </p>
          )}
          {assessmentId && canEditThisVersion && (
            <div className="mt-2 flex items-center gap-2 text-sm text-slate-400">
              {saveStatus === "saving" && <span>Saving…</span>}
              {saveStatus === "saved" && <span className="text-emerald-600">Saved</span>}
              {saveStatus === "error" && <span className="text-red-600">Save failed</span>}
            </div>
          )}
        </GrissaPageHeader>

        <div className="mb-6 flex flex-wrap items-center gap-4 rounded-lg border border-slate-200 bg-white px-4 py-3 shadow-sm">
          <div className="flex items-center gap-2 border-r border-slate-200 pr-4">
            <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
              Step
            </span>
            <span className="font-semibold text-slate-900">
              {currentStep + 1} of {STEPS.length}
            </span>
            <span className="text-sm text-slate-600">— {STEPS[currentStep]}</span>
          </div>
          <div className="flex flex-wrap items-center gap-6 text-sm">
            <div>
              <span className="text-slate-500">In-scope questions: </span>
              <span className="font-medium text-slate-900">{totalQuestions}</span>
            </div>
            <div>
              <span className="text-slate-500">Answered: </span>
              <span className="font-medium text-slate-900">{answeredQuestions}</span>
            </div>
            <div>
              <span className="text-slate-500">Completion: </span>
              <span className="font-semibold text-emerald-700">{completionPct}%</span>
            </div>
          </div>
        </div>

        <div className="mb-6 rounded-lg border border-slate-200 bg-white px-4 py-3 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <button
              type="button"
              disabled={!canGoBack}
              onClick={goBack}
              className="inline-flex items-center rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Back
            </button>
            <div className="flex items-center gap-2">
              {showSaveButton && (
                <button
                  type="button"
                  onClick={() => void saveAllProgress()}
                  disabled={saveStatus === "saving"}
                  className="inline-flex items-center rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 disabled:opacity-50"
                >
                  {saveStatus === "saving" ? "Saving..." : "Save progress"}
                </button>
              )}
              <button
                type="button"
                disabled={!canGoNext}
                onClick={goNext}
                className="inline-flex items-center rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {currentStep === STEPS.length - 1 ? "Finish" : "Next"}
              </button>
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-4 py-3 sm:px-6">
            <AssessmentStepper currentStep={currentStep} steps={STEPS} />
          </div>

          <div className="px-4 py-6 sm:px-6 sm:py-8">
            {currentStep === 0 && (
              <ScopeGoalsStep
                themes={themes}
                scopeItems={scopeItems}
                scopeSelections={scopeSelections}
                onChange={setScopeSelections}
                readOnly={readOnly}
              />
            )}
            {currentStep === 1 && (
              <QuestionnaireStep
                themes={themes}
                scopeItems={scopeItems}
                questions={questions}
                scopeSelections={scopeSelections}
                answers={answers}
                onChange={setAnswers}
                readOnly={readOnly}
              />
            )}
            {currentStep === 2 && (
              <ResultsStep assessmentResults={assessmentResults} />
            )}
            {currentStep === 3 && (
              <ActionPlanStep
                actionPlan={actionPlan}
                readOnly={readOnly}
                onEffortChange={(questionId, effort) =>
                  setEffortByQuestionId((prev) => ({
                    ...prev,
                    [questionId]: effort,
                  }))
                }
                onActionMetadataChange={(questionId, patch) =>
                  setActionMetadataByQuestionId((prev) => ({
                    ...prev,
                    [questionId]: { ...prev[questionId], ...patch },
                  }))
                }
              />
            )}

            {blockReason && (
              <p className="mt-4 rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800">
                {blockReason}
              </p>
            )}

            <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-6">
              <button
                type="button"
                disabled={!canGoBack}
                onClick={goBack}
                className="inline-flex items-center rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Back
              </button>
              <div className="flex items-center gap-2">
                {showSaveButton && (
                  <button
                    type="button"
                    onClick={() => void saveAllProgress()}
                    disabled={saveStatus === "saving"}
                    className="inline-flex items-center rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 disabled:opacity-50"
                  >
                    {saveStatus === "saving" ? "Saving..." : "Save progress"}
                  </button>
                )}
                <button
                  type="button"
                  disabled={!canGoNext}
                  onClick={goNext}
                  className="inline-flex items-center rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {currentStep === STEPS.length - 1 ? "Finish" : "Next"}
                </button>
              </div>
            </div>
          </div>
        </div>

        {assessmentId && myRole && versions.length > 1 && (
          <div className="mt-6 rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600 shadow-sm">
            You are currenlty viewing version{" "}
            <span className="font-medium text-slate-900">
              {currentVersion ? `v${currentVersion.versionNumber}` : "unknown"}
            </span>
            . Manage versions and team access from Workspace.
          </div>
        )}
      </div>
    </main>
  );
}
