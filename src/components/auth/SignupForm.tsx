"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { formatAuthErrorMessage } from "@/src/lib/auth/auth-errors";
import { GoogleSignInButton } from "@/src/components/auth/GoogleSignInButton";
import {
  COUNTRIES,
  INDUSTRIES,
  ORGANISATION_SIZES,
  validateOrganisationProfile,
} from "@/src/lib/auth/organisation-profile";
import { PASSWORD_MIN_LENGTH, PASSWORD_POLICY_MESSAGE, validatePassword } from "@/src/lib/auth/password-policy";
import { appFetch } from "@/src/lib/base-path";

const fieldClass =
  "mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500";

export function SignupForm() {
  const router = useRouter();
  const { data: session } = useSession();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [organisationName, setOrganisationName] = useState("");
  const [organisationSize, setOrganisationSize] = useState("");
  const [industry, setIndustry] = useState("");
  const [country, setCountry] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState<string | null>(null);
  const [verificationUrl, setVerificationUrl] = useState<string | null>(null);

  useEffect(() => {
    if (session) router.replace("/saq");
  }, [router, session]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!fullName.trim()) {
      setError("Full name is required.");
      return;
    }
    const profileError = validateOrganisationProfile({
      organisationName,
      organisationSize,
      industry,
      country,
    });
    if (profileError) {
      setError(profileError);
      return;
    }
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
      const registerRes = await appFetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          password,
          fullName: fullName.trim(),
          organisationName: organisationName.trim(),
          organisationSize,
          industry,
          country,
        }),
      });
      const text = await registerRes.text();
      let registerJson: { error?: string; emailSent?: boolean; verificationUrl?: string };
      try {
        registerJson = text
          ? (JSON.parse(text) as { error?: string; emailSent?: boolean; verificationUrl?: string })
          : {};
      } catch {
        setError(
          registerRes.ok
            ? "Unexpected response from server."
            : `Registration failed (HTTP ${registerRes.status}). Check that the deployment URL includes the app path (basePath) if you use one.`,
        );
        return;
      }
      if (!registerRes.ok) {
        setError(formatAuthErrorMessage(registerJson.error ?? "Failed to create account."));
        return;
      }

      setRegisteredEmail(email.trim());
      setVerificationUrl(registerJson.emailSent ? null : registerJson.verificationUrl ?? null);
      setFullName("");
      setEmail("");
      setOrganisationName("");
      setOrganisationSize("");
      setIndustry("");
      setCountry("");
      setPassword("");
      setConfirm("");
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-16 sm:px-6">
      <div className="rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-semibold text-slate-900">Create an account</h1>
        <p className="mt-2 text-sm text-slate-600">
          Sign up with email and password to save and manage your sustainability assessments.
        </p>
        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label htmlFor="signup-name" className="block text-sm font-medium text-slate-700">
              Full name
            </label>
            <input
              id="signup-name"
              type="text"
              autoComplete="name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
              className={fieldClass}
            />
          </div>
          <div>
            <label htmlFor="signup-email" className="block text-sm font-medium text-slate-700">
              Email
            </label>
            <input
              id="signup-email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className={fieldClass}
            />
          </div>
          <div>
            <label htmlFor="signup-company" className="block text-sm font-medium text-slate-700">
              Company name
            </label>
            <input
              id="signup-company"
              type="text"
              autoComplete="organization"
              value={organisationName}
              onChange={(e) => setOrganisationName(e.target.value)}
              required
              className={fieldClass}
            />
          </div>
          <div>
            <label htmlFor="signup-size" className="block text-sm font-medium text-slate-700">
              Organisation size
            </label>
            <select
              id="signup-size"
              value={organisationSize}
              onChange={(e) => setOrganisationSize(e.target.value)}
              required
              className={fieldClass}
            >
              <option value="">Select a size</option>
              {ORGANISATION_SIZES.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="signup-industry" className="block text-sm font-medium text-slate-700">
              Industry
            </label>
            <select
              id="signup-industry"
              value={industry}
              onChange={(e) => setIndustry(e.target.value)}
              required
              className={fieldClass}
            >
              <option value="">Select an industry</option>
              {INDUSTRIES.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="signup-country" className="block text-sm font-medium text-slate-700">
              Country
            </label>
            <select
              id="signup-country"
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              required
              autoComplete="country-name"
              className={fieldClass}
            >
              <option value="">Select a country</option>
              {COUNTRIES.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="signup-password" className="block text-sm font-medium text-slate-700">
              Password
            </label>
            <input
              id="signup-password"
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
            <label htmlFor="signup-confirm" className="block text-sm font-medium text-slate-700">
              Confirm password
            </label>
            <input
              id="signup-confirm"
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
            {loading ? "Creating account…" : "Create account"}
          </button>
        </form>
        <GoogleSignInButton />
        <p className="mt-6 text-center text-sm text-slate-600">
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-emerald-700 hover:text-emerald-800">
            Sign in
          </Link>
        </p>
        <p className="mt-4 text-center text-sm">
          <Link href="/saq" className="text-slate-500 hover:text-slate-700">
            Back to SAQ
          </Link>
        </p>
      </div>

      {registeredEmail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-4">
          <div className="w-full max-w-md rounded-xl border border-emerald-200 bg-white p-6 shadow-xl">
            <h2 className="text-lg font-semibold text-slate-900">Registration successful</h2>
            <p className="mt-2 text-sm text-slate-700">
              Your account for <strong>{registeredEmail}</strong> has been created.
              {verificationUrl
                ? " Email is not set up on this server yet, so no message was sent. Use the confirmation link below. It confirms the address and opens the login page."
                : " Check your inbox for a confirmation message. The link in that message confirms the address and opens the login page."}
            </p>
            {verificationUrl && (
              <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 p-3">
                <a
                  href={verificationUrl}
                  className="inline-flex w-full items-center justify-center rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-emerald-700"
                >
                  Confirm email and go to login
                </a>
                <p className="mt-3 break-all text-xs text-slate-600">{verificationUrl}</p>
              </div>
            )}
            <div className="mt-5 flex flex-wrap gap-2">
              {!verificationUrl && (
                <Link
                  href={`/login?registered=1`}
                  className="inline-flex items-center rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
                >
                  Go to login page
                </Link>
              )}
              <Link
                href="/saq"
                className="inline-flex items-center rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Go to home page
              </Link>
              <button
                type="button"
                onClick={() => setRegisteredEmail(null)}
                className="ml-auto text-sm text-slate-500 hover:text-slate-700"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
