import { NextResponse } from "next/server";
import type { AssessmentAnswer, ScopeSelection } from "@/src/lib/saq/assessment.types";
import type { AssessmentRole } from "@/src/lib/saq/permissions";
import type { ActionMetadata, AssessmentVersionUpdate } from "@/src/lib/saq/repositories/assessment.repository.interface";
import { getAssessmentRuntimeRepository } from "@/src/lib/saq/repositories/assessment.repository.selector";

type Body = {
  action: string;
  payload?: Record<string, unknown>;
};

export async function POST(request: Request) {
  try {
    const repo = getAssessmentRuntimeRepository();
    const { action, payload } = (await request.json()) as Body;
    switch (action) {
      case "createAssessment":
        return NextResponse.json(await repo.createAssessment(String(payload?.organisationName ?? "")));
      case "deleteAssessment":
        await repo.deleteAssessment(String(payload?.assessmentId ?? ""));
        return NextResponse.json({ ok: true });
      case "getAssessmentById":
        return NextResponse.json(await repo.getAssessmentById(String(payload?.assessmentId ?? "")));
      case "listAssessments":
        return NextResponse.json(await repo.listAssessments());
      case "saveScopeSelections":
        await repo.saveScopeSelections(
          String(payload?.assessmentId ?? ""),
          String(payload?.versionId ?? ""),
          (payload?.scopeSelections as ScopeSelection[]) ?? []
        );
        return NextResponse.json({ ok: true });
      case "loadScopeSelections":
        return NextResponse.json(
          await repo.loadScopeSelections(
            String(payload?.assessmentId ?? ""),
            String(payload?.versionId ?? "")
          )
        );
      case "saveAnswers":
        await repo.saveAnswers(
          String(payload?.assessmentId ?? ""),
          String(payload?.versionId ?? ""),
          (payload?.answers as AssessmentAnswer[]) ?? []
        );
        return NextResponse.json({ ok: true });
      case "loadAnswers":
        return NextResponse.json(
          await repo.loadAnswers(String(payload?.assessmentId ?? ""), String(payload?.versionId ?? ""))
        );
      case "saveActionMetadata":
        await repo.saveActionMetadata(
          String(payload?.assessmentId ?? ""),
          String(payload?.versionId ?? ""),
          (payload?.actionMetadataByQuestionId as Record<string, ActionMetadata>) ?? {}
        );
        return NextResponse.json({ ok: true });
      case "loadActionMetadata":
        return NextResponse.json(
          await repo.loadActionMetadata(
            String(payload?.assessmentId ?? ""),
            String(payload?.versionId ?? "")
          )
        );
      case "getAssessmentAccess":
        return NextResponse.json(await repo.getAssessmentAccess(String(payload?.assessmentId ?? "")));
      case "listAssessmentVersions":
        return NextResponse.json(await repo.listAssessmentVersions(String(payload?.assessmentId ?? "")));
      case "getLatestAssessmentVersion":
        return NextResponse.json(await repo.getLatestAssessmentVersion(String(payload?.assessmentId ?? "")));
      case "getAssessmentVersion":
        return NextResponse.json(
          await repo.getAssessmentVersion(
            String(payload?.assessmentId ?? ""),
            String(payload?.versionId ?? "")
          )
        );
      case "createAssessmentVersion":
        return NextResponse.json(
          await repo.createAssessmentVersion(
            String(payload?.assessmentId ?? ""),
            (payload?.label as string | null | undefined) ?? null
          )
        );
      case "updateAssessmentVersion":
        await repo.updateAssessmentVersion(
          String(payload?.assessmentId ?? ""),
          String(payload?.versionId ?? ""),
          (payload?.patch as AssessmentVersionUpdate) ?? {}
        );
        return NextResponse.json({ ok: true });
      case "listAssessmentCollaborators":
        return NextResponse.json(await repo.listAssessmentCollaborators(String(payload?.assessmentId ?? "")));
      case "addCollaboratorByEmail":
        await repo.addCollaboratorByEmail(
          String(payload?.assessmentId ?? ""),
          String(payload?.email ?? ""),
          String(payload?.role ?? "viewer") as Exclude<AssessmentRole, "owner">
        );
        return NextResponse.json({ ok: true });
      case "updateCollaboratorRole":
        await repo.updateCollaboratorRole(
          String(payload?.assessmentId ?? ""),
          String(payload?.collaboratorRowId ?? ""),
          String(payload?.role ?? "viewer") as Exclude<AssessmentRole, "owner">
        );
        return NextResponse.json({ ok: true });
      case "removeCollaborator":
        await repo.removeCollaborator(
          String(payload?.assessmentId ?? ""),
          String(payload?.collaboratorRowId ?? "")
        );
        return NextResponse.json({ ok: true });
      default:
        return NextResponse.json({ error: "Unknown repository action." }, { status: 400 });
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Repository request failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

