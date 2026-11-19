import { Suspense } from "react";
import { AssessmentLayout } from "@/components/saq/AssessmentLayout";

interface PageProps {
  params: Promise<{ assessmentId: string }>;
}

export default async function SaqAssessmentPage({ params }: PageProps) {
  const { assessmentId } = await params;
  return (
    <Suspense
      fallback={
        <main className="min-h-0 flex-1 bg-transparent">
          <div className="mx-auto max-w-5xl px-4 py-16 text-center text-slate-400">Loading…</div>
        </main>
      }
    >
      <AssessmentLayout assessmentId={assessmentId} />
    </Suspense>
  );
}
