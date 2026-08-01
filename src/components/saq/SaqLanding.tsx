"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { listAssessments } from "@/src/lib/saq/assessment.repository";
import { createAssessmentAction } from "@/src/lib/saq/createAssessmentAction";
import type { AssessmentListItem } from "@/src/lib/saq/assessment.types";
import { AssessmentListCard } from "./AssessmentListCard";
import { EmptyAssessmentsState } from "./EmptyAssessmentsState";
import { canCreateAssessmentVersion, canManageCollaborators } from "@/src/lib/saq/permissions";
import { GrissaPageHeader } from "./GrissaPageHeader";

export function SaqLanding() {
  const router = useRouter();
  const [assessments, setAssessments] = useState<AssessmentListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [orgName, setOrgName] = useState("");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const loadAssessments = useCallback(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    listAssessments()
      .then((list) => {
        if (!cancelled) setAssessments(list);
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load assessments");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => loadAssessments(), [loadAssessments]);

  async function handleNewAssessment(e: React.FormEvent) {
    e.preventDefault();
    const name = orgName.trim();
    if (!name) return;
    setCreating(true);
    setCreateError(null);
    try {
      const assessment = await createAssessmentAction(name);
      router.push(`/saq/assessment/${assessment.id}`);
      router.refresh();
    } catch (e) {
      setCreateError(e instanceof Error ? e.message : "Failed to create assessment");
    } finally {
      setCreating(false);
    }
  }

  return (
    <main className="min-h-0 flex-1 bg-transparent pb-12">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <GrissaPageHeader
          title="GRISSA Workspace"
          description="Create, resume, review, and manage assessment runs across your organisation."
        />

        <>
            <section className="mt-12 rounded-xl border border-slate-200 bg-white p-6 shadow-sm" aria-labelledby="new-assessment-heading">
              <h2 id="new-assessment-heading" className="text-xl font-semibold text-slate-900">
                Start a new assessment
              </h2>
              <p className="mt-1 text-sm text-slate-600">
                Enter your organisation name to create an assessment. You can save progress and return later.
              </p>
              <form
                onSubmit={handleNewAssessment}
                className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end"
              >
                <div className="flex-1">
                  <label htmlFor="org-name" className="block text-sm font-medium text-slate-700">
                    Organisation name
                  </label>
                  <input
                    id="org-name"
                    type="text"
                    value={orgName}
                    onChange={(e) => setOrgName(e.target.value)}
                    placeholder="e.g. My Research Infrastructure"
                    className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    required
                  />
                </div>
                <button
                  type="submit"
                  disabled={creating}
                  className="inline-flex items-center justify-center rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 disabled:opacity-50"
                >
                  {creating ? "Creating…" : "Start assessment"}
                </button>
              </form>
              {createError && <p className="mt-2 text-sm text-red-600">{createError}</p>}
            </section>

            <section
              className="mt-12 rounded-xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8"
              aria-labelledby="your-assessments-heading"
            >
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <div>
                  <h2 id="your-assessments-heading" className="text-xl font-semibold text-slate-900">
                    Manage your assessments
                  </h2>
                  <p className="mt-1 text-sm text-slate-600">
                    Open, resume, or view dashboard and report for your saved assessments.
                  </p>
                </div>
                {!loading && !error && assessments.length > 0 && (
                  <span className="text-sm font-medium text-slate-500 tabular-nums">
                    {assessments.length} {assessments.length === 1 ? "assessment" : "assessments"}
                  </span>
                )}
              </div>
              <p className="mt-2 text-xs text-slate-500">
                Owners can manage team access, create versions, and delete assessments. Editors can update draft
                versions. Reviewers/viewers remain read-only.
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Last updated by is shown when reliably available; otherwise marked as not tracked yet.
              </p>
              {loading ? (
                <div className="mt-6 rounded-xl border border-slate-100 bg-slate-50/50 p-8 text-center">
                  <p className="text-sm text-slate-500">Loading assessments…</p>
                  <div className="mx-auto mt-3 h-1 w-24 animate-pulse rounded bg-slate-200" />
                </div>
              ) : error ? (
                <div className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
                  {error}
                </div>
              ) : assessments.length === 0 ? (
                <div className="mt-6">
                  <EmptyAssessmentsState />
                </div>
              ) : (
                <ul className="mt-6 space-y-4" role="list">
                  {assessments.map((a) => (
                    <AssessmentListCard
                      key={a.id}
                      assessment={a}
                      canManageTeam={canManageCollaborators(a.myRole)}
                      canCreateVersion={canCreateAssessmentVersion(a.myRole)}
                      onDeleted={() => {
                        void loadAssessments();
                      }}
                    />
                  ))}
                </ul>
              )}
            </section>
        </>
      </div>
    </main>
  );
}
