import { LoginForm } from "@/components/auth/LoginForm";

export default function LoginPage({
  searchParams,
}: {
  searchParams: { next?: string; error?: string; registered?: string };
}) {
  const initialInfo =
    searchParams.registered === "1"
      ? "Registration successful. You can now sign in with your email and password."
      : undefined;

  return (
    <main className="min-h-screen bg-slate-50">
      <LoginForm
        nextPath={searchParams.next}
        initialAuthError={searchParams.error}
        initialInfo={initialInfo}
      />
    </main>
  );
}
