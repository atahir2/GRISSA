"use server";

import { createAssessment as createAssessmentPostgres } from "@/src/lib/saq/repositories/assessment.repository.postgres";

/**
 * Creates an assessment through the active repository provider.
 */
export async function createAssessmentAction(organisationName: string) {
  const name = organisationName.trim();
  if (!name) {
    throw new Error("Organisation name is required.");
  }
  return createAssessmentPostgres(name);
}
