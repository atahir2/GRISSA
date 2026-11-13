import { ResetPasswordForm } from "@/components/auth/ResetPasswordForm";

export default function ResetPasswordPage({
  searchParams,
}: {
  searchParams: { email?: string; token?: string };
}) {
  return (
    <main className="min-h-screen bg-slate-50">
      <ResetPasswordForm email={searchParams.email ?? ""} token={searchParams.token ?? ""} />
    </main>
  );
}
