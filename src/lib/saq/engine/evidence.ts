import type { CapabilityScore } from "../questionnaire.types";
import type { CommonEvidenceItem, Question, Theme } from "../questionnaire.types";
import type { AssessmentAnswer, ScopeSelection } from "./results";

/** Stable checklist key. The text is the checklist sentence, not a stored score. */
export function evidenceItemKey(supportsLevel: CapabilityScore, text: string): string {
  return `${supportsLevel}:${text.trim()}`;
}

export interface EvidenceChecklistItem {
  key: string;
  text: string;
  supportsLevel: CapabilityScore;
  present: boolean;
}

export interface QuestionEvidenceReadiness {
  questionId: string;
  questionCode: string;
  questionText: string;
  themeId: string;
  selectedScore?: CapabilityScore;
  /** Set only when Scope has a target above the recorded level. */
  targetScore?: CapabilityScore;
  hasChecklist: boolean;
  evidenceExpected?: string;
  /** Items that support the level already recorded. */
  recordedItems: EvidenceChecklistItem[];
  /** Items for a higher target. Empty when the target is not above the recorded level. */
  targetItems: EvidenceChecklistItem[];
  missingRecorded: number;
  missingTarget: number;
}

export interface ThemeEvidenceReadiness {
  themeId: string;
  themeTitle: string;
  questions: QuestionEvidenceReadiness[];
}

export interface EvidencePresence {
  questionId: string;
  presentKeys: string[];
}

function toItem(item: CommonEvidenceItem, presentKeys: Set<string>): EvidenceChecklistItem {
  const text = item.text.trim();
  return {
    key: evidenceItemKey(item.supportsLevel, text),
    text,
    supportsLevel: item.supportsLevel,
    present: presentKeys.has(evidenceItemKey(item.supportsLevel, text)),
  };
}

function checklistForQuestion(
  question: Question,
  selectedScore: CapabilityScore | undefined,
  targetScore: CapabilityScore | undefined,
  presentKeys: Set<string>,
): QuestionEvidenceReadiness {
  const source = (question.commonEvidence ?? []).filter((item) => item.text.trim().length > 0);
  const higherTarget =
    selectedScore !== undefined && targetScore !== undefined && targetScore > selectedScore
      ? targetScore
      : undefined;
  const items = source.map((item) => toItem(item, presentKeys));
  const recordedItems =
    selectedScore === undefined ? [] : items.filter((item) => item.supportsLevel <= selectedScore);
  const targetItems =
    higherTarget === undefined
      ? []
      : items.filter((item) => item.supportsLevel > selectedScore! && item.supportsLevel <= higherTarget);
  return {
    questionId: question.id,
    questionCode: question.code,
    questionText: question.text,
    themeId: question.themeId,
    selectedScore,
    targetScore: higherTarget,
    hasChecklist: items.length > 0,
    evidenceExpected: question.evidenceExpected?.trim() || undefined,
    recordedItems,
    targetItems,
    missingRecorded: recordedItems.filter((item) => !item.present).length,
    missingTarget: targetItems.filter((item) => !item.present).length,
  };
}

/**
 * Splits checklist items into support for the recorded level and, when Scope
 * sets a higher target, support for that target. It does not change the score.
 * A question with no `commonEvidence` items has no checklist.
 */
export function buildEvidenceReadiness(
  themes: Theme[],
  questions: Question[],
  scopeSelections: ScopeSelection[],
  answers: AssessmentAnswer[],
  presence: EvidencePresence[],
): ThemeEvidenceReadiness[] {
  const inScope = new Set(scopeSelections.filter((item) => item.inScope).map((item) => item.scopeId));
  const targetByScope = new Map(
    scopeSelections.map((item) => [item.scopeId, item.targetCapability as CapabilityScore | undefined]),
  );
  const scoreByQuestion = new Map(
    answers
      .filter((answer) => answer.selectedScore !== undefined)
      .map((answer) => [answer.questionId, answer.selectedScore as CapabilityScore]),
  );
  const keysByQuestion = new Map(presence.map((item) => [item.questionId, new Set(item.presentKeys)]));

  return themes.flatMap((theme) => {
    const themeQuestions = questions
      .filter((question) => question.themeId === theme.id && inScope.has(question.scopeId))
      .map((question) =>
        checklistForQuestion(
          question,
          scoreByQuestion.get(question.id),
          targetByScope.get(question.scopeId),
          keysByQuestion.get(question.id) ?? new Set(),
        ),
      );
    if (themeQuestions.length === 0) return [];
    return [{ themeId: theme.id, themeTitle: theme.title, questions: themeQuestions }];
  });
}
