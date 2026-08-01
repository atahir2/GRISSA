import { NextResponse } from "next/server";
import { createClient } from "@/src/lib/supabase/server";
import { safeNextPath } from "@/src/lib/auth/safe-redirect";

const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

/** Absolute app path on this origin (e.g. /grisc-sa/saq), required when Next uses basePath. */
function appUrl(origin: string, path: string) {
  const p = path.startsWith("/") ? path : `/${path}`;
  return new URL(`${basePath}${p}`, origin);
}

/**
 * OAuth / legacy email flows: exchanges ?code= for a session and redirects into the app.
 * Email signup should use /saq directly (see SignupForm); this route remains for OAuth.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = safeNextPath(searchParams.get("next"));

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      const login = appUrl(origin, "/login");
      login.searchParams.set("error", error.message);
      return NextResponse.redirect(login);
    }
  }

  return NextResponse.redirect(appUrl(origin, next));
}
