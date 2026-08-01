function normalizeBase(): string {
  return (process.env.NEXT_PUBLIC_BASE_PATH ?? "").trim().replace(/\/+$/, "");
}

/**
 * Prefix routes, API paths, and static files with `NEXT_PUBLIC_BASE_PATH` when set.
 * `<Link>`/`router` honour basePath automatically; **raw `fetch("/api/…")` does not**.
 */
export function withBasePath(pathFromAppRoot: string): string {
  const path = pathFromAppRoot.startsWith("/")
    ? pathFromAppRoot
    : `/${pathFromAppRoot}`;
  const base = normalizeBase();
  return base === "" ? path : `${base}${path}`;
}

/**
 * Files in `public/` (and `next/image` quirks with `unoptimized`). Same as `withBasePath`.
 */
export function assetUrl(pathFromPublicRoot: string): string {
  return withBasePath(pathFromPublicRoot);
}

/**
 * Same-origin fetch for app-relative paths (`/api/*`, …). Applies `NEXT_PUBLIC_BASE_PATH` automatically.
 */
export function appFetch(path: string, init?: RequestInit): Promise<Response> {
  return fetch(withBasePath(path), init);
}
