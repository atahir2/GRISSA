import { AssessmentManagementWorkspace } from "@/src/components/saq/AssessmentManagementWorkspace";

interface PageProps {
  params: Promise<{ assessmentId: string }>;
}

export default async function SaqManageAssessmentPage({ params }: PageProps) {
  const { assessmentId } = await params;
  return <AssessmentManagementWorkspace assessmentId={assessmentId} />;
}

