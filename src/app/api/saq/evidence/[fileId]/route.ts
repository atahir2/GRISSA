import { NextResponse } from "next/server";
import { getAssessmentRuntimeRepository } from "@/src/lib/saq/repositories/assessment.repository.selector";

export const runtime = "nodejs";

type RouteContext = { params: { fileId: string } };

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { record, bytes } = await getAssessmentRuntimeRepository().readEvidenceFile(context.params.fileId);
    const fileName = record.fileName.replace(/["\r\n]/g, "");
    return new NextResponse(new Uint8Array(bytes), {
      headers: {
        "Content-Type": record.contentType,
        "Content-Disposition": `attachment; filename="${fileName}"`,
        "X-Content-Type-Options": "nosniff",
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Download failed.";
    const status = /not found/i.test(message) ? 404 : /permission|access denied/i.test(message) ? 403 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    await getAssessmentRuntimeRepository().deleteEvidenceFile(context.params.fileId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not remove the file.";
    const status = /permission|draft|access denied/i.test(message) ? 403 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
