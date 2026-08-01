import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createSupabaseMiddlewareClient } from "@/src/lib/supabase/middleware";

/**
 * Route protection via Auth.js session.
 * Supabase auth middleware is isolated and no longer used as the primary path.
 */
export default async function middleware(request: NextRequest) {
  const { supabase, response } = createSupabaseMiddlewareClient(request);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const path = request.nextUrl.pathname;
  const needsAuth =
    path.startsWith("/saq/assessment") ||
    path.startsWith("/saq/dashboard") ||
    path.startsWith("/saq/report");

  if (needsAuth && !user) {
    const login = new URL("/login", request.url);
    login.searchParams.set("next", `${request.nextUrl.pathname}${request.nextUrl.search}`);
    const redirectResponse = NextResponse.redirect(login);
    response.cookies.getAll().forEach((cookie) => {
      redirectResponse.cookies.set(cookie.name, cookie.value);
    });
    return redirectResponse;
  }
  return response;
}

export const config = {
  matcher: [
    "/saq",
    "/saq/",
    "/saq/:path*",
    "/login",
    "/login/:path*",
  ],
};
