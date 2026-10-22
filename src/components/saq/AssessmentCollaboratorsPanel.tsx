"use client";

import { useCallback, useEffect, useState } from "react";
import type { AssessmentCollaborator } from "@/src/lib/saq/assessment.types";
import {
  addCollaboratorByEmail,
  listAssessmentCollaborators,
  removeCollaborator,
  updateCollaboratorRole,
} from "@/src/lib/saq/assessment.repository";
import { canManageCollaborators } from "@/src/lib/saq/permissions";
import type { AssessmentRole } from "@/src/lib/saq/permissions";

const ADD_ROLES: Exclude<AssessmentRole, "owner">[] = ["editor", "reviewer", "viewer"];

function roleLabel(role: AssessmentRole): string {
  switch (role) {
    case "owner":
      return "Owner";
    case "editor":
      return "Editor";
    case "reviewer":
      return "Reviewer";
    case "viewer":
      return "Viewer";
    default:
      return role;
  }
}

function formatJoinedDate(value: Date | string): string {
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(undefined, { dateStyle: "medium" });
}

interface AssessmentCollaboratorsPanelProps {
  assessmentId: string;
  myRole: AssessmentRole;
}

export function AssessmentCollaboratorsPanel({
  assessmentId,
  myRole,
}: AssessmentCollaboratorsPanelProps) {
  const [rows, setRows] = useState<AssessmentCollaborator[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [addRole, setAddRole] = useState<Exclude<AssessmentRole, "owner">>("editor");
  const [adding, setAdding] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const canManage = canManageCollaborators(myRole);

  const refresh = useCallback(async () => {
    setError(null);
    const list = await listAssessmentCollaborators(assessmentId);
    setRows(list);
  }, [assessmentId]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    refresh()
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load collaborators");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [refresh]);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!canManage) return;
    const em = email.trim().toLowerCase();
    if (!em) return;
    setAdding(true);
    setError(null);
    try {
      await addCollaboratorByEmail(assessmentId, em, addRole);
      setEmail("");
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not add collaborator");
    } finally {
      setAdding(false);
    }
  }

  async function handleRoleChange(id: string, role: Exclude<AssessmentRole, "owner">) {
    if (!canManage) return;
    setBusyId(id);
    setError(null);
    try {
      await updateCollaboratorRole(assessmentId, id, role);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update role");
    } finally {
      setBusyId(null);
    }
  }

  async function handleRemove(id: string, role: AssessmentRole) {
    if (!canManage || role === "owner") return;
    setBusyId(id);
    setError(null);
    try {
      await removeCollaborator(assessmentId, id);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not remove collaborator");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <section
      className="mt-8 rounded-lg border border-slate-200 bg-white shadow-sm"
      aria-labelledby="collab-heading"
    >
      <div className="border-b border-slate-200 px-4 py-3 sm:px-6">
        <h2 id="collab-heading" className="text-lg font-semibold text-slate-900">
          Team &amp; access
        </h2>
        <p className="mt-1 text-sm text-slate-600">
          People who can view or edit this assessment. The owner can invite others by email (they must already have an account).
        </p>
      </div>
      <div className="px-4 py-4 sm:px-6">
        {error && (
          <p className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800" role="alert">
            {error}
          </p>
        )}

        {canManage && (
          <form onSubmit={handleAdd} className="mb-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
            <div className="min-w-[200px] flex-1">
              <label htmlFor="collab-email" className="block text-xs font-medium text-slate-700">
                Email address
              </label>
              <input
                id="collab-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="colleague@example.org"
                className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label htmlFor="collab-role" className="block text-xs font-medium text-slate-700">
                Role
              </label>
              <select
                id="collab-role"
                value={addRole}
                onChange={(e) => setAddRole(e.target.value as Exclude<AssessmentRole, "owner">)}
                className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-emerald-500 sm:w-40"
              >
                {ADD_ROLES.map((r) => (
                  <option key={r} value={r}>
                    {roleLabel(r)}
                  </option>
                ))}
              </select>
            </div>
            <button
              type="submit"
              disabled={adding || !email.trim()}
              className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-50"
            >
              {adding ? "Adding…" : "Add"}
            </button>
          </form>
        )}

        {loading ? (
          <p className="text-sm text-slate-500">Loading team…</p>
        ) : !canManage ? (
          <p className="text-sm text-slate-600">
            {rows.length} team member{rows.length === 1 ? "" : "s"}. Only the owner can change access.
          </p>
        ) : null}

        {!loading && rows.length > 0 && (
          <ul className="divide-y divide-slate-200 rounded-lg border border-slate-200">
            {rows.map((row) => (
              <li key={row.id} className="flex flex-col gap-4 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-slate-900">{row.email}</p>
                  <p className="mt-0.5 text-xs text-slate-500">
                    Joined {formatJoinedDate(row.createdAt)}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {row.role === "owner" ? (
                    <span className="rounded bg-slate-200 px-2 py-1 text-xs font-medium text-slate-800">
                      {roleLabel("owner")}
                    </span>
                  ) : canManage ? (
                    <select
                      disabled={busyId === row.id}
                      value={row.role}
                      onChange={(e) =>
                        handleRoleChange(
                          row.id,
                          e.target.value as Exclude<AssessmentRole, "owner">
                        )
                      }
                      className="rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-sm text-slate-900 focus:border-emerald-500 disabled:opacity-50"
                    >
                      {ADD_ROLES.map((r) => (
                        <option key={r} value={r}>
                          {roleLabel(r)}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <span className="rounded bg-slate-100 px-2 py-1 text-xs font-medium text-slate-800">
                      {roleLabel(row.role)}
                    </span>
                  )}
                  {canManage && row.role !== "owner" && (
                    <button
                      type="button"
                      disabled={busyId === row.id}
                      onClick={() => void handleRemove(row.id, row.role)}
                      className="rounded-lg border border-red-200 bg-white px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-50"
                    >
                      Remove
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
