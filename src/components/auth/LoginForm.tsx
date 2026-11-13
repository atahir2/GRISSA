"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn, useSession } from "next-auth/react";
import { safeNextPath } from "@/src/lib/auth/safe-redirect";
import { AUTH_ERROR, formatAuthErrorMessage } from "@/src/lib/auth/auth-errors";
import { SsoButtons } from "@/src/components/auth/SsoButtons";
import { appFetch } from "@/src/lib/base-path";

interface LoginFormProps {
  nextPath?: string;
  /** Set when redirecting from /auth/callback with a failed auth exchange */
  initialAuthError?: string;
  initialInfo?: string;
  offerResend?: boolean;
}

export function LoginForm({ nextPath, initialAuthError, initialInfo, offerResend = false }: LoginFormProps) {
  const router = useRouter();
  const { data: session } = useSession();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(initialInfo ?? null);
  const [loading, setLoading] = useState(false);
  const [resendVisible, setResendVisible] = useState(offerResend);
  const [resending, setResending] = useState(false);

  useEffect(() => {
    if (!initialAuthError) return;
    const raw = (() => {
      try {
        return decodeURIComponent(initialAuthError);
      } catch {
        return initialAuthError;
      }
    })();
    setResendVisible(raw === AUTH_ERROR.emailNotConfirmed);
    setError(formatAuthErrorMessage(raw));
  }, [initialAuthError]);

  useEffect(() => {
    if (session) router.replace(safeNextPath(nextPath));
  }, [nextPath, router, session]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const result = await signIn("credentials", {
        email: email.trim(),
        password,
        redirect: false,
      });
      if (result?.error) {
        setResendVisible(result.error === AUTH_ERROR.emailNotConfirmed);
        setError(
          formatAuthErrorMessage(result.error ?? "Sign in failed. Please check your credentials.")
        );
        return;
      }
      router.push(safeNextPath(nextPath));
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  async function resendConfirmation() {
    setError(null);
    if (!email.trim()) {
      setError("Enter your email address first.");
      return;
    }
    setResending(true);
    try {
      const res = await appFetch("/api/auth/resend-confirmation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      const json = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setError(json.error ?? "The confirmation email could not be sent.");
        return;
      }
      setInfo("If that address is waiting for confirmation, we sent another message.");
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setResending(false);
    }
  }

  return (
    <div className="mx-auto max-w-md px-4 py-16 sm:px-6">
      <div className="rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-semibold text-slate-900">Sign in</h1>
        <p className="mt-2 text-sm text-slate-600">
          Use your email and password, or continue with Google or ORCID.
        </p>
        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label htmlFor="login-email" className="block text-sm font-medium text-slate-700">
              Email
            </label>
            <input
              id="login-email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>
          <div>
            <div className="flex items-center justify-between">
              <label htmlFor="login-password" className="block text-sm font-medium text-slate-700">
                Password
              </label>
              <Link href="/forgot-password" className="text-sm font-medium text-emerald-700 hover:text-emerald-800">
                Forgot password?
              </Link>
            </div>
            <input
              id="login-password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>
          {error && (
            <p className="text-sm text-red-600" role="alert">
              {error}
            </p>
          )}
          {info && (
            <p className="text-sm text-emerald-800" role="status">
              {info}
            </p>
          )}
          {resendVisible && (
            <button
              type="button"
              onClick={() => void resendConfirmation()}
              disabled={resending}
              className="text-sm font-medium text-emerald-700 hover:text-emerald-800 disabled:opacity-50"
            >
              {resending ? "Sending…" : "Resend confirmation email"}
            </button>
          )}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 disabled:opacity-50"
          >
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </form>
        <SsoButtons callbackUrl={nextPath || "/saq"} />
        <p className="mt-6 text-center text-sm text-slate-600">
          No account?{" "}
          <Link href="/signup" className="font-medium text-emerald-700 hover:text-emerald-800">
            Create an account
          </Link>
        </p>
        <p className="mt-4 text-center text-sm">
          <Link href="/saq" className="text-slate-500 hover:text-slate-700">
            Back to SAQ
          </Link>
        </p>
      </div>
    </div>
  );
}
