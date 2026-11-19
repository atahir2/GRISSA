import { OrcidEmailForm } from "@/components/auth/OrcidEmailForm";

export default function OrcidSignupPage({
  searchParams,
}: {
  searchParams: { pending?: string };
}) {
  return (
    <main className="min-h-screen bg-slate-50">
      <OrcidEmailForm pending={searchParams.pending ?? ""} />
    </main>
  );
}
