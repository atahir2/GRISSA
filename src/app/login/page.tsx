import { LoginForm } from "@/components/auth/LoginForm";

export default function LoginPage({
  searchParams,
}: {
  searchParams: { next?: string; error?: string; registered?: string; verified?: string };
}) {
  const initialInfo =
    searchParams.verified === "1"
      ? "Email confirmed. You can now sign in with your email and password."
      : searchParams.registered === "1"
        ? "Registration successful. Confirm your email, then sign in."
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
