/**
 * Public base URL for auth redirects (email confirmation, magic links).
 *
 * - Prefer NEXT_PUBLIC_SITE_URL in production: must include subpath if the app uses basePath,
 *   e.g. https://host/grisc-sa (not just https://host — Supabase emails would miss /grisc-sa).
 * - If unset in the browser, uses origin + NEXT_PUBLIC_BASE_PATH (origin alone drops /grisc-sa).
 */
export function getPublicSiteUrl(): string {
  const env = process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/$/, "");
  if (env) return env;

  if (typeof window !== "undefined") {
    const origin = window.location.origin;
    const basePath = (process.env.NEXT_PUBLIC_BASE_PATH ?? "").replace(/\/$/, "");
    if (basePath) {
      return `${origin}${basePath}`.replace(/\/$/, "");
    }
    return origin;
  }

  return "";
}
