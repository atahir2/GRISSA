"use client";

import { useEffect, useState } from "react";
import { signIn } from "next-auth/react";
import { appFetch, withBasePath } from "@/src/lib/base-path";

/** NextAuth joins a leading-slash callback onto the site origin, which drops the base path. */
function oauthReturnPath(path: string): string {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  const base = (process.env.NEXT_PUBLIC_BASE_PATH ?? "").replace(/\/+$/, "");
  if (!base || normalized === base || normalized.startsWith(`${base}/`)) return normalized;
  return withBasePath(normalized);
}

const buttonClass =
  "flex w-full items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-800 shadow-sm hover:bg-slate-50 disabled:opacity-50";

function GoogleMark() {
  return (
    <svg viewBox="0 0 48 48" aria-hidden="true" className="h-5 w-5 shrink-0">
      <path
        fill="#FFC107"
        d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 8 3.1l5.7-5.7C34.2 6.1 29.4 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.7-.4-3.5z"
      />
      <path
        fill="#FF3D00"
        d="M6.3 14.7l6.6 4.8C14.7 16 19 12 24 12c3.1 0 5.8 1.2 8 3.1l5.7-5.7C34.2 6.1 29.4 4 24 4 16.3 4 9.6 8.3 6.3 14.7z"
      />
      <path
        fill="#4CAF50"
        d="M24 44c5.2 0 10-2 13.6-5.2l-6.3-5.3C29.3 35.1 26.8 36 24 36c-5.3 0-9.7-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"
      />
      <path
        fill="#1976D2"
        d="M43.6 20.5H42V20H24v8h11.3c-1.1 3.2-3.5 5.7-6.6 7.1l6.3 5.3C37.4 38.2 44 33 44 24c0-1.3-.1-2.7-.4-3.5z"
      />
    </svg>
  );
}

function OrcidMark() {
  return (
    <svg viewBox="0 0 256 256" aria-hidden="true" className="h-5 w-5 shrink-0">
      <path
        fill="#A6CE39"
        d="M256 128C256 57.3 198.7 0 128 0S0 57.3 0 128s57.3 128 128 128 128-57.3 128-128z"
      />
      <path
        fill="#fff"
        d="M86.3 186.2H70.9V79.1h15.4v107.1zM108.9 79.1h41.6c39.6 0 57 28.3 57 53.6 0 27.5-21.5 53.6-56.8 53.6h-41.8V79.1zm15.4 93.3h24.5c34.9 0 42.9-25.2 42.9-39.7 0-21.3-13.4-39.7-43.7-39.7h-23.7v79.4zM81.7 52.4c0 5.4-4.4 9.8-9.8 9.8s-9.8-4.4-9.8-9.8 4.4-9.8 9.8-9.8 9.8 4.4 9.8 9.8z"
      />
    </svg>
  );
}

export function SsoButtons({
  callbackUrl = "/saq",
  mode = "signup",
}: {
  callbackUrl?: string;
  /** Login must not create an account. Signup may. */
  mode?: "login" | "signup";
}) {
  const [enabled, setEnabled] = useState<{ google: boolean; orcid: boolean } | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    appFetch("/api/auth/providers")
      .then(async (res) => (res.ok ? res.json() : null))
      .then((providers: { google?: unknown; orcid?: unknown } | null) => {
        if (cancelled) return;
        setEnabled({
          google: Boolean(providers?.google),
          orcid: Boolean(providers?.orcid),
        });
      })
      .catch(() => {
        if (!cancelled) setEnabled({ google: false, orcid: false });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  function start(provider: "google" | "orcid") {
    setNotice(null);
    if (!enabled?.[provider]) {
      setNotice(
        provider === "google"
          ? "Google sign-in is not set up on this server yet."
          : "ORCID sign-in is not set up on this server yet."
      );
      return;
    }
    const secure = window.location.protocol === "https:" ? "; Secure" : "";
    document.cookie = `grissa_oauth_intent=${mode}; Path=/; Max-Age=600; SameSite=Lax${secure}`;
    // Always show the provider's account chooser. A shared browser must not reuse the previous person.
    const authorizationParams =
      provider === "google" ? { prompt: "select_account" } : { prompt: "login" };
    void signIn(provider, { callbackUrl: oauthReturnPath(callbackUrl) }, authorizationParams);
  }

  return (
    <div className="mt-4 space-y-2">
      <p className="text-center text-xs font-medium uppercase tracking-wide text-slate-400">or</p>
      <button type="button" onClick={() => start("google")} disabled={!enabled} className={buttonClass}>
        <GoogleMark />
        Continue with Google
      </button>
      <button type="button" onClick={() => start("orcid")} disabled={!enabled} className={buttonClass}>
        <OrcidMark />
        Continue with ORCID
      </button>
      {notice && (
        <p className="text-sm text-amber-800" role="status">
          {notice}
        </p>
      )}
    </div>
  );
}
