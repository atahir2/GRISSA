"use client";

import { useEffect, useState } from "react";
import { signIn } from "next-auth/react";
import { appFetch } from "@/src/lib/base-path";

export function GoogleSignInButton({ callbackUrl = "/saq" }: { callbackUrl?: string }) {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    let cancelled = false;
    appFetch("/api/auth/providers")
      .then(async (res) => (res.ok ? res.json() : null))
      .then((providers: { google?: unknown } | null) => {
        if (!cancelled && providers?.google) setEnabled(true);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  if (!enabled) return null;

  return (
    <button
      type="button"
      onClick={() => void signIn("google", { callbackUrl })}
      className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-800 shadow-sm hover:bg-slate-50"
    >
      Continue with Google
    </button>
  );
}
