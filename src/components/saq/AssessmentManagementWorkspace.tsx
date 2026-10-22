"use client";

import { useCallback, useEffect, useState } from "react";
import { createAssessmentVersion, getAssessmentAccess } from "@/src/lib/saq/assessment.repository";
import { canCreateAssessmentVersion, type AssessmentRole } from "@/src/lib/saq/permissions";
import { AssessmentCollaboratorsPanel } from "./AssessmentCollaboratorsPanel";
import { AssessmentVersionsPanel } from "./AssessmentVersionsPanel";
import { useAssessmentVersionRoute } from "./useAssessmentVersionRoute";
import { GrissaPageHeader } from "./GrissaPageHeader";

interface AssessmentManagementWorkspaceProps {
  assessmentId: string;
}

function formatDate(value: Date | string | undefined): string {
  if (!value) return "—";
  const d = value instanceof Date ? value : new Date(value);
  return Number.isNaN(d.getTime())
    ? "—"
    : d.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

export function AssessmentManagementWorkspace({ assessmentId }: AssessmentManagementWorkspaceProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [assessmentName, setAssessmentName] = useState<string>("");
  const [myRole, setMyRole] = useState<AssessmentRole | null>(null);
  const [ownerUserId, setOwnerUserId] = useState<string>("");
  const [createdAt, setCreatedAt] = useState<Date | string | undefined>(undefined);
  const [updatedAt, setUpdatedAt] = useState<Date | string | undefined>(undefined);
  const [creatingVersion, setCreatingVersion] = useState(false);
  const [createVersionError, setCreateVersionError] = useState<string | null>(null);

  const {
    versions,
    versionsLoading,
    versionError,
    effectiveVersionId,
    currentVersion,
    reloadVersions,
    navigateToVersion,
  } = useAssessmentVersionRoute(assessmentId);

  const loadAccess = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const access = await getAssessmentAccess(assessmentId);
      if (!access) {
        setError("Assessment not found or access denied.");
        return;
      }
      setAssessmentName(access.assessment.organisationName);
      setMyRole(access.myRole);
      setOwnerUserId(access.ownerUserId);
      setCreatedAt(access.assessment.createdAt);
      setUpdatedAt(access.assessment.updatedAt);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load assessment management details.");
    } finally {
      setLoading(false);
    }
  }, [assessmentId]);

  useEffect(() => {
    void loadAccess();
  }, [loadAccess]);

  const canCreateVersion = myRole ? canCreateAssessmentVersion(myRole) : false;

  const handleCreateVersion = useCallback(async () => {
    if (!canCreateVersion || creatingVersion) return;
    const label = window.prompt(
      "Optional label for the new version (e.g. “2026 Q1 baseline”). Leave empty for none."
    );
    if (label === null) return;

    setCreatingVersion(true);
    setCreateVersionError(null);
    try {
      const v = await createAssessmentVersion(assessmentId, label.trim() || null);
      await reloadVersions();
      navigateToVersion(v.id);
    } catch (e) {
      setCreateVersionError(e instanceof Error ? e.message : "Could not create version.");
    } finally {
      setCreatingVersion(false);
    }
  }, [assessmentId, canCreateVersion, creatingVersion, navigateToVersion, reloadVersions]);

  if (loading || versionsLoading) {
    return (
      <main className="min-h-0 flex-1 bg-transparent">
        <div className="mx-auto max-w-7xl px-4 py-16 text-center text-slate-400">Loading workspace…</div>
      </main>
    );
  }

  if (error || versionError || !myRole) {
    return (
      <main className="min-h-0 flex-1 bg-transparent">
        <div className="mx-auto max-w-7xl px-4 py-16">
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-800">
            {error ?? versionError ?? "Assessment could not be loaded."}
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-0 flex-1 bg-transparent pb-12">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <GrissaPageHeader
          title="GRISSA Workspace Management"
          description="Assessment-specific team access and version management for this organisation."
        />

        {(canCreateVersion || createVersionError) && (
          <div className="mb-6 flex flex-col items-end gap-2">
            {canCreateVersion && (
              <button
                type="button"
                onClick={() => void handleCreateVersion()}
                disabled={creatingVersion}
                className="inline-flex shrink-0 items-center rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:ring-offset-2 focus:ring-offset-slate-900 disabled:opacity-50"
              >
                {creatingVersion ? "Working…" : "Create New Version"}
              </button>
            )}
            {createVersionError && (
              <p className="max-w-lg text-right text-sm text-red-400">{createVersionError}</p>
            )}
          </div>
        )}

        <section className="mt-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="space-y-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Organization</p>
                <p className="mt-1 text-base font-semibold text-slate-900">{assessmentName}</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Role</p>
                <p className="mt-1 text-base font-medium text-slate-900">{myRole}</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Owner</p>
                <p className="mt-1 text-xs font-medium text-slate-700">{ownerUserId}</p>
              </div>
            </div>
            <div className="space-y-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Created on</p>
                <p className="mt-1 text-base font-medium text-slate-900">{formatDate(createdAt)}</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Last Updated</p>
                <p className="mt-1 text-base font-medium text-slate-900">{formatDate(updatedAt)}</p>
              </div>
              
            </div>
          </div>
        </section>

        <section className="mt-6">
          <AssessmentVersionsPanel
            assessmentId={assessmentId}
            myRole={myRole}
            versions={versions}
            currentVersion={currentVersion}
            currentVersionId={effectiveVersionId}
            onVersionsChanged={reloadVersions}
            onSelectVersion={navigateToVersion}
            showCreateButton={false}
          />
        </section>

        <AssessmentCollaboratorsPanel assessmentId={assessmentId} myRole={myRole} />
      </div>
    </main>
  );
}

