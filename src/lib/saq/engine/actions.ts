/**
 * Action Plan Engine for the Sustainability Self-Assessment (SAQ).
 *
 * This module transforms detailed assessment results into a structured,
 * editable action plan that can be displayed, persisted, and exported.
 *
 * It is purely computational (no side effects, no I/O).
 */

import {
  AssessmentResults,
  QuestionResult,
} from "./results";
import {
  EffortRequired,
  getImplementationPriority,
  ImplementationPriority,
  ImprovementPriority,
} from "./scoring";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ActionItem {
  questionId: string;
  questionCode: string;
  questionText: string;
  themeId: string;
  scopeId: string;
  improvementPriority: ImprovementPriority;
  recommendedAction: string;
  effortRequired?: EffortRequired;
  implementationPriority?: ImplementationPriority;
  leader?: string;
  deadline?: string; // ISO date string
  status?: "Planned" | "In Progress" | "Completed";
  remarks?: string;
}

export interface ActionPlanSummary {
  totalActionItems: number;
  highPriorityCount: number;
  mediumPriorityCount: number;
  lowPriorityCount: number;
  immediateCount: number;
  urgentCount: number;
  plannedCount: number;
  lowPriorityImplementationCount: number;
  noActionNeededCount: number;
}

export interface ActionPlan {
  actionItems: ActionItem[];
  summary: ActionPlanSummary;
}

export interface ExistingActionMetadata {
  leader?: string;
  deadline?: string;
  status?: "Planned" | "In Progress" | "Completed";
  remarks?: string;
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Flatten all QuestionResult objects from the nested AssessmentResults structure.
 */
function flattenQuestionResults(results: AssessmentResults): QuestionResult[] {
  const flat: QuestionResult[] = [];

  for (const themeResult of results.themeResults) {
    for (const scopeResult of themeResult.scopeResults) {
      for (const questionResult of scopeResult.questionResults) {
        flat.push(questionResult);
      }
    }
  }

  return flat;
}

/**
 * Build a single ActionItem from a QuestionResult, optional effort and existing metadata.
 */
function buildActionItem(
  questionResult: QuestionResult,
  effort: EffortRequired | undefined,
  metadata: ExistingActionMetadata | undefined
): ActionItem {
  const { improvementPriority, recommendedAction } = questionResult;

  // Derive implementation priority only when both dimensions are available.
  const implementationPriority =
    improvementPriority && effort
      ? getImplementationPriority(improvementPriority, effort)
      : undefined;

  return {
    questionId: questionResult.questionId,
    questionCode: questionResult.questionCode,
    questionText: questionResult.questionText,
    themeId: questionResult.themeId,
    scopeId: questionResult.scopeId,
    improvementPriority: improvementPriority!,
    recommendedAction: recommendedAction!,
    effortRequired: effort,
    implementationPriority,
    leader: metadata?.leader,
    deadline: metadata?.deadline,
    status: metadata?.status,
    remarks: metadata?.remarks,
  };
}

/**
 * Build a summary for a list of action items.
 */
function buildActionPlanSummary(actionItems: ActionItem[]): ActionPlanSummary {
  let highPriorityCount = 0;
  let mediumPriorityCount = 0;
  let lowPriorityCount = 0;

  let immediateCount = 0;
  let urgentCount = 0;
  let plannedCount = 0;
  let lowPriorityImplementationCount = 0;
  let noActionNeededCount = 0;

  for (const item of actionItems) {
    // By improvement priority
    if (item.improvementPriority === "High") highPriorityCount += 1;
    else if (item.improvementPriority === "Medium") mediumPriorityCount += 1;
    else if (item.improvementPriority === "Low") lowPriorityCount += 1;

    // By implementation priority
    switch (item.implementationPriority) {
      case "Immediate":
        immediateCount += 1;
        break;
      case "Urgent":
        urgentCount += 1;
        break;
      case "Planned":
        plannedCount += 1;
        break;
      case "Low Priority":
        lowPriorityImplementationCount += 1;
        break;
      case "No Action Needed":
        noActionNeededCount += 1;
        break;
      default:
        // undefined: not counted in implementation categories
        break;
    }
  }

  return {
    totalActionItems: actionItems.length,
    highPriorityCount,
    mediumPriorityCount,
    lowPriorityCount,
    immediateCount,
    urgentCount,
    plannedCount,
    lowPriorityImplementationCount,
    noActionNeededCount,
  };
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Build an ActionPlan from detailed assessment results.
 *
 * Rules:
 * - Only generate action items for questions where:
 *   - inScope = true
 *   - improvementPriority is defined
 *   - recommendedAction is defined
 * - If a question is in scope but selectedScore is undefined, still generate
 *   an action item only if recommendedAction exists; otherwise skip it.
 * - effortRequired comes from effortByQuestionId[questionId] if provided.
 * - implementationPriority is derived only if both improvementPriority and
 *   effortRequired exist.
 * - leader / deadline / status / remarks come from existingActionMetadata
 *   if provided.
 *
 * Display order follows assessment results traversal (theme → scope → question)
 * so items do not jump when Effort Required is selected (implementation tiers are
 * for labels/summary counts only).
 */
export function buildActionPlan(
  results: AssessmentResults,
  effortByQuestionId: Record<string, EffortRequired> = {},
  existingActionMetadata: Record<string, ExistingActionMetadata> = {}
): ActionPlan {
  const allQuestions = flattenQuestionResults(results);

  const rawActionItems: ActionItem[] = [];

  for (const qr of allQuestions) {
    if (!qr.inScope) {
      continue;
    }

    if (!qr.improvementPriority || !qr.recommendedAction) {
      // Optionally allow unanswered but still actionable questions, as long as
      // a recommendedAction is present. Since recommendedAction is already
      // checked above, this condition covers that requirement.
      continue;
    }

    const effort = effortByQuestionId[qr.questionId];
    const metadata = existingActionMetadata[qr.questionId];

    rawActionItems.push(buildActionItem(qr, effort, metadata));
  }

  const summary = buildActionPlanSummary(rawActionItems);

  return {
    actionItems: rawActionItems,
    summary,
  };
}

