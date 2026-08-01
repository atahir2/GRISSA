import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { createSupabaseMiddlewareClient } from "@/src/lib/supabase/middleware";

function authSecret(): string | undefined {
  return process.env.NEXTAUTH_SECRET ?? process.env.AUTH_SECRET;
}

/**
 * Middleware may see pathname with or without `basePath` depending on deployment;
 * comparisons use the logical route path (inside basePath when configured).
 */
function logicalPath(pathname: string): string {
  const base =
    typeof process.env.NEXT_PUBLIC_BASE_PATH === "string"
      ? process.env.NEXT_PUBLIC_BASE_PATH.trim().replace(/\/+$/, "")
      : "";
  if (base !== "" && (pathname === base || pathname.startsWith(`${base}/`))) {
    const rest = pathname.slice(base.length) || "/";
    return rest.startsWith("/") ? rest : `/${rest}`;
  }
  return pathname.startsWith("/") ? pathname : `/${pathname}`;
}

function setLoginRedirectPath(loginUrl: URL, request: NextRequest) {
  const nextFull = `${request.nextUrl.pathname}${request.nextUrl.search}`;
  loginUrl.searchParams.set("next", nextFull);
}

export default async function middleware(request: NextRequest) {
  let res = NextResponse.next({ request });

  const supabaseConfigured =
    Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()) &&
    Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim());

  if (supabaseConfigured) {
    const { supabase, response: supabaseRes } =
      createSupabaseMiddlewareClient(request);
    await supabase.auth.getUser();
    res = supabaseRes;
  }

  const pathname = logicalPath(request.nextUrl.pathname);
  const secret = authSecret();
  const token = secret
    ? await getToken({ req: request, secret })
    : null;

  const needsAuth =
    pathname.startsWith("/saq/assessment") ||
    pathname.startsWith("/saq/dashboard") ||
    pathname.startsWith("/saq/report");

  if (!needsAuth) {
    return res;
  }

  if (!token) {
    const loginUrl = request.nextUrl.clone();
    const base =
      typeof process.env.NEXT_PUBLIC_BASE_PATH === "string"
        ? process.env.NEXT_PUBLIC_BASE_PATH.trim().replace(/\/+$/, "")
        : "";
    loginUrl.pathname =
      base === "" ? "/login" : `${base}/login`;
    setLoginRedirectPath(loginUrl, request);

    const redirectRes = NextResponse.redirect(loginUrl);
    res.cookies.getAll().forEach((c) =>
      redirectRes.cookies.set(c.name, c.value),
    );

    return redirectRes;
  }

  return res;
}

/** Only workflows that must be guarded (omit public /saq, login, signup to avoid breakage). */
export const config = {
  matcher: [
    "/saq/assessment",
    "/saq/assessment/:path*",
    "/saq/dashboard/:path*",
    "/saq/report/:path*",
  ],
};
