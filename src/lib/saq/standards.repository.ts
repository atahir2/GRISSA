import standardsData from "./standards.data.json";
import type { StandardEntry, StandardsCatalog } from "./standards.types";

const catalog = standardsData as StandardsCatalog;

export function getStandardsCatalog(): StandardEntry[] {
  return catalog.standards;
}

/** Short label for a catalog entry, preferring the acronym in parentheses. */
export function standardShortName(name: string): string {
  const acronym = name.match(/\(([^)]+)\)/);
  return acronym?.[1]?.trim() || name.trim();
}

/**
 * Clause line for the questionnaire. Unknown catalog ids are omitted.
 * A clause label is appended only when the reference includes one.
 */
export function formatStandardClauseLabel(
  standardId: string,
  clause: string | undefined,
  entries: StandardEntry[] = catalog.standards
): string | undefined {
  const entry = entries.find((item) => item.id === standardId);
  if (!entry) return undefined;
  const name = standardShortName(entry.name);
  const clauseLabel = clause?.trim();
  return clauseLabel ? `${name} ${clauseLabel}` : name;
}

export function standardMatchesBaseline(
  entry: StandardEntry,
  industry: string | null | undefined,
  operatingModel: string | null | undefined
): boolean {
  const industryMatch =
    !industry || entry.industries.includes("any") || entry.industries.includes(industry);
  const operatingMatch =
    !operatingModel ||
    entry.operatingModels.includes("any") ||
    entry.operatingModels.includes(operatingModel);
  return industryMatch && operatingMatch;
}
