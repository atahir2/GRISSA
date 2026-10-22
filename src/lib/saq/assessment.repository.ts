/**
 * Stable repository facade.
 * Keep UI/routes importing from this module only.
 */

export type {
  ActionMetadata,
  AssessmentRepository,
  AssessmentRuntimeRepository,
  AssessmentVersionUpdate,
} from "./repositories/assessment.repository.interface";
import type {
  Assessment,
  AssessmentAccess,
  AssessmentAnswer,
  AssessmentCollaborator,
  AssessmentListItem,
  AssessmentVersion,
  ScopeSelection,
} from "./assessment.types";
import type {
  ActionMetadata,
  AssessmentVersionUpdate,
} from "./repositories/assessment.repository.interface";
import type { AssessmentRole } from "./permissions";
import { appFetch } from "@/src/lib/base-path";

async function callRepositoryApi<T>(action: string, payload?: Record<string, unknown>): Promise<T> {
  const res = await appFetch("/api/saq/repository", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action, payload }),
  });
  const json = (await res.json()) as { error?: string } & T;
  if (!res.ok) {
    throw new Error(json.error ?? "Repository request failed.");
  }
  return json;
}

export function createAssessment(organisationName: string) {
  return callRepositoryApi<Assessment>("createAssessment", { organisationName });
}

export function deleteAssessment(assessmentId: string): Promise<void> {
  return callRepositoryApi<{ ok: true }>("deleteAssessment", { assessmentId }).then(() => undefined);
}

export function getAssessmentById(assessmentId: string): Promise<Assessment | null> {
  return callRepositoryApi<Assessment | null>("getAssessmentById", { assessmentId });
}

export function listAssessments(): Promise<AssessmentListItem[]> {
  return callRepositoryApi<AssessmentListItem[]>("listAssessments");
}

export function saveScopeSelections(
  assessmentId: string,
  versionId: string,
  scopeSelections: ScopeSelection[]
): Promise<void> {
  return callRepositoryApi<{ ok: true }>("saveScopeSelections", {
    assessmentId,
    versionId,
    scopeSelections,
  }).then(() => undefined);
}

export function loadScopeSelections(assessmentId: string, versionId: string): Promise<ScopeSelection[]> {
  return callRepositoryApi<ScopeSelection[]>("loadScopeSelections", { assessmentId, versionId });
}

export function saveAnswers(
  assessmentId: string,
  versionId: string,
  answers: AssessmentAnswer[]
): Promise<void> {
  return callRepositoryApi<{ ok: true }>("saveAnswers", { assessmentId, versionId, answers }).then(
    () => undefined
  );
}

export function loadAnswers(assessmentId: string, versionId: string): Promise<AssessmentAnswer[]> {
  return callRepositoryApi<AssessmentAnswer[]>("loadAnswers", { assessmentId, versionId });
}

export function saveActionMetadata(
  assessmentId: string,
  versionId: string,
  actionMetadataByQuestionId: Record<string, ActionMetadata>
): Promise<void> {
  return callRepositoryApi<{ ok: true }>("saveActionMetadata", {
    assessmentId,
    versionId,
    actionMetadataByQuestionId,
  }).then(() => undefined);
}

export function loadActionMetadata(
  assessmentId: string,
  versionId: string
): Promise<Record<string, ActionMetadata>> {
  return callRepositoryApi<Record<string, ActionMetadata>>("loadActionMetadata", {
    assessmentId,
    versionId,
  });
}

export function getAssessmentAccess(assessmentId: string): Promise<AssessmentAccess | null> {
  return callRepositoryApi<AssessmentAccess | null>("getAssessmentAccess", { assessmentId });
}

export function listAssessmentVersions(assessmentId: string): Promise<AssessmentVersion[]> {
  return callRepositoryApi<AssessmentVersion[]>("listAssessmentVersions", { assessmentId });
}

export function getLatestAssessmentVersion(assessmentId: string): Promise<AssessmentVersion | null> {
  return callRepositoryApi<AssessmentVersion | null>("getLatestAssessmentVersion", { assessmentId });
}

export function getAssessmentVersion(
  assessmentId: string,
  versionId: string
): Promise<AssessmentVersion | null> {
  return callRepositoryApi<AssessmentVersion | null>("getAssessmentVersion", {
    assessmentId,
    versionId,
  });
}

export function createAssessmentVersion(
  assessmentId: string,
  label?: string | null
): Promise<AssessmentVersion> {
  return callRepositoryApi<AssessmentVersion>("createAssessmentVersion", { assessmentId, label });
}

export function updateAssessmentVersion(
  assessmentId: string,
  versionId: string,
  patch: AssessmentVersionUpdate
): Promise<void> {
  return callRepositoryApi<{ ok: true }>("updateAssessmentVersion", {
    assessmentId,
    versionId,
    patch,
  }).then(() => undefined);
}

export function listAssessmentCollaborators(assessmentId: string): Promise<AssessmentCollaborator[]> {
  return callRepositoryApi<AssessmentCollaborator[]>("listAssessmentCollaborators", { assessmentId });
}

export function addCollaboratorByEmail(
  assessmentId: string,
  email: string,
  role: Exclude<AssessmentRole, "owner">
): Promise<void> {
  return callRepositoryApi<{ ok: true }>("addCollaboratorByEmail", { assessmentId, email, role }).then(
    () => undefined
  );
}

export function updateCollaboratorRole(
  assessmentId: string,
  collaboratorRowId: string,
  role: Exclude<AssessmentRole, "owner">
): Promise<void> {
  return callRepositoryApi<{ ok: true }>("updateCollaboratorRole", {
    assessmentId,
    collaboratorRowId,
    role,
  }).then(() => undefined);
}

export function removeCollaborator(assessmentId: string, collaboratorRowId: string): Promise<void> {
  return callRepositoryApi<{ ok: true }>("removeCollaborator", {
    assessmentId,
    collaboratorRowId,
  }).then(() => undefined);
}
