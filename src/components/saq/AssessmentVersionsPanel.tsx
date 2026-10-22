"use client";

import { useState } from "react";
import type { AssessmentVersion } from "@/src/lib/saq/assessment.types";
import {
  canCreateAssessmentVersion,
  canEditAssessment,
  type AssessmentRole,
  type AssessmentVersionStatus,
} from "@/src/lib/saq/permissions";
import {
  createAssessmentVersion,
  updateAssessmentVersion,
} from "@/src/lib/saq/assessment.repository";

const STATUS_LABEL: Record<AssessmentVersionStatus, string> = {
  draft: "Draft",
  submitted: "Submitted",
  reviewed: "Reviewed",
  archived: "Archived",
};

interface AssessmentVersionsPanelProps {
  assessmentId: string;
  myRole: AssessmentRole;
  versions: AssessmentVersion[];
  currentVersion: AssessmentVersion | null;
  currentVersionId: string | null;
  onVersionsChanged: () => void | Promise<void>;
  onSelectVersion: (versionId: string) => void;
  showCreateButton?: boolean;
}

export function AssessmentVersionsPanel({
  assessmentId,
  myRole,
  versions,
  currentVersion,
  currentVersionId,
  onVersionsChanged,
  onSelectVersion,
  showCreateButton = true,
}: AssessmentVersionsPanelProps) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canCreate = canCreateAssessmentVersion(myRole);
  const canEditMeta = canEditAssessment(myRole);

  const handleCreate = async () => {
    const label = window.prompt(
      "Optional label for the new version (e.g. “2026 Q1 baseline”). Leave empty for none."
    );
    if (label === null) return;
    setBusy(true);
    setError(null);
    try {
      const v = await createAssessmentVersion(assessmentId, label.trim() || null);
      await onVersionsChanged();
      onSelectVersion(v.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not create version.");
    } finally {
      setBusy(false);
    }
  };

  const handleStatusChange = async (next: AssessmentVersionStatus) => {
    if (!currentVersionId || !currentVersion) return;
    setBusy(true);
    setError(null);
    try {
      await updateAssessmentVersion(assessmentId, currentVersionId, { status: next });
      await onVersionsChanged();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not update status.");
    } finally {
      setBusy(false);
    }
  };

  if (!versions.length) {
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
        No versions found. If this persists after refresh, run database migrations.
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-slate-200 bg-white px-4 py-3 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2">
        {currentVersion && (
            <span
              className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wide text-emerald-800 ring-1 ring-emerald-200"
              title="Data shown and saved for this version"
            >
              Current Version:
            </span>
          )}
          
          <select
            id="saq-version-select"
            className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-900 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            value={currentVersionId ?? ""}
            disabled={busy}
            onChange={(e) => onSelectVersion(e.target.value)}
            aria-label="Select assessment version"
          >
            {versions.map((v) => (
              <option key={v.id} value={v.id}>
                v{v.versionNumber}
                {v.label ? ` — ${v.label}` : ""} ({STATUS_LABEL[v.status]})
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {canEditMeta && currentVersion && (
            <label className="flex items-center gap-2 text-sm text-slate-600">
              <span
              className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wide text-emerald-800 ring-1 ring-emerald-200"
              title="Version status"
            >
              Current Status:
            </span>
              <select
                className="rounded-md border border-slate-300 bg-white px-2 py-1 text-sm text-slate-900 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                value={currentVersion.status}
                disabled={busy}
                onChange={(e) => handleStatusChange(e.target.value as AssessmentVersionStatus)}
                aria-label="Version status"
              >
                {(Object.keys(STATUS_LABEL) as AssessmentVersionStatus[]).map((s) => (
                  <option key={s} value={s}>
                    {STATUS_LABEL[s]}
                  </option>
                ))}
              </select>
            </label>
          )}
          {canCreate && showCreateButton && (
            <button
              type="button"
              disabled={busy}
              onClick={handleCreate}
              className="inline-flex items-center rounded-md border border-emerald-600 bg-emerald-50 px-3 py-1.5 text-sm font-medium text-emerald-800 hover:bg-emerald-100 disabled:opacity-50"
            >
              {busy ? "Working…" : "Create New version"}
            </button>
          )}
        </div>
      </div>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      <p className="mt-2 text-xs text-slate-500">
        Each version stores its own scope, answers, and action metadata. Creating a version copies from the latest.
        Only draft versions can be edited; switch status to freeze a baseline snapshot.
      </p>
    </div>
  );
}
