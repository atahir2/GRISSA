"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { PASSWORD_MIN_LENGTH, PASSWORD_POLICY_MESSAGE, validatePassword } from "@/src/lib/auth/password-policy";
import { appFetch } from "@/src/lib/base-path";

const fieldClass =
  "mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500";

export function ResetPasswordForm({ email, token }: { email: string; token: string }) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const linkReady = Boolean(email && token);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    const passwordError = validatePassword(password);
    if (passwordError) {
      setError(passwordError);
      return;
    }
    setLoading(true);
    try {
      const res = await appFetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, token, password }),
      });
      const json = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setError(json.error ?? "The password could not be updated.");
        return;
      }
      router.push("/login?reset=1");
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-md px-4 py-16 sm:px-6">
      <div className="rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-semibold text-slate-900">Choose a new password</h1>
        {linkReady ? (
          <>
            <p className="mt-2 text-sm text-slate-600">
              Set a new password for <strong>{email}</strong>.
            </p>
            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              <div>
                <label htmlFor="reset-password" className="block text-sm font-medium text-slate-700">
                  New password
                </label>
                <input
                  id="reset-password"
                  type="password"
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={PASSWORD_MIN_LENGTH}
                  className={fieldClass}
                />
                <p className="mt-1 text-xs text-slate-500">{PASSWORD_POLICY_MESSAGE}</p>
              </div>
              <div>
                <label htmlFor="reset-confirm" className="block text-sm font-medium text-slate-700">
                  Confirm password
                </label>
                <input
                  id="reset-confirm"
                  type="password"
                  autoComplete="new-password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  required
                  className={fieldClass}
                />
              </div>
              {error && (
                <p className="text-sm text-red-600" role="alert">
                  {error}
                </p>
              )}
              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 disabled:opacity-50"
              >
                {loading ? "Saving…" : "Update password"}
              </button>
            </form>
          </>
        ) : (
          <p className="mt-4 text-sm text-red-600" role="alert">
            This reset link is incomplete. Request a new one from the sign-in page.
          </p>
        )}
        <p className="mt-6 text-center text-sm">
          <Link href="/forgot-password" className="font-medium text-emerald-700 hover:text-emerald-800">
            Request a new link
          </Link>
        </p>
      </div>
    </div>
  );
}
