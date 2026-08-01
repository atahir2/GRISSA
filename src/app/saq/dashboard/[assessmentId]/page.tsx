import { Suspense } from "react";
import { AssessmentDashboard } from "@/components/saq/AssessmentDashboard";

interface PageProps {
  params: Promise<{ assessmentId: string }>;
}

export default async function DashboardPage({ params }: PageProps) {
  const { assessmentId } = await params;
  return (
    <Suspense
      fallback={
        <main className="min-h-0 flex-1 bg-transparent">
          <div className="mx-auto max-w-6xl px-4 py-16 text-center text-slate-400">Loading…</div>
        </main>
      }
    >
      <AssessmentDashboard assessmentId={assessmentId} />
    </Suspense>
  );
}
