import { and, asc, desc, eq, or } from "drizzle-orm";
import {
  assessmentActionItems,
  assessmentAnswers,
  assessmentCollaborators,
  assessments,
  assessmentScopeSelections,
  assessmentVersions,
  users,
} from "../../../../drizzle/schema";
import { getDb } from "@/src/lib/db/drizzle";
import { requireCurrentUserId } from "@/src/lib/auth/current-user";
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

function toAssessment(row: typeof assessments.$inferSelect): Assessment {
  return {
    id: row.id,
    organisationName: row.organisationName,
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
}

async function getAssessmentAccessRole(
  assessmentId: string,
  userId: string
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

  const [collaborator] = await db
    .select({ role: assessmentCollaborators.role })
    .from(assessmentCollaborators)
    .where(and(eq(assessmentCollaborators.assessmentId, assessmentId), eq(assessmentCollaborators.userId, userId)))
    .limit(1);
  if (!collaborator?.role || !isAssessmentRole(collaborator.role)) return null;
  return collaborator.role;
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

async function requireViewAccess(assessmentId: string) {
  const userId = await requireCurrentUserId();
  const role = await getAssessmentAccessRole(assessmentId, userId);
  if (!role || !canViewAssessment(role)) {
    throw new Error("Assessment not found or access denied.");
  }
  return { userId, role };
}

async function requireEditAccess(assessmentId: string) {
  const userId = await requireCurrentUserId();
  const role = await getAssessmentAccessRole(assessmentId, userId);
  if (!role || !canEditAssessment(role)) {
    throw new Error("You do not have permission to edit this assessment.");
  }
  return { userId, role };
}

export async function createAssessment(organisationName: string): Promise<Assessment> {
  const db = getDb();
  const ownerUserId = await requireCurrentUserId();
  const [created] = await db
    .insert(assessments)
    .values({
      organisationName,
      ownerUserId,
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

export async function deleteAssessment(assessmentId: string): Promise<void> {
  const { userId, role } = await requireViewAccess(assessmentId);
  if (!canDeleteAssessment(role)) {
    throw new Error("Only the owner can delete this assessment.");
  }
  const db = getDb();
  await db
    .delete(assessments)
    .where(and(eq(assessments.id, assessmentId), eq(assessments.ownerUserId, userId)));
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
  await requireEditAccess(assessmentId);
  const db = getDb();
  await requireAssessmentVersion(assessmentId, versionId);
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
  await requireViewAccess(assessmentId);
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
  await requireEditAccess(assessmentId);
  const db = getDb();
  await requireAssessmentVersion(assessmentId, versionId);
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
  await requireViewAccess(assessmentId);
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
  await requireEditAccess(assessmentId);
  const db = getDb();
  await requireAssessmentVersion(assessmentId, versionId);
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
  await requireViewAccess(assessmentId);
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
  await requireViewAccess(assessmentId);
  const db = getDb();
  const rows = await db
    .select()
    .from(assessmentVersions)
    .where(eq(assessmentVersions.assessmentId, assessmentId))
    .orderBy(asc(assessmentVersions.versionNumber));
  return rows.map(toVersion);
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
  await requireViewAccess(assessmentId);
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
  await requireEditAccess(assessmentId);
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
      invitedBy: assessmentCollaborators.invitedBy,
      createdAt: assessmentCollaborators.createdAt,
      email: users.email,
    })
    .from(assessmentCollaborators)
    .innerJoin(users, eq(users.id, assessmentCollaborators.userId))
    .where(eq(assessmentCollaborators.assessmentId, assessmentId))
    .orderBy(asc(assessmentCollaborators.createdAt));

  return rows.map((row) => ({
    id: row.id,
    userId: row.userId,
    email: row.email,
    role: isAssessmentRole(row.role) ? row.role : "viewer",
    invitedBy: row.invitedBy,
    createdAt: row.createdAt,
  }));
}

export async function addCollaboratorByEmail(
  assessmentId: string,
  email: string,
  role: Exclude<AssessmentRole, "owner">
): Promise<void> {
  const { userId, role: myRole } = await requireEditAccess(assessmentId);
  if (!canManageCollaborators(myRole)) {
    throw new Error("Only the owner can add collaborators.");
  }
  const db = getDb();
  const normalizedEmail = email.trim().toLowerCase();
  const [target] = await db.select().from(users).where(eq(users.email, normalizedEmail)).limit(1);
  if (!target) {
    throw new Error("user not found for this email");
  }
  if (target.id === userId) {
    throw new Error("owner already has access");
  }
  await db
    .insert(assessmentCollaborators)
    .values({
      assessmentId,
      userId: target.id,
      role,
      invitedBy: userId,
    })
    .onConflictDoUpdate({
      target: [assessmentCollaborators.assessmentId, assessmentCollaborators.userId],
      set: {
        role,
        invitedBy: userId,
        updatedAt: new Date(),
      },
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

