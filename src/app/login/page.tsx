import { LoginForm } from "@/components/auth/LoginForm";

export default function LoginPage({
  searchParams,
}: {
  searchParams: { next?: string; error?: string; registered?: string; verified?: string; reset?: string };
}) {
  const initialInfo =
    searchParams.verified === "orcid"
      ? "Email confirmed. Continue with ORCID to sign in."
      : searchParams.verified === "1"
        ? "Email confirmed. You can now sign in with your email and password."
        : searchParams.reset === "1"
          ? "Password updated. You can sign in with the new password."
          : searchParams.registered === "1"
            ? "We sent a confirmation message. Open it and use the link, then sign in here."
            : undefined;

  return (
    <main className="min-h-screen bg-slate-50">
      <LoginForm
        nextPath={searchParams.next}
        initialAuthError={searchParams.error}
        initialInfo={initialInfo}
        offerResend={searchParams.registered === "1"}
      />
    </main>
  );
}
