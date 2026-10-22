/**
 * Runtime assessment state types (Layer 2).
 *
 * These types represent per-assessment data such as answers, scope selections,
 * and assessment-level action items. They are separate from the static
 * questionnaire configuration.
 */

export type CapabilityScore = 1 | 2 | 3;

import type { AssessmentRole, AssessmentVersionStatus } from "@/src/lib/saq/permissions";

export interface Assessment {
  id: string;
  organisationName: string;
  /** ISO date string or Date for transport; use Date in app when needed. */
  createdAt: Date | string;
  updatedAt?: Date | string;
}

/** Listing on /saq: owned and shared assessments with the current user’s role. */
export interface AssessmentListItem extends Assessment {
  myRole: AssessmentRole;
  ownerUserId: string;
}

export interface AssessmentAccess {
  assessment: Assessment;
  myRole: AssessmentRole;
  ownerUserId: string;
}

export interface AssessmentVersion {
  id: string;
  assessmentId: string;
  versionNumber: number;
  label: string | null;
  status: AssessmentVersionStatus;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface AssessmentCollaborator {
  id: string;
  userId: string;
  email: string;
  role: AssessmentRole;
  invitedBy: string | null;
  createdAt: Date;
}

export interface ScopeSelection {
  assessmentId: string;
  scopeId: string;
  inScope: boolean;
  targetCapability?: CapabilityScore;
}

export interface AssessmentAnswer {
  assessmentId: string;
  questionId: string;
  selectedScore?: CapabilityScore;
}

export type ImprovementPriority = "High" | "Medium" | "Low";

export type EffortRequired = "Low" | "Medium" | "High";

export type ImplementationPriority =
  | "Immediate"
  | "Urgent"
  | "Planned"
  | "Low Priority"
  | "No Action Needed";

export type ActionStatus = "Planned" | "In Progress" | "Completed";

export interface ActionItem {
  assessmentId: string;
  questionId: string;
  improvementPriority: ImprovementPriority;
  effortRequired?: EffortRequired;
  implementationPriority?: ImplementationPriority;
  leader?: string;
  deadline?: Date;
  status?: ActionStatus;
  remarks?: string;
}

