/**
 * Core scoring and prioritisation logic for the Sustainability Self-Assessment (SAQ).
 *
 * This module is intentionally UI-agnostic and side-effect free: all functions are
 * pure and operate only on their inputs.
 */

// ---------------------------------------------------------------------------
// Basic types
// ---------------------------------------------------------------------------

/**
 * Qualitative impact levels used for magnitude and likelihood.
 */
export type ImpactLevel = "High" | "Medium" | "Low";

/**
 * Capability score levels taken from the questionnaire answer options.
 */
export type CapabilityScore = 1 | 2 | 3;

/**
 * Overall improvement priority derived from impact magnitude and likelihood.
 */
export type ImprovementPriority = "High" | "Medium" | "Low";

/**
 * Effort required to implement a given action.
 */
export type EffortRequired = "Low" | "Medium" | "High";

/**
 * High-level implementation priority bucket, used for action planning.
 */
export type ImplementationPriority =
  | "Immediate"
  | "Urgent"
  | "Planned"
  | "Low Priority"
  | "No Action Needed";

/**
 * Status of whether a capability target has been met.
 */
export type TargetStatus = "Met" | "Below Target" | "No Target";

/**
 * Simple pass/fail status for capability thresholds.
 */
export type PassStatus = "Pass" | "Fail" | "Not Applicable";

// ---------------------------------------------------------------------------
// Core scoring functions
// ---------------------------------------------------------------------------

/**
 * Compute an improvement priority from impact magnitude and likelihood.
 *
 * Rules:
 * - High + High → High
 * - High + Medium → High
 * - Medium + High → High
 * - Medium + Medium → Medium
 * - all other combinations → Low
 */
export function getImprovementPriority(
  impactMagnitude: ImpactLevel,
  impactLikelihood: ImpactLevel
): ImprovementPriority {
  const m = impactMagnitude;
  const l = impactLikelihood;

  if (
    (m === "High" && l === "High") ||
    (m === "High" && l === "Medium") ||
    (m === "Medium" && l === "High")
  ) {
    return "High";
  }

  if (m === "Medium" && l === "Medium") {
    return "Medium";
  }

  return "Low";
}

/**
 * Determine pass/fail status for a capability threshold.
 *
 * Rules:
 * - if inScope is false → "Not Applicable"
 * - if selectedScore is undefined → "Fail"
 * - if selectedScore >= threshold → "Pass"
 * - else → "Fail"
 */
export function getCapabilityPassStatus(
  selectedScore: CapabilityScore | undefined,
  threshold: CapabilityScore,
  inScope: boolean
): PassStatus {
  if (!inScope) {
    return "Not Applicable";
  }

  if (selectedScore === undefined) {
    return "Fail";
  }

  return selectedScore >= threshold ? "Pass" : "Fail";
}

/**
 * Determine the status of a target capability in relation to the selected score.
 *
 * Rules:
 * - if inScope is false → "Not Applicable"
 * - if targetCapability is undefined → "No Target"
 * - if selectedScore is defined and selectedScore >= targetCapability → "Met"
 * - otherwise → "Below Target"
 */
export function getTargetStatus(
  selectedScore: CapabilityScore | undefined,
  targetCapability: CapabilityScore | undefined,
  inScope: boolean
): TargetStatus | "Not Applicable" {
  if (!inScope) {
    return "Not Applicable";
  }

  if (targetCapability === undefined) {
    return "No Target";
  }

  if (selectedScore !== undefined && selectedScore >= targetCapability) {
    return "Met";
  }

  return "Below Target";
}

const EFFORT_SIZE_LABEL: Record<EffortRequired, "S" | "M" | "L"> = {
  Low: "S",
  Medium: "M",
  High: "L",
};

/**
 * Screen label for a stored effort value. S/M/L map to Low/Medium/High.
 */
export function effortSizeLabel(effort: EffortRequired): "S" | "M" | "L" {
  return EFFORT_SIZE_LABEL[effort];
}

/**
 * Effort label for reports. A suggestion that has not been saved is marked.
 */
export function formatEffortLabel(effort: EffortRequired, suggested = false): string {
  const label = effortSizeLabel(effort);
  return suggested ? `${label} (suggested)` : label;
}

/**
 * Levels still short of the topic target. Positive means below target.
 * Undefined when the target or the recorded level is missing.
 */
export function getCapabilityGap(
  selectedScore: CapabilityScore | undefined,
  targetCapability: CapabilityScore | undefined
): number | undefined {
  if (selectedScore === undefined || targetCapability === undefined) {
    return undefined;
  }
  return targetCapability - selectedScore;
}

/**
 * Short label for the gap used on the action plan and report.
 */
export function formatCapabilityGap(gap: number | undefined): string {
  if (gap === undefined) return "No target";
  if (gap <= 0) return "On target";
  if (gap === 1) return "Gap of 1 level";
  return `Gap of ${gap} levels`;
}

/**
 * Suggest an effort size when none has been saved.
 * Callers must keep a saved value and use this only while the field is empty.
 *
 * Gap is the topic target minus the recorded level.
 * - No target or no answer: High improvement priority → Medium, otherwise Low.
 * - On target or ahead: Low.
 * - One level short: Low improvement priority → Low, otherwise Medium.
 * - Two or more levels short: High improvement priority → High, otherwise Medium.
 */
export function suggestEffort(
  improvementPriority: ImprovementPriority,
  capabilityGap: number | undefined
): EffortRequired {
  if (capabilityGap === undefined) {
    return improvementPriority === "High" ? "Medium" : "Low";
  }
  if (capabilityGap <= 0) return "Low";
  if (capabilityGap === 1) {
    return improvementPriority === "Low" ? "Low" : "Medium";
  }
  return improvementPriority === "High" ? "High" : "Medium";
}

const IMPLEMENTATION_SCALE: ImplementationPriority[] = [
  "No Action Needed",
  "Low Priority",
  "Planned",
  "Urgent",
  "Immediate",
];

/**
 * Move an implementation priority by the gap to target.
 * One level short leaves the matrix result. A wider gap makes it one step
 * more urgent. Meeting or passing the target makes it one step less urgent.
 * A missing gap does not move the result.
 */
export function adjustImplementationPriorityForGap(
  priority: ImplementationPriority,
  capabilityGap: number | undefined
): ImplementationPriority {
  if (capabilityGap === undefined || capabilityGap === 1) return priority;
  const index = IMPLEMENTATION_SCALE.indexOf(priority);
  const shift = capabilityGap >= 2 ? 1 : -1;
  const next = Math.min(IMPLEMENTATION_SCALE.length - 1, Math.max(0, index + shift));
  return IMPLEMENTATION_SCALE[next];
}

/**
 * Compute an implementation priority from improvement priority, effort, and
 * the optional gap to target.
 *
 * Base matrix (improvement priority + effort):
 * - High + Low → Immediate
 * - High + Medium → Urgent
 * - High + High → Planned
 *
 * - Medium + Low → Urgent
 * - Medium + Medium → Planned
 * - Medium + High → Low Priority
 *
 * - Low + Low → Planned
 * - Low + Medium → Low Priority
 * - Low + High → No Action Needed
 *
 * The gap then shifts that result by one step, as in
 * adjustImplementationPriorityForGap. Improvement priority itself is unchanged.
 */
export function getImplementationPriority(
  improvementPriority: ImprovementPriority,
  effortRequired: EffortRequired,
  capabilityGap?: number
): ImplementationPriority {
  const p = improvementPriority;
  const e = effortRequired;
  let base: ImplementationPriority;

  if (p === "High") {
    if (e === "Low") base = "Immediate";
    else if (e === "Medium") base = "Urgent";
    else base = "Planned";
  } else if (p === "Medium") {
    if (e === "Low") base = "Urgent";
    else if (e === "Medium") base = "Planned";
    else base = "Low Priority";
  } else if (e === "Low") {
    base = "Planned";
  } else if (e === "Medium") {
    base = "Low Priority";
  } else {
    base = "No Action Needed";
  }

  return adjustImplementationPriorityForGap(base, capabilityGap);
}

/**
 * Resolve the recommended action text for a given selected capability score.
 *
 * Rules:
 * - return the recommendedAction corresponding to the selected score
 * - if selectedScore is undefined, return undefined
 */
export function getRecommendedActionForScore(
  selectedScore: CapabilityScore | undefined,
  answerOptions: { score: CapabilityScore; recommendedAction: string }[]
): string | undefined {
  if (selectedScore === undefined) {
    return undefined;
  }

  const match = answerOptions.find(
    (opt) => opt.score === selectedScore
  );

  return match?.recommendedAction;
}

// ---------------------------------------------------------------------------
// Helper functions
// ---------------------------------------------------------------------------

/**
 * Compute improvement priority for a question based on the selected answer option.
 *
 * Rules:
 * - find the answer option matching selectedScore
 * - compute improvement priority from its magnitude and likelihood
 * - if selectedScore is undefined, return undefined
 */
export function getQuestionImprovementPriority(
  answerOptions: {
    score: CapabilityScore;
    impactMagnitude: ImpactLevel;
    impactLikelihood: ImpactLevel;
  }[],
  selectedScore: CapabilityScore | undefined
): ImprovementPriority | undefined {
  if (selectedScore === undefined) {
    return undefined;
  }

  const match = answerOptions.find(
    (opt) => opt.score === selectedScore
  );

  if (!match) {
    return undefined;
  }

  return getImprovementPriority(
    match.impactMagnitude,
    match.impactLikelihood
  );
}

