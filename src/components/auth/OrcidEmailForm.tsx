"use client";

import { useState } from "react";
import Link from "next/link";
import { appFetch } from "@/src/lib/base-path";

const fieldClass =
  "mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500";

export function OrcidEmailForm({ pending }: { pending: string }) {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await appFetch("/api/auth/orcid/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pending, email: email.trim() }),
      });
      const json = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setError(json.error ?? "The confirmation email could not be sent.");
        return;
      }
      setSent(true);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-md px-4 py-16 sm:px-6">
      <div className="rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-semibold text-slate-900">Finish ORCID sign-in</h1>
        <p className="mt-2 text-sm text-slate-600">
          ORCID did not share an email address. Enter the address you want on this account. We will send a
          confirmation link, and opening it connects that ORCID iD.
        </p>
        {sent ? (
          <p className="mt-6 text-sm text-emerald-800" role="status">
            We sent a confirmation message to <strong>{email}</strong>. Open it to finish signing in, then
            continue with ORCID on the login page.
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div>
              <label htmlFor="orcid-email" className="block text-sm font-medium text-slate-700">
                Email
              </label>
              <input
                id="orcid-email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
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
              disabled={loading || !pending}
              className="w-full rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 disabled:opacity-50"
            >
              {loading ? "Sending…" : "Send confirmation email"}
            </button>
            {!pending && (
              <p className="text-sm text-red-600" role="alert">
                This ORCID sign-in has expired. Start again from the login page.
              </p>
            )}
          </form>
        )}
        <p className="mt-6 text-center text-sm">
          <Link href="/login" className="font-medium text-emerald-700 hover:text-emerald-800">
            Back to sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
