"use client";

import { useState } from "react";
import Link from "next/link";
import { deleteAssessment } from "@/src/lib/saq/assessment.repository";
import { canDeleteAssessment } from "@/src/lib/saq/permissions";
import type { AssessmentListItem } from "@/src/lib/saq/assessment.types";

interface AssessmentListCardProps {
  assessment: AssessmentListItem;
  canManageTeam?: boolean;
  canCreateVersion?: boolean;
  onDeleted?: () => void | Promise<void>;
}

function formatDate(value: Date | string | undefined): string {
  if (!value) return "—";
  const d = value instanceof Date ? value : new Date(value);
  return d.toLocaleDateString(undefined, { dateStyle: "medium" });
}

function formatActor(assessment: AssessmentListItem): string {
  if (assessment.myRole === "owner") return "You (owner)";
  return "Not available";
}

export function AssessmentListCard({
  assessment,
  canManageTeam = false,
  canCreateVersion = false,
  onDeleted,
}: AssessmentListCardProps) {
  const [deleting, setDeleting] = useState(false);
  const canDelete = canDeleteAssessment(assessment.myRole);

  async function handleDelete() {
    const confirmed = window.confirm(
      `Delete assessment "${assessment.organisationName}"?\n\nThis will remove all related runtime data and cannot be undone.`
    );
    if (!confirmed) return;
    setDeleting(true);
    try {
      await deleteAssessment(assessment.id);
      await onDeleted?.();
    } catch (err) {
      window.alert(err instanceof Error ? err.message : "Failed to delete assessment.");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <li className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md hover:border-slate-300">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 flex-1">
          <h3 className="font-semibold text-slate-900 truncate">
            {assessment.organisationName}
          </h3>
          <div className="mt-1.5 space-y-0.5 text-xs text-slate-500">
            <p>Created: {formatDate(assessment.createdAt)}</p>
            <p>Last updated: {formatDate(assessment.updatedAt)}</p>
            <p>Last updated by: {formatActor(assessment)}</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:shrink-0">
          <Link
            href={`/saq/assessment/${assessment.id}`}
            className="inline-flex items-center rounded-md bg-emerald-600 px-2.5 py-1.5 text-xs font-medium text-white shadow-sm hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2"
          >
            Open / Resume
          </Link>
          <Link
            href={`/saq/dashboard/${assessment.id}`}
            className="inline-flex items-center rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 shadow-sm hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2"
          >
            Dashboard
          </Link>
          <Link
            href={`/saq/report/${assessment.id}`}
            className="inline-flex items-center rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 shadow-sm hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2"
          >
            Report
          </Link>
          {canManageTeam && (
            <Link
              href={`/saq/manage/${assessment.id}`}
              className="inline-flex items-center rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-medium text-slate-600 shadow-sm hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2"
            >
              Team & Access
            </Link>
          )}
          {canCreateVersion && (
            <Link
              href={`/saq/manage/${assessment.id}`}
              className="inline-flex items-center rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-medium text-slate-600 shadow-sm hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2"
            >
              Versions
            </Link>
          )}
          {canDelete && (
            <button
              type="button"
              onClick={() => void handleDelete()}
              disabled={deleting}
              className="inline-flex items-center rounded-md border border-red-200 bg-white px-2.5 py-1.5 text-xs font-medium text-red-700 shadow-sm hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:opacity-50"
            >
              {deleting ? "Deleting…" : "Delete"}
            </button>
          )}
        </div>
      </div>
    </li>
  );
}
