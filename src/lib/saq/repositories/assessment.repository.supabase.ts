/**
 * SAQ runtime persistence via Supabase.
 * Static questionnaire config remains file-based (questionnaire.data.json).
 * Runtime state is keyed by assessment version (assessment_versions + version_id).
 */

import { createClient } from "@/src/lib/supabase/client";
import type {
  AssessmentScopeSelectionRow,
  AssessmentAnswerRow,
  AssessmentActionItemRow,
  AssessmentVersionRow,
} from "@/src/lib/supabase/database.types";
import type {
  Assessment,
  AssessmentAccess,
  AssessmentAnswer,
  AssessmentCollaborator,
  AssessmentListItem,
  AssessmentVersion,
  ScopeSelection,
} from "../assessment.types";
import {
  canCreateAssessmentVersion,
  canDeleteAssessment,
  canEditAssessment,
  canManageCollaborators,
  canViewAssessment,
  isAssessmentRole,
  isAssessmentVersionStatus,
  type AssessmentRole,
} from "../permissions";
import type {
  ActionMetadata,
  AssessmentRepository,
  AssessmentVersionUpdate,
} from "./assessment.repository.interface";

type SupabaseBrowserClient = ReturnType<typeof createClient>;

async function requireSession(supabase: SupabaseBrowserClient) {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) {
    throw new Error("Authentication required");
  }
  return user;
}

function rowToAssessment(row: {
  id: string;
  organisation_name: string;
  created_at: string;
  updated_at: string;
}): Assessment {
  return {
    id: row.id,
    organisationName: row.organisation_name,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
}

function rowToVersion(row: AssessmentVersionRow): AssessmentVersion {
  const status = isAssessmentVersionStatus(row.status) ? row.status : "draft";
  return {
    id: row.id,
    assessmentId: row.assessment_id,
    versionNumber: row.version_number,
    label: row.label,
    status,
    createdBy: row.created_by,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
}

function scopeToRow(
  assessmentId: string,
  versionId: string,
  s: ScopeSelection
): Omit<AssessmentScopeSelectionRow, "id" | "created_at" | "updated_at"> {
  return {
    assessment_id: assessmentId,
    version_id: versionId,
    scope_id: s.scopeId,
    in_scope: s.inScope,
    target_capability: s.targetCapability ?? null,
  };
}

function rowToScope(assessmentId: string, row: AssessmentScopeSelectionRow): ScopeSelection {
  return {
    assessmentId,
    scopeId: row.scope_id,
    inScope: row.in_scope,
    targetCapability: row.target_capability as 1 | 2 | 3 | undefined,
  };
}

function answerToRow(
  assessmentId: string,
  versionId: string,
  a: AssessmentAnswer
): Omit<AssessmentAnswerRow, "id" | "created_at" | "updated_at"> {
  return {
    assessment_id: assessmentId,
    version_id: versionId,
    question_id: a.questionId,
    selected_score: a.selectedScore ?? null,
  };
}

function rowToAnswer(assessmentId: string, row: AssessmentAnswerRow): AssessmentAnswer {
  return {
    assessmentId,
    questionId: row.question_id,
    selectedScore: row.selected_score as 1 | 2 | 3 | undefined,
  };
}

/**
 * Resolves the current user’s role and assessment row. Returns null if the user has no access.
 */
export async function getAssessmentAccess(assessmentId: string): Promise<AssessmentAccess | null> {
  const supabase = createClient();
  const user = await requireSession(supabase);
  const { data, error } = await supabase
    .from("assessments")
    .select("id, organisation_name, owner_user_id, created_at, updated_at")
    .eq("id", assessmentId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;

  let myRole: AssessmentRole;
  if (data.owner_user_id === user.id) {
    myRole = "owner";
  } else {
    const { data: col, error: colError } = await supabase
      .from("assessment_collaborators")
      .select("role")
      .eq("assessment_id", assessmentId)
      .eq("user_id", user.id)
      .maybeSingle();
    if (colError) throw new Error(colError.message);
    if (!col?.role || !isAssessmentRole(col.role)) return null;
    myRole = col.role;
  }

  if (!canViewAssessment(myRole)) return null;

  return {
    assessment: rowToAssessment(data),
    myRole,
    ownerUserId: data.owner_user_id,
  };
}

export async function getAssessmentById(assessmentId: string): Promise<Assessment | null> {
  const access = await getAssessmentAccess(assessmentId);
  return access?.assessment ?? null;
}

/** Prefer `createAssessmentAction` (server) for new assessments so PostgREST receives the session JWT from cookies. */
export async function createAssessment(organisationName: string): Promise<Assessment> {
  const supabase = createClient();
  const user = await requireSession(supabase);
  await supabase.auth.getSession();
  const { data, error } = await supabase
    .from("assessments")
    .insert({ organisation_name: organisationName, owner_user_id: user.id })
    .select("id, organisation_name, created_at, updated_at")
    .single();
  if (error) throw new Error(error.message);

  const { error: collabError } = await supabase.from("assessment_collaborators").insert({
    assessment_id: data.id,
    user_id: user.id,
    role: "owner",
    invited_by: null,
  });
  if (collabError) throw new Error(collabError.message);

  const { error: verError } = await supabase.from("assessment_versions").insert({
    assessment_id: data.id,
    version_number: 1,
    label: null,
    status: "draft",
    created_by: user.id,
  });
  if (verError) throw new Error(verError.message);

  return rowToAssessment(data);
}

export async function deleteAssessment(assessmentId: string): Promise<void> {
  const access = await getAssessmentAccess(assessmentId);
  if (!access || !canDeleteAssessment(access.myRole)) {
    throw new Error("Only the owner can delete this assessment.");
  }
  const supabase = createClient();
  const { error } = await supabase
    .from("assessments")
    .delete()
    .eq("id", assessmentId)
    .eq("owner_user_id", access.ownerUserId);
  if (error) throw new Error(error.message);
}

export async function listAssessments(): Promise<AssessmentListItem[]> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase.rpc("list_my_assessments");
  if (error) throw new Error(error.message);

  type RpcRow = {
    id: string;
    organisation_name: string;
    created_at: string;
    updated_at: string;
    my_role: string;
    owner_user_id: string;
  };

  return (data as RpcRow[] | null ?? []).map((row) => {
    const role = isAssessmentRole(row.my_role) ? row.my_role : "viewer";
    return {
      id: row.id,
      organisationName: row.organisation_name,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
      ownerUserId: row.owner_user_id,
      myRole: role,
    };
  });
}

async function requireEditAccess(assessmentId: string): Promise<AssessmentAccess> {
  const access = await getAssessmentAccess(assessmentId);
  if (!access || !canEditAssessment(access.myRole)) {
    throw new Error("You do not have permission to edit this assessment.");
  }
  return access;
}

async function requireViewAccess(assessmentId: string): Promise<AssessmentAccess> {
  const access = await getAssessmentAccess(assessmentId);
  if (!access) {
    throw new Error("Assessment not found or access denied.");
  }
  return access;
}

async function requireVersionForAssessment(
  supabase: SupabaseBrowserClient,
  assessmentId: string,
  versionId: string
): Promise<AssessmentVersion> {
  const { data, error } = await supabase
    .from("assessment_versions")
    .select("*")
    .eq("id", versionId)
    .eq("assessment_id", assessmentId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Version not found for this assessment.");
  return rowToVersion(data as AssessmentVersionRow);
}

export async function listAssessmentVersions(assessmentId: string): Promise<AssessmentVersion[]> {
  await requireViewAccess(assessmentId);
  const supabase = createClient();
  const { data, error } = await supabase
    .from("assessment_versions")
    .select("*")
    .eq("assessment_id", assessmentId)
    .order("version_number", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => rowToVersion(row as AssessmentVersionRow));
}

export async function getLatestAssessmentVersion(assessmentId: string): Promise<AssessmentVersion | null> {
  await requireViewAccess(assessmentId);
  const supabase = createClient();
  const { data, error } = await supabase
    .from("assessment_versions")
    .select("*")
    .eq("assessment_id", assessmentId)
    .order("version_number", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  return rowToVersion(data as AssessmentVersionRow);
}

export async function getAssessmentVersion(
  assessmentId: string,
  versionId: string
): Promise<AssessmentVersion | null> {
  await requireViewAccess(assessmentId);
  const supabase = createClient();
  const { data, error } = await supabase
    .from("assessment_versions")
    .select("*")
    .eq("id", versionId)
    .eq("assessment_id", assessmentId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  return rowToVersion(data as AssessmentVersionRow);
}

/**
 * Creates a new version by copying scope, answers, and action metadata from the latest version.
 * Only owner or editor (see canCreateAssessmentVersion).
 */
export async function createAssessmentVersion(assessmentId: string, label?: string | null): Promise<AssessmentVersion> {
  const access = await getAssessmentAccess(assessmentId);
  if (!access || !canCreateAssessmentVersion(access.myRole)) {
    throw new Error("You do not have permission to create a new version.");
  }
  const supabase = createClient();
  const user = await requireSession(supabase);

  const latest = await getLatestAssessmentVersion(assessmentId);
  if (!latest) {
    throw new Error("No existing version to copy from.");
  }

  const nextNumber = latest.versionNumber + 1;

  const { data: newRow, error: insertErr } = await supabase
    .from("assessment_versions")
    .insert({
      assessment_id: assessmentId,
      version_number: nextNumber,
      label: label?.trim() || null,
      status: "draft",
      created_by: user.id,
    })
    .select("*")
    .single();
  if (insertErr) throw new Error(insertErr.message);
  const newVersion = rowToVersion(newRow as AssessmentVersionRow);

  const sourceVersionId = latest.id;

  const { data: scopeRows, error: scopeErr } = await supabase
    .from("assessment_scope_selections")
    .select("*")
    .eq("version_id", sourceVersionId);
  if (scopeErr) throw new Error(scopeErr.message);

  if (scopeRows?.length) {
    const inserts = scopeRows.map((r) => {
      const row = r as AssessmentScopeSelectionRow;
      return {
        assessment_id: assessmentId,
        version_id: newVersion.id,
        scope_id: row.scope_id,
        in_scope: row.in_scope,
        target_capability: row.target_capability,
      };
    });
    const { error: insScope } = await supabase.from("assessment_scope_selections").insert(inserts);
    if (insScope) throw new Error(insScope.message);
  }

  const { data: answerRows, error: ansErr } = await supabase
    .from("assessment_answers")
    .select("*")
    .eq("version_id", sourceVersionId);
  if (ansErr) throw new Error(ansErr.message);

  if (answerRows?.length) {
    const inserts = answerRows.map((r) => {
      const row = r as AssessmentAnswerRow;
      return {
        assessment_id: assessmentId,
        version_id: newVersion.id,
        question_id: row.question_id,
        selected_score: row.selected_score,
      };
    });
    const { error: insAns } = await supabase.from("assessment_answers").insert(inserts);
    if (insAns) throw new Error(insAns.message);
  }

  const { data: actionRows, error: actErr } = await supabase
    .from("assessment_action_items")
    .select("*")
    .eq("version_id", sourceVersionId);
  if (actErr) throw new Error(actErr.message);

  if (actionRows?.length) {
    const inserts = actionRows.map((r) => {
      const row = r as AssessmentActionItemRow;
      return {
        assessment_id: assessmentId,
        version_id: newVersion.id,
        question_id: row.question_id,
        effort_required: row.effort_required,
        leader: row.leader,
        deadline: row.deadline,
        status: row.status,
        remarks: row.remarks,
      };
    });
    const { error: insAct } = await supabase.from("assessment_action_items").insert(inserts);
    if (insAct) throw new Error(insAct.message);
  }

  await supabase.from("assessments").update({ updated_at: new Date().toISOString() }).eq("id", assessmentId);

  return newVersion;
}

export async function updateAssessmentVersion(
  assessmentId: string,
  versionId: string,
  patch: AssessmentVersionUpdate
): Promise<void> {
  await requireEditAccess(assessmentId);
  const supabase = createClient();
  await requireVersionForAssessment(supabase, assessmentId, versionId);

  const row: Record<string, unknown> = {};
  if ("label" in patch) row.label = patch.label;
  if (patch.status !== undefined) row.status = patch.status;

  if (Object.keys(row).length === 0) return;

  const { error } = await supabase
    .from("assessment_versions")
    .update(row)
    .eq("id", versionId)
    .eq("assessment_id", assessmentId);
  if (error) throw new Error(error.message);
  await supabase.from("assessments").update({ updated_at: new Date().toISOString() }).eq("id", assessmentId);
}

export async function saveScopeSelections(
  assessmentId: string,
  versionId: string,
  scopeSelections: ScopeSelection[]
): Promise<void> {
  await requireEditAccess(assessmentId);
  const supabase = createClient();
  await requireVersionForAssessment(supabase, assessmentId, versionId);

  const rows = scopeSelections.map((s) => scopeToRow(assessmentId, versionId, s));
  const { error } = await supabase.from("assessment_scope_selections").upsert(rows, {
    onConflict: "version_id,scope_id",
  });
  if (error) throw new Error(error.message);
  await supabase.from("assessments").update({ updated_at: new Date().toISOString() }).eq("id", assessmentId);
}

export async function loadScopeSelections(
  assessmentId: string,
  versionId: string
): Promise<ScopeSelection[]> {
  await requireViewAccess(assessmentId);
  const supabase = createClient();
  await requireVersionForAssessment(supabase, assessmentId, versionId);

  const { data, error } = await supabase
    .from("assessment_scope_selections")
    .select("*")
    .eq("assessment_id", assessmentId)
    .eq("version_id", versionId);
  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => rowToScope(assessmentId, row as AssessmentScopeSelectionRow));
}

export async function saveAnswers(
  assessmentId: string,
  versionId: string,
  answers: AssessmentAnswer[]
): Promise<void> {
  await requireEditAccess(assessmentId);
  const supabase = createClient();
  await requireVersionForAssessment(supabase, assessmentId, versionId);

  const rows = answers.map((a) => answerToRow(assessmentId, versionId, a));
  const { error } = await supabase.from("assessment_answers").upsert(rows, {
    onConflict: "version_id,question_id",
  });
  if (error) throw new Error(error.message);
  await supabase.from("assessments").update({ updated_at: new Date().toISOString() }).eq("id", assessmentId);
}

export async function loadAnswers(assessmentId: string, versionId: string): Promise<AssessmentAnswer[]> {
  await requireViewAccess(assessmentId);
  const supabase = createClient();
  await requireVersionForAssessment(supabase, assessmentId, versionId);

  const { data, error } = await supabase
    .from("assessment_answers")
    .select("*")
    .eq("assessment_id", assessmentId)
    .eq("version_id", versionId);
  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => rowToAnswer(assessmentId, row as AssessmentAnswerRow));
}

export async function saveActionMetadata(
  assessmentId: string,
  versionId: string,
  actionMetadataByQuestionId: Record<string, ActionMetadata>
): Promise<void> {
  await requireEditAccess(assessmentId);
  const supabase = createClient();
  await requireVersionForAssessment(supabase, assessmentId, versionId);

  const rows = Object.entries(actionMetadataByQuestionId).map(([question_id, m]) => ({
    assessment_id: assessmentId,
    version_id: versionId,
    question_id,
    effort_required: m.effortRequired ?? null,
    leader: m.leader ?? null,
    deadline: m.deadline ?? null,
    status: m.status ?? null,
    remarks: m.remarks ?? null,
  }));
  if (rows.length === 0) return;
  const { error } = await supabase.from("assessment_action_items").upsert(rows, {
    onConflict: "version_id,question_id",
  });
  if (error) throw new Error(error.message);
  await supabase.from("assessments").update({ updated_at: new Date().toISOString() }).eq("id", assessmentId);
}

export async function loadActionMetadata(
  assessmentId: string,
  versionId: string
): Promise<Record<string, ActionMetadata>> {
  await requireViewAccess(assessmentId);
  const supabase = createClient();
  await requireVersionForAssessment(supabase, assessmentId, versionId);

  const { data, error } = await supabase
    .from("assessment_action_items")
    .select("*")
    .eq("assessment_id", assessmentId)
    .eq("version_id", versionId);
  if (error) throw new Error(error.message);
  const out: Record<string, ActionMetadata> = {};
  for (const row of data ?? []) {
    const r = row as AssessmentActionItemRow;
    out[r.question_id] = {
      effortRequired: r.effort_required as ActionMetadata["effortRequired"],
      leader: r.leader ?? undefined,
      deadline: r.deadline ?? undefined,
      status: r.status as ActionMetadata["status"],
      remarks: r.remarks ?? undefined,
    };
  }
  return out;
}

export async function listAssessmentCollaborators(assessmentId: string): Promise<AssessmentCollaborator[]> {
  await requireViewAccess(assessmentId);
  const supabase = createClient();
  const { data, error } = await supabase.rpc("list_assessment_collaborators", {
    p_assessment_id: assessmentId,
  });
  if (error) throw new Error(error.message);

  type RpcRow = {
    id: string;
    user_id: string;
    email: string;
    role: string;
    invited_by: string | null;
    created_at: string;
  };

  return (data as RpcRow[] | null ?? []).map((row) => ({
    id: row.id,
    userId: row.user_id,
    email: row.email,
    role: isAssessmentRole(row.role) ? row.role : "viewer",
    invitedBy: row.invited_by,
    createdAt: new Date(row.created_at),
  }));
}

export async function addCollaboratorByEmail(
  assessmentId: string,
  email: string,
  role: Exclude<AssessmentRole, "owner">
): Promise<void> {
  const access = await getAssessmentAccess(assessmentId);
  if (!access || !canManageCollaborators(access.myRole)) {
    throw new Error("Only the owner can add collaborators.");
  }
  const supabase = createClient();
  const { error } = await supabase.rpc("add_assessment_collaborator_by_email", {
    p_assessment_id: assessmentId,
    p_email: email.trim().toLowerCase(),
    p_role: role,
  });
  if (error) throw new Error(error.message);
}

export async function updateCollaboratorRole(
  assessmentId: string,
  collaboratorRowId: string,
  role: Exclude<AssessmentRole, "owner">
): Promise<void> {
  const access = await getAssessmentAccess(assessmentId);
  if (!access || !canManageCollaborators(access.myRole)) {
    throw new Error("Only the owner can change collaborator roles.");
  }
  const supabase = createClient();
  const { error } = await supabase
    .from("assessment_collaborators")
    .update({ role })
    .eq("id", collaboratorRowId)
    .eq("assessment_id", assessmentId);
  if (error) throw new Error(error.message);
}

export async function removeCollaborator(assessmentId: string, collaboratorRowId: string): Promise<void> {
  const access = await getAssessmentAccess(assessmentId);
  if (!access || !canManageCollaborators(access.myRole)) {
    throw new Error("Only the owner can remove collaborators.");
  }
  const supabase = createClient();
  const { error } = await supabase
    .from("assessment_collaborators")
    .delete()
    .eq("id", collaboratorRowId)
    .eq("assessment_id", assessmentId);
  if (error) throw new Error(error.message);
}

export const assessmentRuntimeRepository: AssessmentRepository = {
  getAssessmentAccess,
  createAssessment,
  deleteAssessment,
  getAssessmentById,
  listAssessments,
  saveScopeSelections,
  loadScopeSelections,
  saveAnswers,
  loadAnswers,
  saveActionMetadata,
  loadActionMetadata,
  listAssessmentVersions,
  getLatestAssessmentVersion,
  getAssessmentVersion,
  createAssessmentVersion,
  updateAssessmentVersion,
  listAssessmentCollaborators,
  addCollaboratorByEmail,
  updateCollaboratorRole,
  removeCollaborator,
};

