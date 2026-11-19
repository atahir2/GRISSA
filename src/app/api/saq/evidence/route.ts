import { NextResponse } from "next/server";
import { EVIDENCE_MAX_BYTES } from "@/src/lib/saq/evidence-storage";
import { getAssessmentRuntimeRepository } from "@/src/lib/saq/repositories/assessment.repository.selector";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const form = await request.formData();
    const file = form.get("file");
    const assessmentId = String(form.get("assessmentId") ?? "");
    const versionId = String(form.get("versionId") ?? "");
    const questionId = String(form.get("questionId") ?? "");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Choose a file." }, { status: 400 });
    }
    if (file.size > EVIDENCE_MAX_BYTES) {
      return NextResponse.json({ error: "Evidence files must be under 10 MB." }, { status: 413 });
    }
    const bytes = Buffer.from(await file.arrayBuffer());
    const saved = await getAssessmentRuntimeRepository().addEvidenceFile(assessmentId, versionId, questionId, {
      fileName: file.name,
      bytes,
    });
    return NextResponse.json(saved);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Upload failed.";
    const status = /permission|draft|access denied/i.test(message) ? 403 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
