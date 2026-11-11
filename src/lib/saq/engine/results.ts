/**
 * Results engine for the Sustainability Self-Assessment (SAQ).
 *
 * This module combines:
 * - static questionnaire configuration
 * - runtime scope selections
 * - runtime answers
 * - scoring helpers
 *
 * and produces derived, read-only assessment results suitable for dashboards,
 * reporting, and action planning. All functions are pure and side-effect free.
 */

import { getQuestionnaireConfig } from "../questionnaire.repository";
import type { Question, ScopeItem, Theme } from "../questionnaire.types";
import {
  CapabilityScore,
  getCapabilityPassStatus,
  getQuestionImprovementPriority,
  getRecommendedActionForScore,
  getTargetStatus,
  ImprovementPriority,
  PassStatus,
} from "./scoring";

// ---------------------------------------------------------------------------
// Runtime state assumptions
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Result types
// ---------------------------------------------------------------------------

export type TargetStatus =
  | "Met"
  | "Below Target"
  | "No Target"
  | "Not Applicable";

export interface QuestionResult {
  questionId: string;
  questionCode: string;
  questionText: string;
  themeId: string;
  scopeId: string;
  inScope: boolean;
  targetCapability?: CapabilityScore;
  selectedScore?: CapabilityScore;
  passLevel1: PassStatus;
  passLevel2: PassStatus;
  passLevel3: PassStatus;
  targetStatus: TargetStatus;
  improvementPriority?: ImprovementPriority;
  recommendedAction?: string;
}

export interface ScopeResultSummary {
  totalQuestions: number;
  answeredQuestions: number;
  completionRate: number; // percentage 0–100
  passLevel1Count: number;
  passLevel2Count: number;
  passLevel3Count: number;
  targetMetCount: number;
  highPriorityCount: number;
  mediumPriorityCount: number;
  lowPriorityCount: number;
}

export interface ScopeResult {
  scopeId: string;
  scopeCode: string;
  scopeLabel: string;
  themeId: string;
  inScope: boolean;
  targetCapability?: CapabilityScore;
  questionResults: QuestionResult[];
  summary: ScopeResultSummary;
}

export interface ThemeResultSummary {
  totalScopes: number;
  inScopeCount: number;
  totalQuestions: number;
  answeredQuestions: number;
  completionRate: number;
  passLevel1Count: number;
  passLevel2Count: number;
  passLevel3Count: number;
  targetMetCount: number;
  highPriorityCount: number;
  mediumPriorityCount: number;
  lowPriorityCount: number;
}

export interface ThemeResult {
  themeId: string;
  themeTitle: string;
  scopeResults: ScopeResult[];
  summary: ThemeResultSummary;
}

export interface AssessmentResultsSummary {
  totalThemes: number;
  totalScopes: number;
  inScopeCount: number;
  totalQuestions: number;
  answeredQuestions: number;
  completionRate: number;
  passLevel1Count: number;
  passLevel2Count: number;
  passLevel3Count: number;
  targetMetCount: number;
  highPriorityCount: number;
  mediumPriorityCount: number;
  lowPriorityCount: number;
}

export interface AssessmentResults {
  themeResults: ThemeResult[];
  summary: AssessmentResultsSummary;
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function buildQuestionResult(
  question: Question,
  scopeInScope: boolean,
  targetCapability: CapabilityScore | undefined,
  selectedScore: CapabilityScore | undefined
): QuestionResult {
  const inScope = scopeInScope;

  // Pass/fail for each capability threshold (1–3)
  const passLevel1 = getCapabilityPassStatus(selectedScore, 1, inScope);
  const passLevel2 = getCapabilityPassStatus(selectedScore, 2, inScope);
  const passLevel3 = getCapabilityPassStatus(selectedScore, 3, inScope);

  // Target status (includes "Not Applicable" when out of scope)
  const targetStatus = getTargetStatus(
    selectedScore,
    targetCapability,
    inScope
  ) as TargetStatus;

  // Improvement priority and recommended action come from the selected answer
  const improvementPriority = getQuestionImprovementPriority(
    question.answerOptions,
    selectedScore
  );

  const recommendedAction = getRecommendedActionForScore(
    selectedScore,
    question.answerOptions
  );

  return {
    questionId: question.id,
    questionCode: question.code,
    questionText: question.text,
    themeId: question.themeId,
    scopeId: question.scopeId,
    inScope,
    targetCapability,
    selectedScore,
    passLevel1,
    passLevel2,
    passLevel3,
    targetStatus,
    improvementPriority,
    recommendedAction,
  };
}

function buildScopeResult(
  scope: ScopeItem,
  theme: Theme,
  questionsForScope: Question[],
  selection: ScopeSelection | undefined,
  answersByQuestionId: Map<string, AssessmentAnswer>
): ScopeResult {
  const inScope = selection?.inScope ?? false;
  const targetCapability = selection?.targetCapability;

  const questionResults: QuestionResult[] = questionsForScope.map((q) => {
    const answer = answersByQuestionId.get(q.id);
    const selectedScore = answer?.selectedScore;
    return buildQuestionResult(q, inScope, targetCapability, selectedScore);
  });

  // Summary: count only in-scope questions
  const inScopeQuestions = questionResults.filter((qr) => qr.inScope);
  const totalQuestions = inScopeQuestions.length;
  const answeredQuestions = inScopeQuestions.filter(
    (qr) => qr.selectedScore !== undefined
  ).length;

  const safeCompletionDenominator = totalQuestions || 1;
  const completionRate =
    (answeredQuestions / safeCompletionDenominator) * 100;

  const passLevel1Count = inScopeQuestions.filter(
    (qr) => qr.passLevel1 === "Pass"
  ).length;
  const passLevel2Count = inScopeQuestions.filter(
    (qr) => qr.passLevel2 === "Pass"
  ).length;
  const passLevel3Count = inScopeQuestions.filter(
    (qr) => qr.passLevel3 === "Pass"
  ).length;

  const targetMetCount = inScopeQuestions.filter(
    (qr) => qr.targetStatus === "Met"
  ).length;

  const highPriorityCount = inScopeQuestions.filter(
    (qr) => qr.improvementPriority === "High"
  ).length;
  const mediumPriorityCount = inScopeQuestions.filter(
    (qr) => qr.improvementPriority === "Medium"
  ).length;
  const lowPriorityCount = inScopeQuestions.filter(
    (qr) => qr.improvementPriority === "Low"
  ).length;

  const summary: ScopeResultSummary = {
    totalQuestions,
    answeredQuestions,
    completionRate,
    passLevel1Count,
    passLevel2Count,
    passLevel3Count,
    targetMetCount,
    highPriorityCount,
    mediumPriorityCount,
    lowPriorityCount,
  };

  return {
    scopeId: scope.id,
    scopeCode: scope.code,
    scopeLabel: scope.label,
    themeId: theme.id,
    inScope,
    targetCapability,
    questionResults,
    summary,
  };
}

function buildThemeResult(
  theme: Theme,
  scopesForTheme: ScopeItem[],
  questions: Question[],
  selectionsByScopeId: Map<string, ScopeSelection>,
  answersByQuestionId: Map<string, AssessmentAnswer>
): ThemeResult {
  const scopeResults: ScopeResult[] = scopesForTheme.map((scope) => {
    const selection = selectionsByScopeId.get(scope.id);
    const questionsForScope = questions.filter(
      (q) => q.scopeId === scope.id
    );
    return buildScopeResult(
      scope,
      theme,
      questionsForScope,
      selection,
      answersByQuestionId
    );
  });

  const totalScopes = scopeResults.length;
  const inScopeCount = scopeResults.filter((s) => s.inScope).length;

  // Aggregate question-level metrics from scopes (counting only in-scope questions).
  let totalQuestions = 0;
  let answeredQuestions = 0;
  let passLevel1Count = 0;
  let passLevel2Count = 0;
  let passLevel3Count = 0;
  let targetMetCount = 0;
  let highPriorityCount = 0;
  let mediumPriorityCount = 0;
  let lowPriorityCount = 0;

  for (const scopeResult of scopeResults) {
    totalQuestions += scopeResult.summary.totalQuestions;
    answeredQuestions += scopeResult.summary.answeredQuestions;
    passLevel1Count += scopeResult.summary.passLevel1Count;
    passLevel2Count += scopeResult.summary.passLevel2Count;
    passLevel3Count += scopeResult.summary.passLevel3Count;
    targetMetCount += scopeResult.summary.targetMetCount;
    highPriorityCount += scopeResult.summary.highPriorityCount;
    mediumPriorityCount += scopeResult.summary.mediumPriorityCount;
    lowPriorityCount += scopeResult.summary.lowPriorityCount;
  }

  const safeCompletionDenominator = totalQuestions || 1;
  const completionRate =
    (answeredQuestions / safeCompletionDenominator) * 100;

  const summary: ThemeResultSummary = {
    totalScopes,
    inScopeCount,
    totalQuestions,
    answeredQuestions,
    completionRate,
    passLevel1Count,
    passLevel2Count,
    passLevel3Count,
    targetMetCount,
    highPriorityCount,
    mediumPriorityCount,
    lowPriorityCount,
  };

  return {
    themeId: theme.id,
    themeTitle: theme.title,
    scopeResults,
    summary,
  };
}

function buildAssessmentSummary(themeResults: ThemeResult[]): AssessmentResultsSummary {
  const totalThemes = themeResults.length;
  let totalScopes = 0;
  let inScopeCount = 0;
  let totalQuestions = 0;
  let answeredQuestions = 0;
  let passLevel1Count = 0;
  let passLevel2Count = 0;
  let passLevel3Count = 0;
  let targetMetCount = 0;
  let highPriorityCount = 0;
  let mediumPriorityCount = 0;
  let lowPriorityCount = 0;

  for (const themeResult of themeResults) {
    totalScopes += themeResult.summary.totalScopes;
    inScopeCount += themeResult.summary.inScopeCount;
    totalQuestions += themeResult.summary.totalQuestions;
    answeredQuestions += themeResult.summary.answeredQuestions;
    passLevel1Count += themeResult.summary.passLevel1Count;
    passLevel2Count += themeResult.summary.passLevel2Count;
    passLevel3Count += themeResult.summary.passLevel3Count;
    targetMetCount += themeResult.summary.targetMetCount;
    highPriorityCount += themeResult.summary.highPriorityCount;
    mediumPriorityCount += themeResult.summary.mediumPriorityCount;
    lowPriorityCount += themeResult.summary.lowPriorityCount;
  }

  const safeCompletionDenominator = totalQuestions || 1;
  const completionRate =
    (answeredQuestions / safeCompletionDenominator) * 100;

  return {
    totalThemes,
    totalScopes,
    inScopeCount,
    totalQuestions,
    answeredQuestions,
    completionRate,
    passLevel1Count,
    passLevel2Count,
    passLevel3Count,
    targetMetCount,
    highPriorityCount,
    mediumPriorityCount,
    lowPriorityCount,
  };
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Build full assessment results for a single assessment instance.
 *
 * - scopeSelections: one entry per scope for this assessment (missing entries
 *   imply inScope = false).
 * - answers: one entry per answered question for this assessment.
 */
export function buildAssessmentResults(
  scopeSelections: ScopeSelection[],
  answers: AssessmentAnswer[]
): AssessmentResults {
  const { themes, scopeItems, questions } = getQuestionnaireConfig();

  // Index runtime data by ID for efficient lookup.
  const selectionsByScopeId = new Map<string, ScopeSelection>();
  for (const selection of scopeSelections) {
    selectionsByScopeId.set(selection.scopeId, selection);
  }

  const answersByQuestionId = new Map<string, AssessmentAnswer>();
  for (const answer of answers) {
    answersByQuestionId.set(answer.questionId, answer);
  }

  // Build results per theme.
  const themeResults: ThemeResult[] = themes.map((theme) => {
    const scopesForTheme = scopeItems.filter(
      (scope) => scope.themeId === theme.id
    );
    return buildThemeResult(
      theme,
      scopesForTheme,
      questions,
      selectionsByScopeId,
      answersByQuestionId
    );
  });

  const summary = buildAssessmentSummary(themeResults);

  return {
    themeResults,
    summary,
  };
}

export type TopicGapStatus = "Met" | "Below target" | "No target" | "Not answered";

export interface TopicQuestionSnapshot {
  questionCode: string;
  selectedScore?: CapabilityScore;
}

export interface TopicComparison {
  themeId: string;
  themeTitle: string;
  scopeId: string;
  scopeCode: string;
  scopeLabel: string;
  targetCapability?: CapabilityScore;
  questions: TopicQuestionSnapshot[];
  currentScore?: CapabilityScore;
  gap?: number;
  status: TopicGapStatus;
  gapPriority?: ImprovementPriority;
}

export interface TopicComparisonGroup {
  themeId: string;
  themeTitle: string;
  topics: TopicComparison[];
}

export interface TopicComparisonSummary {
  inScopeTopics: number;
  met: number;
  belowTarget: number;
  noTarget: number;
  notAnswered: number;
}

const PRIORITY_RANK: Record<ImprovementPriority, number> = {
  High: 3,
  Medium: 2,
  Low: 1,
};

function highestPriority(values: Array<ImprovementPriority | undefined>): ImprovementPriority | undefined {
  let best: ImprovementPriority | undefined;
  for (const value of values) {
    if (!value) continue;
    if (!best || PRIORITY_RANK[value] > PRIORITY_RANK[best]) best = value;
  }
  return best;
}

/**
 * Per-topic view of the target set in Scope & Goals against the recorded level.
 * When a topic has more than one question, the lower score sets the topic gap.
 */
export function buildTopicComparison(results: AssessmentResults): {
  groups: TopicComparisonGroup[];
  summary: TopicComparisonSummary;
} {
  const summary: TopicComparisonSummary = {
    inScopeTopics: 0,
    met: 0,
    belowTarget: 0,
    noTarget: 0,
    notAnswered: 0,
  };

  const groups: TopicComparisonGroup[] = results.themeResults
    .map((theme) => {
      const topics: TopicComparison[] = theme.scopeResults
        .filter((scope) => scope.inScope)
        .map((scope) => {
          const questions = scope.questionResults.map((question) => ({
            questionCode: question.questionCode,
            selectedScore: question.selectedScore,
          }));
          const allAnswered = scope.questionResults.every(
            (question) => question.selectedScore !== undefined
          );
          const scores = scope.questionResults
            .map((question) => question.selectedScore)
            .filter((score): score is CapabilityScore => score !== undefined);
          const currentScore =
            allAnswered && scores.length > 0
              ? (Math.min(...scores) as CapabilityScore)
              : undefined;

          let status: TopicGapStatus;
          if (!allAnswered) status = "Not answered";
          else if (scope.targetCapability === undefined) status = "No target";
          else if (currentScore !== undefined && currentScore >= scope.targetCapability) status = "Met";
          else status = "Below target";

          const gap =
            scope.targetCapability !== undefined && currentScore !== undefined
              ? scope.targetCapability - currentScore
              : undefined;

          const gapPriority =
            status === "Below target"
              ? highestPriority(
                  scope.questionResults
                    .filter(
                      (question) =>
                        question.selectedScore !== undefined &&
                        scope.targetCapability !== undefined &&
                        question.selectedScore < scope.targetCapability
                    )
                    .map((question) => question.improvementPriority)
                )
              : undefined;

          summary.inScopeTopics += 1;
          if (status === "Met") summary.met += 1;
          else if (status === "Below target") summary.belowTarget += 1;
          else if (status === "No target") summary.noTarget += 1;
          else summary.notAnswered += 1;

          return {
            themeId: theme.themeId,
            themeTitle: theme.themeTitle,
            scopeId: scope.scopeId,
            scopeCode: scope.scopeCode,
            scopeLabel: scope.scopeLabel,
            targetCapability: scope.targetCapability,
            questions,
            currentScore,
            gap,
            status,
            gapPriority,
          };
        });
      return { themeId: theme.themeId, themeTitle: theme.themeTitle, topics };
    })
    .filter((group) => group.topics.length > 0);

  return { groups, summary };
}

