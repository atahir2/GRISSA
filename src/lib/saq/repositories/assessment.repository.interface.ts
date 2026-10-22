import type {
  Assessment,
  AssessmentAccess,
  AssessmentAnswer,
  AssessmentCollaborator,
  AssessmentListItem,
  AssessmentVersion,
  ScopeSelection,
} from "../assessment.types";
import type { AssessmentRole, AssessmentVersionStatus } from "../permissions";

export type ActionMetadata = {
  effortRequired?: "Low" | "Medium" | "High";
  leader?: string;
  deadline?: string;
  status?: "Planned" | "In Progress" | "Completed";
  remarks?: string;
};

/**
 * Backend-agnostic runtime persistence contract for SAQ assessment data.
 * Keep this free from Supabase-specific client types so implementations
 * can be swapped (e.g. Supabase now, plain PostgreSQL later).
 */
export interface AssessmentRuntimeRepository {
  createAssessment(organisationName: string): Promise<Assessment>;
  deleteAssessment(assessmentId: string): Promise<void>;
  getAssessmentById(assessmentId: string): Promise<Assessment | null>;
  listAssessments(): Promise<AssessmentListItem[]>;
  saveScopeSelections(
    assessmentId: string,
    versionId: string,
    scopeSelections: ScopeSelection[]
  ): Promise<void>;
  loadScopeSelections(assessmentId: string, versionId: string): Promise<ScopeSelection[]>;
  saveAnswers(assessmentId: string, versionId: string, answers: AssessmentAnswer[]): Promise<void>;
  loadAnswers(assessmentId: string, versionId: string): Promise<AssessmentAnswer[]>;
  saveActionMetadata(
    assessmentId: string,
    versionId: string,
    actionMetadataByQuestionId: Record<string, ActionMetadata>
  ): Promise<void>;
  loadActionMetadata(assessmentId: string, versionId: string): Promise<Record<string, ActionMetadata>>;
}

export type AssessmentVersionUpdate = {
  label?: string | null;
  status?: AssessmentVersionStatus;
};

export interface AssessmentRepository extends AssessmentRuntimeRepository {
  getAssessmentAccess(assessmentId: string): Promise<AssessmentAccess | null>;
  listAssessmentVersions(assessmentId: string): Promise<AssessmentVersion[]>;
  getLatestAssessmentVersion(assessmentId: string): Promise<AssessmentVersion | null>;
  getAssessmentVersion(assessmentId: string, versionId: string): Promise<AssessmentVersion | null>;
  createAssessmentVersion(assessmentId: string, label?: string | null): Promise<AssessmentVersion>;
  updateAssessmentVersion(
    assessmentId: string,
    versionId: string,
    patch: AssessmentVersionUpdate
  ): Promise<void>;
  listAssessmentCollaborators(assessmentId: string): Promise<AssessmentCollaborator[]>;
  addCollaboratorByEmail(
    assessmentId: string,
    email: string,
    role: Exclude<AssessmentRole, "owner">
  ): Promise<void>;
  updateCollaboratorRole(
    assessmentId: string,
    collaboratorRowId: string,
    role: Exclude<AssessmentRole, "owner">
  ): Promise<void>;
  removeCollaborator(assessmentId: string, collaboratorRowId: string): Promise<void>;
}

