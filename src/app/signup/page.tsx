import { SignupForm } from "@/components/auth/SignupForm";

const NOTICES: Record<string, string> = {
  "no-account":
    "No GRISSA account is linked to that Google or ORCID sign-in. Create an account here, then use the same button.",
};

export default function SignupPage({
  searchParams,
}: {
  searchParams: { notice?: string };
}) {
  return (
    <main className="min-h-screen bg-slate-50">
      <SignupForm notice={searchParams.notice ? NOTICES[searchParams.notice] : undefined} />
    </main>
  );
}
