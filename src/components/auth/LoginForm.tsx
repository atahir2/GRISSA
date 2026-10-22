"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn, useSession } from "next-auth/react";
import { safeNextPath } from "@/src/lib/auth/safe-redirect";
import { formatAuthErrorMessage } from "@/src/lib/auth/auth-errors";

interface LoginFormProps {
  nextPath?: string;
  /** Set when redirecting from /auth/callback with a failed auth exchange */
  initialAuthError?: string;
  initialInfo?: string;
}

export function LoginForm({ nextPath, initialAuthError, initialInfo }: LoginFormProps) {
  const router = useRouter();
  const { data: session } = useSession();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info] = useState<string | null>(initialInfo ?? null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!initialAuthError) return;
    try {
      setError(formatAuthErrorMessage(decodeURIComponent(initialAuthError)));
    } catch {
      setError(formatAuthErrorMessage(initialAuthError));
    }
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

  return (
    <div className="mx-auto max-w-md px-4 py-16 sm:px-6">
      <div className="rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-semibold text-slate-900">Sign in</h1>
        <p className="mt-2 text-sm text-slate-600">
          Use your email and password to access your assessments.
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
            <label htmlFor="login-password" className="block text-sm font-medium text-slate-700">
              Password
            </label>
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
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 disabled:opacity-50"
          >
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </form>
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
