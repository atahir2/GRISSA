/**
 * Static questionnaire configuration types (Layer 1).
 *
 * These types mirror the structure of `questionnaire.data.json` and should
 * remain stable and immutable at runtime.
 */

export type CapabilityScore = 1 | 2 | 3;

export type ImpactLevel = "High" | "Medium" | "Low";

export interface Theme {
  id: string;
  title: string;
  description?: string;
}

/** Reserved for later topic filtering. Scoring ignores this until that review is done. */
export type ScopeApplicability = "on-prem" | "cloud" | "shared";

export interface ScopeItem {
  id: string;
  themeId: string;
  code: string;
  label: string;
  applicability?: ScopeApplicability[];
}

export interface AnswerOption {
  score: CapabilityScore;
  description: string;
  impactMagnitude: ImpactLevel;
  impactLikelihood: ImpactLevel;
  recommendedAction: string;
  /** Plain-language meaning of this level in day-to-day work. Hidden when empty. */
  levelInPractice?: string;
}

/** Typical evidence that supports a claimed capability level. */
export interface CommonEvidenceItem {
  text: string;
  supportsLevel: CapabilityScore;
}

/**
 * Pointer into the static standards catalog.
 * `clause` is a short label such as "E1–E5". It is shown only when set.
 * Policy categories and reporting requirements stay on the question for later
 * export. They are not a mapping browser.
 */
export interface StandardClauseRef {
  standardId: string;
  clause?: string;
}

export interface Question {
  id: string;
  themeId: string;
  scopeId: string;
  code: string;
  text: string;
  lifecyclePhase?: string;
  environmentalDimension?: string;
  associatedMetric?: string;
  reference?: string;
  /** Why the topic belongs in a sustainability baseline. Hidden when empty. */
  whyItMatters?: string;
  /** Column R of the D8.1 workbook: evidence type expected. Hidden when empty. */
  evidenceExpected?: string;
  commonEvidence?: CommonEvidenceItem[];
  standardClauses?: StandardClauseRef[];
  policyCategories?: string[];
  reportingRequirements?: string[];
  answerOptions: AnswerOption[];
}

export interface QuestionnaireConfig {
  themes: Theme[];
  scopeItems: ScopeItem[];
  questions: Question[];
}

