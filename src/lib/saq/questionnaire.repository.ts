import questionnaireData from "./questionnaire.data.json";
import type {
  QuestionnaireConfig,
  Question,
  ScopeItem,
  Theme,
} from "./questionnaire.types";

// Cast imported JSON to the strongly-typed configuration shape.
const questionnaireConfig = questionnaireData as QuestionnaireConfig;

// ---------------------------------------------------------------------------
// Repository helpers
// ---------------------------------------------------------------------------

/**
 * Get the full questionnaire configuration object.
 */
export function getQuestionnaireConfig(): QuestionnaireConfig {
  return questionnaireConfig;
}

/**
 * Get all themes.
 */
export function getThemes(): Theme[] {
  return questionnaireConfig.themes;
}

/**
 * Get all scope items.
 */
export function getScopeItems(): ScopeItem[] {
  return questionnaireConfig.scopeItems;
}

/**
 * Get all questions.
 */
export function getQuestions(): Question[] {
  return questionnaireConfig.questions;
}

/**
 * Get all scope items belonging to a given theme.
 */
export function getScopeItemsByTheme(themeId: string): ScopeItem[] {
  return questionnaireConfig.scopeItems.filter(
    (scope) => scope.themeId === themeId
  );
}

/**
 * Get all questions belonging to a given scope item.
 */
export function getQuestionsByScope(scopeId: string): Question[] {
  return questionnaireConfig.questions.filter(
    (question) => question.scopeId === scopeId
  );
}

/**
 * Look up a question by its internal ID.
 */
export function getQuestionById(questionId: string): Question | undefined {
  return questionnaireConfig.questions.find(
    (question) => question.id === questionId
  );
}

/**
 * Look up a question by its code (e.g. "G1.1").
 */
export function getQuestionByCode(code: string): Question | undefined {
  return questionnaireConfig.questions.find(
    (question) => question.code === code
  );
}

