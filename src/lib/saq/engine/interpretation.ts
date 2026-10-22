/**
 * Readiness Interpretation Layer for the Sustainability Self-Assessment (SAQ).
 *
 * This module takes existing, already-computed AssessmentResults and ActionPlan
 * outputs and derives human-readable interpretation text:
 * - overall readiness level
 * - short summary
 * - strengths
 * - improvement areas
 * - strategic recommendations
 *
 * It does not recompute scores and stays separate from scoring logic.
 */

import type { AssessmentResults, ThemeResult } from "./results";
import type { ActionPlan } from "./actions";

export type ReadinessLevel = "Early" | "Developing" | "Advanced";

export interface AssessmentInterpretation {
  readinessLevel: ReadinessLevel;
  summary: string;
  strengths: string[];
  improvementAreas: string[];
  strategicRecommendations: string[];
}

function computeReadinessLevel(results: AssessmentResults): ReadinessLevel {
  const s = results.summary;
  const completion = s.completionRate;
  const high = s.highPriorityCount;
  const med = s.mediumPriorityCount;
  const low = s.lowPriorityCount;
  const totalPriority = high + med + low || 1;
  const highShare = high / totalPriority;

  // Simple, transparent heuristics:
  // - Early: low completion or high issues dominating.
  if (completion < 40 || highShare > 0.6) {
    return "Early";
  }

  // - Advanced: high completion, low proportion of high-priority gaps.
  if (completion >= 70 && highShare < 0.25) {
    return "Advanced";
  }

  // - Otherwise: in-between.
  return "Developing";
}

function buildSummary(level: ReadinessLevel, results: AssessmentResults): string {
  const s = results.summary;
  const completionRounded = Math.round(s.completionRate);

  if (level === "Early") {
    return (
      `The organisation is at an early stage of sustainability readiness, ` +
      `with approximately ${completionRounded}% of in-scope questions answered ` +
      `and a significant number of high-priority gaps still to address. ` +
      `The immediate focus should be on closing the most critical gaps and completing the baseline.`
    );
  }

  if (level === "Advanced") {
    return (
      `The organisation shows an advanced level of sustainability readiness, ` +
      `with around ${completionRounded}% completion and relatively few high-priority gaps. ` +
      `The current baseline is a strong foundation for certification, standards alignment, audits, and continuous improvement.`
    );
  }

  // Developing
  return (
    `The organisation is developing its sustainability readiness, ` +
    `with around ${completionRounded}% completion and a balanced mix of priorities. ` +
    `There is a clear baseline in place and a focused set of improvements to plan and sequence next.`
  );
}

function pickThemeStrengths(themeResults: ThemeResult[]): string[] {
  const strengths: string[] = [];

  for (const theme of themeResults) {
    const ts = theme.summary;
    if (ts.totalQuestions === 0) continue;

    const completion = ts.completionRate;
    const hasHigherPassLevels = ts.passLevel2Count + ts.passLevel3Count > 0;
    const fewHighPriority = ts.highPriorityCount === 0;

    if (completion >= 70 && hasHigherPassLevels && fewHighPriority) {
      strengths.push(
        `The organisation demonstrates strong progress in ${theme.themeTitle.toLowerCase()}.`
      );
    }
  }

  // Fallback if no theme-specific strengths were identified.
  if (strengths.length === 0) {
    strengths.push(
      "The organisation has begun establishing a structured baseline for sustainability across multiple themes."
    );
  }

  return strengths;
}

function pickImprovementAreas(themeResults: ThemeResult[]): string[] {
  const areas: string[] = [];

  for (const theme of themeResults) {
    const ts = theme.summary;
    if (ts.totalQuestions === 0) continue;

    const completion = ts.completionRate;
    const manyHighPriority = ts.highPriorityCount > 0;

    if (completion < 60 || manyHighPriority) {
      areas.push(
        `${theme.themeTitle} requires further attention to improve capability levels and close high-priority gaps.`
      );
    }
  }

  // Limit to keep output readable.
  if (areas.length > 5) {
    return areas.slice(0, 5);
  }

  // Fallback if no specific areas detected.
  if (areas.length === 0) {
    areas.push(
      "There are still opportunities to strengthen selected sustainability themes and consolidate good practices."
    );
  }

  return areas;
}

function buildStrategicRecommendations(
  level: ReadinessLevel,
  strengths: string[],
  improvementAreas: string[],
  results: AssessmentResults,
  actionPlan: ActionPlan
): string[] {
  const recs: string[] = [];

  const hasHighPriority = results.summary.highPriorityCount > 0;
  const hasTargetsMet = results.summary.targetMetCount > 0;
  const hasActionItems = actionPlan.summary.totalActionItems > 0;

  // Generic governance and integration.
  recs.push(
    "Strengthen governance by clearly assigning responsibility for sustainability actions and following up on progress."
  );

  // Monitoring and KPIs.
  recs.push(
    "Expand monitoring of key environmental and sustainability KPIs so that progress against targets can be tracked over time."
  );

  if (hasHighPriority) {
    recs.push(
      "Focus first on high-priority gaps with significant impact, using the action plan to define short-term and medium-term milestones."
    );
  }

  if (hasTargetsMet) {
    recs.push(
      "Consolidate areas where targets are already met and use them as good-practice references for other themes."
    );
  }

  if (hasActionItems) {
    recs.push(
      "Translate the SAQ action plan into your internal project portfolio or roadmap, aligning timelines and responsibilities with existing processes."
    );
  }

  // Tailor slightly by readiness level.
  if (level === "Early") {
    recs.push(
      "Start by establishing a minimal, organisation-wide baseline and prioritise foundational practices before tackling more advanced improvements."
    );
  } else if (level === "Advanced") {
    recs.push(
      "Use the SAQ results as evidence input for certification, standards alignment, or regulatory reporting, and plan periodic reassessments to keep the baseline up to date."
    );
  }

  // De-duplicate while preserving order.
  const seen = new Set<string>();
  const unique: string[] = [];
  for (const r of recs) {
    if (!seen.has(r)) {
      seen.add(r);
      unique.push(r);
    }
  }

  return unique;
}

export function buildAssessmentInterpretation(
  results: AssessmentResults,
  actionPlan: ActionPlan
): AssessmentInterpretation {
  const readinessLevel = computeReadinessLevel(results);
  const summary = buildSummary(readinessLevel, results);
  const strengths = pickThemeStrengths(results.themeResults);
  const improvementAreas = pickImprovementAreas(results.themeResults);
  const strategicRecommendations = buildStrategicRecommendations(
    readinessLevel,
    strengths,
    improvementAreas,
    results,
    actionPlan
  );

  return {
    readinessLevel,
    summary,
    strengths,
    improvementAreas,
    strategicRecommendations,
  };
}

