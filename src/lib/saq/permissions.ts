/**
 * Centralized role checks for assessment collaboration (Phase 2).
 * UI and repository should use these helpers instead of ad-hoc string comparisons.
 */

export type AssessmentRole = "owner" | "editor" | "reviewer" | "viewer";

export function isAssessmentRole(value: string | null | undefined): value is AssessmentRole {
  return value === "owner" || value === "editor" || value === "reviewer" || value === "viewer";
}

export function canViewAssessment(role: AssessmentRole | null | undefined): boolean {
  return isAssessmentRole(role ?? undefined);
}

export function canEditAssessment(role: AssessmentRole | null | undefined): boolean {
  return role === "owner" || role === "editor";
}

/** New saved versions (snapshots) may be created by owner or editor only. */
export function canCreateAssessmentVersion(role: AssessmentRole | null | undefined): boolean {
  return role === "owner" || role === "editor";
}

export type AssessmentVersionStatus = "draft" | "submitted" | "reviewed" | "archived";

export function isAssessmentVersionStatus(value: string | null | undefined): value is AssessmentVersionStatus {
  return (
    value === "draft" ||
    value === "submitted" ||
    value === "reviewed" ||
    value === "archived"
  );
}

/** Runtime questionnaire/scope/action edits are limited to draft versions. */
export function canEditAssessmentVersionContent(
  role: AssessmentRole | null | undefined,
  versionStatus: AssessmentVersionStatus | null | undefined
): boolean {
  if (!canEditAssessment(role)) return false;
  return versionStatus === "draft";
}

export function canManageCollaborators(role: AssessmentRole | null | undefined): boolean {
  return role === "owner";
}

export function canDeleteAssessment(role: AssessmentRole | null | undefined): boolean {
  return role === "owner";
}

export function canExportReport(role: AssessmentRole | null | undefined): boolean {
  return canViewAssessment(role);
}

export function canAccessDashboard(role: AssessmentRole | null | undefined): boolean {
  return canViewAssessment(role);
}

/** Reviewer is read-only today; reserved for future review/comment features. */
export function isReadOnlyCollaborator(role: AssessmentRole | null | undefined): boolean {
  return role === "viewer" || role === "reviewer";
}
