import { and, asc, desc, eq, isNull, or } from "drizzle-orm";
import { randomUUID } from "crypto";
import {
  assessmentActionItems,
  assessmentAnswers,
  assessmentCollaborators,
  assessmentEvidenceFiles,
  assessmentQuestionEvidence,
  assessments,
  assessmentScopeSelections,
  assessmentVersions,
  profiles,
  users,
} from "../../../../drizzle/schema";
import { getDb } from "@/src/lib/db/drizzle";
import { requireCurrentUserId } from "@/src/lib/auth/current-user";
import { isIndustry, isOperatingModel } from "@/src/lib/auth/organisation-profile";
import type {
  Assessment,
  AssessmentAccess,
  AssessmentAnswer,
  AssessmentCollaborator,
  AssessmentListItem,
  AssessmentVersion,
  EvidenceFileRecord,
  EvidenceState,
  QuestionEvidence,
  ScopeSelection,
} from "../assessment.types";
import {
  canCreateAssessmentVersion,
  canDeleteAssessment,
  canEditAssessment,
  canManageCollaborators,
  canViewAssessment,
  isAssignableCollaboratorRole,
  isAssessmentRole,
  isAssessmentVersionStatus,
  type AssessmentRole,
} from "../permissions";
import { getQuestionById } from "../questionnaire.repository";
import { evidenceItemKey } from "../engine/evidence";
import {
  displayFileName,
  evidenceContentType,
  evidenceExtension,
  readEvidenceBytes,
  removeEvidenceFile,
  removeEvidenceTree,
  writeEvidenceBytes,
  EVIDENCE_MAX_BYTES,
} from "../evidence-storage";
import type {
  ActionMetadata,
  AssessmentContextUpdate,
  AssessmentRepository,
  AssessmentVersionUpdate,
} from "./assessment.repository.interface";

function toAssessment(row: typeof assessments.$inferSelect): Assessment {
  return {
    id: row.id,
    organisationName: row.organisationName,
    industry: row.industry,
    operatingModel: row.operatingModel,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function toVersion(row: typeof assessmentVersions.$inferSelect): AssessmentVersion {
  const status = isAssessmentVersionStatus(row.status) ? row.status : "draft";
  return {
    id: row.id,
    assessmentId: row.assessmentId,
    versionNumber: row.versionNumber,
    label: row.label,
    status,
    createdBy: row.createdBy,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

async function requireAssessmentVersion(assessmentId: string, versionId: string) {
  const db = getDb();
  const [row] = await db
    .select()
    .from(assessmentVersions)
    .where(and(eq(assessmentVersions.id, versionId), eq(assessmentVersions.assessmentId, assessmentId)))
    .limit(1);
  if (!row) {
    throw new Error("Version not found for this assessment.");
  }
  return row;
}

const ROLE_RANK: Record<AssessmentRole, number> = {
  owner: 4,
  editor: 3,
  reviewer: 2,
  viewer: 1,
};

async function getAssessmentAccessRole(
  assessmentId: string,
  userId: string,
  versionId?: string | null
): Promise<AssessmentRole | null> {
  const db = getDb();
  const [assessment] = await db
    .select({
      ownerUserId: assessments.ownerUserId,
    })
    .from(assessments)
    .where(eq(assessments.id, assessmentId))
    .limit(1);
  if (!assessment) return null;
  if (assessment.ownerUserId === userId) return "owner";

  const rows = await db
    .select({ role: assessmentCollaborators.role, versionId: assessmentCollaborators.versionId })
    .from(assessmentCollaborators)
    .where(and(eq(assessmentCollaborators.assessmentId, assessmentId), eq(assessmentCollaborators.userId, userId)));

  const roles = rows.filter((row) => isAssessmentRole(row.role));
  if (versionId) {
    const specific = roles.find((row) => row.versionId === versionId);
    if (specific) return specific.role;
    const general = roles.find((row) => row.versionId == null);
    return general?.role ?? null;
  }

  let best: AssessmentRole | null = null;
  for (const row of roles) {
    if (!best || ROLE_RANK[row.role] > ROLE_RANK[best]) best = row.role;
  }
  return best;
}

export async function getAssessmentAccess(assessmentId: string): Promise<AssessmentAccess | null> {
  const userId = await requireCurrentUserId();
  const role = await getAssessmentAccessRole(assessmentId, userId);
  if (!role || !canViewAssessment(role)) return null;
  const db = getDb();
  const [row] = await db.select().from(assessments).where(eq(assessments.id, assessmentId)).limit(1);
  if (!row) return null;
  return {
    assessment: toAssessment(row),
    myRole: role,
    ownerUserId: row.ownerUserId,
  };
}

async function requireViewAccess(assessmentId: string, versionId?: string | null) {
  const userId = await requireCurrentUserId();
  const role = await getAssessmentAccessRole(assessmentId, userId, versionId);
  if (!role || !canViewAssessment(role)) {
    throw new Error("Assessment not found or access denied.");
  }
  return { userId, role };
}

async function requireEditAccess(assessmentId: string, versionId?: string | null) {
  const userId = await requireCurrentUserId();
  const role = await getAssessmentAccessRole(assessmentId, userId, versionId);
  if (!role || !canEditAssessment(role)) {
    throw new Error("You do not have permission to edit this assessment.");
  }
  return { userId, role };
}

async function requireDraftEdit(assessmentId: string, versionId: string) {
  const access = await requireEditAccess(assessmentId, versionId);
  const version = await requireAssessmentVersion(assessmentId, versionId);
  if (version.status !== "draft") {
    throw new Error("Only a draft version can be edited.");
  }
  return access;
}

export async function createAssessment(organisationName: string): Promise<Assessment> {
  const db = getDb();
  const ownerUserId = await requireCurrentUserId();
  const [profile] = await db
    .select({ industry: profiles.industry })
    .from(profiles)
    .where(eq(profiles.id, ownerUserId))
    .limit(1);
  const [created] = await db
    .insert(assessments)
    .values({
      organisationName,
      ownerUserId,
      industry: profile?.industry ?? null,
    })
    .returning();
  if (!created) {
    throw new Error("Failed to create assessment");
  }

  await db.insert(assessmentCollaborators).values({
    assessmentId: created.id,
    userId: ownerUserId,
    role: "owner",
    invitedBy: null,
  });

  await db.insert(assessmentVersions).values({
    assessmentId: created.id,
    versionNumber: 1,
    label: null,
    status: "draft",
    createdBy: ownerUserId,
  });

  return toAssessment(created);
}

export async function updateAssessmentContext(
  assessmentId: string,
  patch: AssessmentContextUpdate
): Promise<void> {
  await requireEditAccess(assessmentId);
  if (patch.industry && !isIndustry(patch.industry)) {
    throw new Error("Select a known industry.");
  }
  if (patch.operatingModel && !isOperatingModel(patch.operatingModel)) {
    throw new Error("Select a known operating model.");
  }
  const updates: { industry?: string | null; operatingModel?: string | null; updatedAt: Date } = {
    updatedAt: new Date(),
  };
  if ("industry" in patch) updates.industry = patch.industry ?? null;
  if ("operatingModel" in patch) updates.operatingModel = patch.operatingModel ?? null;
  const db = getDb();
  await db.update(assessments).set(updates).where(eq(assessments.id, assessmentId));
}

export async function deleteAssessment(assessmentId: string): Promise<void> {
  const { userId, role } = await requireViewAccess(assessmentId);
  if (!canDeleteAssessment(role)) {
    throw new Error("Only the owner can delete this assessment.");
  }
  const db = getDb();
  await db
    .delete(assessments)
    .where(and(eq(assessments.id, assessmentId), eq(assessments.ownerUserId, userId)));
  await removeEvidenceTree(assessmentId).catch(() => undefined);
}

export async function getAssessmentById(assessmentId: string): Promise<Assessment | null> {
  const access = await getAssessmentAccess(assessmentId);
  return access?.assessment ?? null;
}

export async function listAssessments(): Promise<AssessmentListItem[]> {
  const db = getDb();
  const userId = await requireCurrentUserId();
  const rows = await db
    .select({
      id: assessments.id,
      organisationName: assessments.organisationName,
      createdAt: assessments.createdAt,
      updatedAt: assessments.updatedAt,
      ownerUserId: assessments.ownerUserId,
      collaboratorRole: assessmentCollaborators.role,
    })
    .from(assessments)
    .leftJoin(
      assessmentCollaborators,
      and(eq(assessmentCollaborators.assessmentId, assessments.id), eq(assessmentCollaborators.userId, userId))
    )
    .where(
      or(eq(assessments.ownerUserId, userId), eq(assessmentCollaborators.userId, userId))
    )
    .orderBy(desc(assessments.updatedAt), desc(assessments.createdAt));

  return rows.map((row) => {
    const myRole = row.ownerUserId === userId ? "owner" : row.collaboratorRole ?? "viewer";
    return {
      id: row.id,
      organisationName: row.organisationName,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      ownerUserId: row.ownerUserId,
      myRole: isAssessmentRole(myRole) ? myRole : "viewer",
    };
  });
}

export async function saveScopeSelections(
  assessmentId: string,
  versionId: string,
  scopeSelections: ScopeSelection[]
): Promise<void> {
  await requireDraftEdit(assessmentId, versionId);
  const db = getDb();
  for (const s of scopeSelections) {
    await db
      .insert(assessmentScopeSelections)
      .values({
        assessmentId,
        versionId,
        scopeId: s.scopeId,
        inScope: s.inScope,
        targetCapability: s.targetCapability ?? null,
      })
      .onConflictDoUpdate({
        target: [assessmentScopeSelections.versionId, assessmentScopeSelections.scopeId],
        set: {
          inScope: s.inScope,
          targetCapability: s.targetCapability ?? null,
          updatedAt: new Date(),
        },
      });
  }
  await db.update(assessments).set({ updatedAt: new Date() }).where(eq(assessments.id, assessmentId));
}

export async function loadScopeSelections(
  assessmentId: string,
  versionId: string
): Promise<ScopeSelection[]> {
  await requireViewAccess(assessmentId, versionId);
  const db = getDb();
  await requireAssessmentVersion(assessmentId, versionId);
  const rows = await db
    .select()
    .from(assessmentScopeSelections)
    .where(and(eq(assessmentScopeSelections.assessmentId, assessmentId), eq(assessmentScopeSelections.versionId, versionId)))
    .orderBy(asc(assessmentScopeSelections.scopeId));

  return rows.map((row) => ({
    assessmentId,
    scopeId: row.scopeId,
    inScope: row.inScope,
    targetCapability: (row.targetCapability ?? undefined) as 1 | 2 | 3 | undefined,
  }));
}

export async function saveAnswers(
  assessmentId: string,
  versionId: string,
  answers: AssessmentAnswer[]
): Promise<void> {
  await requireDraftEdit(assessmentId, versionId);
  const db = getDb();
  for (const a of answers) {
    await db
      .insert(assessmentAnswers)
      .values({
        assessmentId,
        versionId,
        questionId: a.questionId,
        selectedScore: a.selectedScore ?? null,
      })
      .onConflictDoUpdate({
        target: [assessmentAnswers.versionId, assessmentAnswers.questionId],
        set: {
          selectedScore: a.selectedScore ?? null,
          updatedAt: new Date(),
        },
      });
  }
  await db.update(assessments).set({ updatedAt: new Date() }).where(eq(assessments.id, assessmentId));
}

export async function loadAnswers(assessmentId: string, versionId: string): Promise<AssessmentAnswer[]> {
  await requireViewAccess(assessmentId, versionId);
  const db = getDb();
  await requireAssessmentVersion(assessmentId, versionId);
  const rows = await db
    .select()
    .from(assessmentAnswers)
    .where(and(eq(assessmentAnswers.assessmentId, assessmentId), eq(assessmentAnswers.versionId, versionId)))
    .orderBy(asc(assessmentAnswers.questionId));

  return rows.map((row) => ({
    assessmentId,
    questionId: row.questionId,
    selectedScore: (row.selectedScore ?? undefined) as 1 | 2 | 3 | undefined,
  }));
}

export async function saveActionMetadata(
  assessmentId: string,
  versionId: string,
  actionMetadataByQuestionId: Record<string, ActionMetadata>
): Promise<void> {
  await requireDraftEdit(assessmentId, versionId);
  const db = getDb();
  for (const [questionId, m] of Object.entries(actionMetadataByQuestionId)) {
    await db
      .insert(assessmentActionItems)
      .values({
        assessmentId,
        versionId,
        questionId,
        effortRequired: m.effortRequired ?? null,
        leader: m.leader ?? null,
        deadline: m.deadline ?? null,
        status: m.status ?? null,
        remarks: m.remarks ?? null,
      })
      .onConflictDoUpdate({
        target: [assessmentActionItems.versionId, assessmentActionItems.questionId],
        set: {
          effortRequired: m.effortRequired ?? null,
          leader: m.leader ?? null,
          deadline: m.deadline ?? null,
          status: m.status ?? null,
          remarks: m.remarks ?? null,
          updatedAt: new Date(),
        },
      });
  }
  await db.update(assessments).set({ updatedAt: new Date() }).where(eq(assessments.id, assessmentId));
}

export async function loadActionMetadata(
  assessmentId: string,
  versionId: string
): Promise<Record<string, ActionMetadata>> {
  await requireViewAccess(assessmentId, versionId);
  const db = getDb();
  await requireAssessmentVersion(assessmentId, versionId);
  const rows = await db
    .select()
    .from(assessmentActionItems)
    .where(and(eq(assessmentActionItems.assessmentId, assessmentId), eq(assessmentActionItems.versionId, versionId)));

  const out: Record<string, ActionMetadata> = {};
  for (const row of rows) {
    out[row.questionId] = {
      effortRequired: row.effortRequired ?? undefined,
      leader: row.leader ?? undefined,
      deadline: row.deadline ?? undefined,
      status: row.status ?? undefined,
      remarks: row.remarks ?? undefined,
    };
  }
  return out;
}

export async function listAssessmentVersions(assessmentId: string): Promise<AssessmentVersion[]> {
  const { userId, role } = await requireViewAccess(assessmentId);
  const db = getDb();
  const rows = await db
    .select()
    .from(assessmentVersions)
    .where(eq(assessmentVersions.assessmentId, assessmentId))
    .orderBy(asc(assessmentVersions.versionNumber));
  if (role === "owner") return rows.map(toVersion);

  const grants = await db
    .select({ versionId: assessmentCollaborators.versionId })
    .from(assessmentCollaborators)
    .where(and(eq(assessmentCollaborators.assessmentId, assessmentId), eq(assessmentCollaborators.userId, userId)));
  if (grants.some((grant) => grant.versionId == null)) return rows.map(toVersion);
  const allowed = new Set(grants.map((grant) => grant.versionId).filter((id): id is string => Boolean(id)));
  return rows.filter((row) => allowed.has(row.id)).map(toVersion);
}

export async function getLatestAssessmentVersion(
  assessmentId: string
): Promise<AssessmentVersion | null> {
  await requireViewAccess(assessmentId);
  const db = getDb();
  const [row] = await db
    .select()
    .from(assessmentVersions)
    .where(eq(assessmentVersions.assessmentId, assessmentId))
    .orderBy(desc(assessmentVersions.versionNumber))
    .limit(1);
  return row ? toVersion(row) : null;
}

export async function getAssessmentVersion(
  assessmentId: string,
  versionId: string
): Promise<AssessmentVersion | null> {
  await requireViewAccess(assessmentId, versionId);
  const db = getDb();
  const [row] = await db
    .select()
    .from(assessmentVersions)
    .where(and(eq(assessmentVersions.id, versionId), eq(assessmentVersions.assessmentId, assessmentId)))
    .limit(1);
  return row ? toVersion(row) : null;
}

export async function createAssessmentVersion(
  assessmentId: string,
  label?: string | null
): Promise<AssessmentVersion> {
  const { userId, role } = await requireEditAccess(assessmentId);
  if (!canCreateAssessmentVersion(role)) {
    throw new Error("You do not have permission to create a new version.");
  }

  const db = getDb();
  const latest = await getLatestAssessmentVersion(assessmentId);
  if (!latest) {
    throw new Error("No existing version to copy from.");
  }
  const nextNumber = latest.versionNumber + 1;

  const [newVersionRow] = await db
    .insert(assessmentVersions)
    .values({
      assessmentId,
      versionNumber: nextNumber,
      label: label?.trim() || null,
      status: "draft",
      createdBy: userId,
    })
    .returning();
  if (!newVersionRow) {
    throw new Error("Failed to create new version.");
  }

  const sourceVersionId = latest.id;
  const targetVersionId = newVersionRow.id;

  const sourceScopes = await db
    .select()
    .from(assessmentScopeSelections)
    .where(eq(assessmentScopeSelections.versionId, sourceVersionId));
  if (sourceScopes.length) {
    await db.insert(assessmentScopeSelections).values(
      sourceScopes.map((row) => ({
        assessmentId: row.assessmentId,
        versionId: targetVersionId,
        scopeId: row.scopeId,
        inScope: row.inScope,
        targetCapability: row.targetCapability,
      }))
    );
  }

  const sourceAnswers = await db
    .select()
    .from(assessmentAnswers)
    .where(eq(assessmentAnswers.versionId, sourceVersionId));
  if (sourceAnswers.length) {
    await db.insert(assessmentAnswers).values(
      sourceAnswers.map((row) => ({
        assessmentId: row.assessmentId,
        versionId: targetVersionId,
        questionId: row.questionId,
        selectedScore: row.selectedScore,
      }))
    );
  }

  const sourceActions = await db
    .select()
    .from(assessmentActionItems)
    .where(eq(assessmentActionItems.versionId, sourceVersionId));
  if (sourceActions.length) {
    await db.insert(assessmentActionItems).values(
      sourceActions.map((row) => ({
        assessmentId: row.assessmentId,
        versionId: targetVersionId,
        questionId: row.questionId,
        effortRequired: row.effortRequired,
        leader: row.leader,
        deadline: row.deadline,
        status: row.status,
        remarks: row.remarks,
      }))
    );
  }

  await db.update(assessments).set({ updatedAt: new Date() }).where(eq(assessments.id, assessmentId));
  return toVersion(newVersionRow);
}

export async function updateAssessmentVersion(
  assessmentId: string,
  versionId: string,
  patch: AssessmentVersionUpdate
): Promise<void> {
  await requireEditAccess(assessmentId, versionId);
  await requireAssessmentVersion(assessmentId, versionId);
  const db = getDb();
  const updates: { label?: string | null; status?: typeof assessmentVersions.$inferInsert.status } = {};
  if ("label" in patch) updates.label = patch.label ?? null;
  if (patch.status !== undefined) updates.status = patch.status;
  if (Object.keys(updates).length === 0) return;
  await db
    .update(assessmentVersions)
    .set({ ...updates, updatedAt: new Date() })
    .where(and(eq(assessmentVersions.id, versionId), eq(assessmentVersions.assessmentId, assessmentId)));
  await db.update(assessments).set({ updatedAt: new Date() }).where(eq(assessments.id, assessmentId));
}

export async function deleteAssessmentVersion(assessmentId: string, versionId: string): Promise<void> {
  const { role } = await requireViewAccess(assessmentId);
  if (!canDeleteAssessment(role)) {
    throw new Error("Only the owner can delete a version.");
  }
  const db = getDb();
  const existing = await db
    .select({ id: assessmentVersions.id })
    .from(assessmentVersions)
    .where(eq(assessmentVersions.assessmentId, assessmentId));
  if (!existing.some((row) => row.id === versionId)) {
    throw new Error("Version not found.");
  }
  if (existing.length <= 1) {
    throw new Error("The only remaining version cannot be deleted.");
  }
  await db
    .delete(assessmentVersions)
    .where(and(eq(assessmentVersions.id, versionId), eq(assessmentVersions.assessmentId, assessmentId)));
  await db.update(assessments).set({ updatedAt: new Date() }).where(eq(assessments.id, assessmentId));
  await removeEvidenceTree(assessmentId, versionId).catch(() => undefined);
}

export async function listAssessmentCollaborators(
  assessmentId: string
): Promise<AssessmentCollaborator[]> {
  await requireViewAccess(assessmentId);
  const db = getDb();
  const rows = await db
    .select({
      id: assessmentCollaborators.id,
      userId: assessmentCollaborators.userId,
      role: assessmentCollaborators.role,
      versionId: assessmentCollaborators.versionId,
      invitedBy: assessmentCollaborators.invitedBy,
      createdAt: assessmentCollaborators.createdAt,
      email: users.email,
      name: users.name,
    })
    .from(assessmentCollaborators)
    .innerJoin(users, eq(users.id, assessmentCollaborators.userId))
    .where(eq(assessmentCollaborators.assessmentId, assessmentId))
    .orderBy(asc(assessmentCollaborators.createdAt));

  return rows.map((row) => ({
    id: row.id,
    userId: row.userId,
    email: row.email,
    name: row.name,
    role: isAssessmentRole(row.role) ? row.role : "viewer",
    versionId: row.versionId,
    invitedBy: row.invitedBy,
    createdAt: row.createdAt,
  }));
}

export async function addCollaboratorByEmail(
  assessmentId: string,
  email: string,
  role: Exclude<AssessmentRole, "owner">,
  versionId?: string | null
): Promise<void> {
  const { userId, role: myRole } = await requireEditAccess(assessmentId);
  if (!canManageCollaborators(myRole)) {
    throw new Error("Only the owner can add collaborators.");
  }
  if (!isAssignableCollaboratorRole(role)) {
    throw new Error("Role must be editor, reviewer, or viewer.");
  }
  const db = getDb();
  const normalizedEmail = email.trim().toLowerCase();
  const scopedVersionId = versionId?.trim() ? versionId : null;
  if (scopedVersionId) {
    await requireAssessmentVersion(assessmentId, scopedVersionId);
  }
  const [target] = await db.select().from(users).where(eq(users.email, normalizedEmail)).limit(1);
  if (!target) {
    throw new Error("user not found for this email");
  }
  if (target.id === userId) {
    throw new Error("owner already has access");
  }
  const existingWhere = and(
    eq(assessmentCollaborators.assessmentId, assessmentId),
    eq(assessmentCollaborators.userId, target.id),
    scopedVersionId
      ? eq(assessmentCollaborators.versionId, scopedVersionId)
      : isNull(assessmentCollaborators.versionId)
  );
  const [existing] = await db
    .select({ id: assessmentCollaborators.id })
    .from(assessmentCollaborators)
    .where(existingWhere)
    .limit(1);
  if (existing) {
    await db
      .update(assessmentCollaborators)
      .set({ role, invitedBy: userId, updatedAt: new Date() })
      .where(eq(assessmentCollaborators.id, existing.id));
    return;
  }
  await db.insert(assessmentCollaborators).values({
    assessmentId,
    userId: target.id,
    role,
    versionId: scopedVersionId,
    invitedBy: userId,
  });
}

export async function updateCollaboratorRole(
  assessmentId: string,
  collaboratorRowId: string,
  role: Exclude<AssessmentRole, "owner">
): Promise<void> {
  const { role: myRole } = await requireEditAccess(assessmentId);
  if (!canManageCollaborators(myRole)) {
    throw new Error("Only the owner can change collaborator roles.");
  }
  if (!isAssignableCollaboratorRole(role)) {
    throw new Error("Role must be editor, reviewer, or viewer.");
  }
  const db = getDb();
  await db
    .update(assessmentCollaborators)
    .set({ role, updatedAt: new Date() })
    .where(and(eq(assessmentCollaborators.id, collaboratorRowId), eq(assessmentCollaborators.assessmentId, assessmentId)));
}

export async function removeCollaborator(assessmentId: string, collaboratorRowId: string): Promise<void> {
  const { role: myRole } = await requireEditAccess(assessmentId);
  if (!canManageCollaborators(myRole)) {
    throw new Error("Only the owner can remove collaborators.");
  }
  const db = getDb();
  const [row] = await db
    .select({ role: assessmentCollaborators.role })
    .from(assessmentCollaborators)
    .where(and(eq(assessmentCollaborators.id, collaboratorRowId), eq(assessmentCollaborators.assessmentId, assessmentId)))
    .limit(1);
  if (!row) return;
  if (row.role === "owner") {
    throw new Error("Cannot remove owner collaborator row.");
  }
  await db
    .delete(assessmentCollaborators)
    .where(and(eq(assessmentCollaborators.id, collaboratorRowId), eq(assessmentCollaborators.assessmentId, assessmentId)));
}

const NOTES_MAX = 4000;

function allowedEvidenceKeys(questionId: string): Set<string> {
  const question = getQuestionById(questionId);
  if (!question) {
    throw new Error("Unknown question.");
  }
  return new Set(
    (question.commonEvidence ?? [])
      .filter((item) => item.text.trim().length > 0)
      .map((item) => evidenceItemKey(item.supportsLevel, item.text)),
  );
}

export async function loadEvidence(assessmentId: string, versionId: string): Promise<EvidenceState> {
  await requireViewAccess(assessmentId, versionId);
  const db = getDb();
  await requireAssessmentVersion(assessmentId, versionId);
  const [questionRows, fileRows] = await Promise.all([
    db
      .select()
      .from(assessmentQuestionEvidence)
      .where(
        and(
          eq(assessmentQuestionEvidence.assessmentId, assessmentId),
          eq(assessmentQuestionEvidence.versionId, versionId),
        ),
      ),
    db
      .select()
      .from(assessmentEvidenceFiles)
      .where(
        and(eq(assessmentEvidenceFiles.assessmentId, assessmentId), eq(assessmentEvidenceFiles.versionId, versionId)),
      )
      .orderBy(asc(assessmentEvidenceFiles.createdAt)),
  ]);
  return {
    questions: questionRows.map((row) => ({
      questionId: row.questionId,
      notes: row.notes,
      presentKeys: row.presentKeys ?? [],
    })),
    files: fileRows.map((row) => ({
      id: row.id,
      questionId: row.questionId,
      fileName: row.originalName,
      contentType: row.contentType,
      sizeBytes: row.sizeBytes,
    })),
  };
}

export async function saveEvidence(
  assessmentId: string,
  versionId: string,
  questions: QuestionEvidence[],
): Promise<void> {
  await requireDraftEdit(assessmentId, versionId);
  const db = getDb();
  for (const item of questions) {
    const allowed = allowedEvidenceKeys(item.questionId);
    const presentKeys = [...new Set(item.presentKeys.filter((key) => allowed.has(key)))];
    const notes = item.notes.trim().slice(0, NOTES_MAX);
    await db
      .insert(assessmentQuestionEvidence)
      .values({
        assessmentId,
        versionId,
        questionId: item.questionId,
        notes,
        presentKeys,
      })
      .onConflictDoUpdate({
        target: [assessmentQuestionEvidence.versionId, assessmentQuestionEvidence.questionId],
        set: {
          notes,
          presentKeys,
          updatedAt: new Date(),
        },
      });
  }
  await db.update(assessments).set({ updatedAt: new Date() }).where(eq(assessments.id, assessmentId));
}

export async function addEvidenceFile(
  assessmentId: string,
  versionId: string,
  questionId: string,
  file: { fileName: string; bytes: Buffer },
): Promise<EvidenceFileRecord> {
  await requireDraftEdit(assessmentId, versionId);
  if (!getQuestionById(questionId)) {
    throw new Error("Unknown question.");
  }
  if (file.bytes.length === 0 || file.bytes.length > EVIDENCE_MAX_BYTES) {
    throw new Error("Evidence files must be under 10 MB.");
  }
  const extension = evidenceExtension(file.fileName);
  const id = randomUUID();
  const storedName = `${id}${extension}`;
  const contentType = evidenceContentType(extension);
  const originalName = displayFileName(file.fileName);
  await writeEvidenceBytes(assessmentId, versionId, storedName, file.bytes);
  try {
    const db = getDb();
    await db.insert(assessmentEvidenceFiles).values({
      id,
      assessmentId,
      versionId,
      questionId,
      originalName,
      storedName,
      contentType,
      sizeBytes: file.bytes.length,
    });
  } catch (error) {
    await removeEvidenceFile(assessmentId, versionId, storedName).catch(() => undefined);
    throw error;
  }
  return {
    id,
    questionId,
    fileName: originalName,
    contentType,
    sizeBytes: file.bytes.length,
  };
}

export async function deleteEvidenceFile(fileId: string): Promise<void> {
  const db = getDb();
  const [row] = await db
    .select()
    .from(assessmentEvidenceFiles)
    .where(eq(assessmentEvidenceFiles.id, fileId))
    .limit(1);
  if (!row) return;
  await requireDraftEdit(row.assessmentId, row.versionId);
  await db.delete(assessmentEvidenceFiles).where(eq(assessmentEvidenceFiles.id, fileId));
  await removeEvidenceFile(row.assessmentId, row.versionId, row.storedName).catch(() => undefined);
}

export async function readEvidenceFile(fileId: string): Promise<{ record: EvidenceFileRecord; bytes: Buffer }> {
  const db = getDb();
  const [row] = await db
    .select()
    .from(assessmentEvidenceFiles)
    .where(eq(assessmentEvidenceFiles.id, fileId))
    .limit(1);
  if (!row) {
    throw new Error("Evidence file not found.");
  }
  await requireViewAccess(row.assessmentId, row.versionId);
  const bytes = await readEvidenceBytes(row.assessmentId, row.versionId, row.storedName);
  return {
    record: {
      id: row.id,
      questionId: row.questionId,
      fileName: row.originalName,
      contentType: row.contentType,
      sizeBytes: row.sizeBytes,
    },
    bytes,
  };
}

export const assessmentRuntimeRepository: AssessmentRepository = {
  getAssessmentAccess,
  createAssessment,
  updateAssessmentContext,
  deleteAssessment,
  getAssessmentById,
  listAssessments,
  saveScopeSelections,
  loadScopeSelections,
  saveAnswers,
  loadAnswers,
  saveActionMetadata,
  loadActionMetadata,
  loadEvidence,
  saveEvidence,
  addEvidenceFile,
  deleteEvidenceFile,
  readEvidenceFile,
  listAssessmentVersions,
  getLatestAssessmentVersion,
  getAssessmentVersion,
  createAssessmentVersion,
  updateAssessmentVersion,
  deleteAssessmentVersion,
  listAssessmentCollaborators,
  addCollaboratorByEmail,
  updateCollaboratorRole,
  removeCollaborator,
};

