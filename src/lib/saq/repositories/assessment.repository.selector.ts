import type { AssessmentRepository } from "./assessment.repository.interface";
import { assessmentRuntimeRepository as postgresRepository } from "./assessment.repository.postgres";
import { assessmentRuntimeRepository as supabaseRepository } from "./assessment.repository.supabase";

export type SaqDatabaseProvider = "supabase" | "postgres";

function getConfiguredProvider(): SaqDatabaseProvider {
  const raw = process.env.SAQ_DATABASE_PROVIDER?.toLowerCase();
  if (raw === "postgres") return "postgres";
  if (raw === "supabase") return "supabase";
  return "supabase";
}

export function getAssessmentRuntimeRepository(): AssessmentRepository {
  return getConfiguredProvider() === "postgres" ? postgresRepository : supabaseRepository;
}

export const assessmentRuntimeRepository = getAssessmentRuntimeRepository();

