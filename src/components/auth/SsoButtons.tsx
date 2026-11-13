"use client";

import { useEffect, useState } from "react";
import { signIn } from "next-auth/react";
import { appFetch } from "@/src/lib/base-path";

const buttonClass =
  "flex w-full items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-800 shadow-sm hover:bg-slate-50 disabled:opacity-50";

export function SsoButtons({ callbackUrl = "/saq" }: { callbackUrl?: string }) {
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
    void signIn(provider, { callbackUrl });
  }

  return (
    <div className="mt-4 space-y-2">
      <p className="text-center text-xs font-medium uppercase tracking-wide text-slate-400">or</p>
      <button type="button" onClick={() => start("google")} disabled={!enabled} className={buttonClass}>
        Continue with Google
      </button>
      <button type="button" onClick={() => start("orcid")} disabled={!enabled} className={buttonClass}>
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
