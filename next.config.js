/** @type {import('next').NextConfig} */

/** Trim; avoid trailing slash unless you truly need "" at root only. Default: deploy at origin root. */
function resolveBasePath() {
  if (process.env.NEXT_PUBLIC_BASE_PATH === undefined) {
    return "";
  }
  return String(process.env.NEXT_PUBLIC_BASE_PATH).trim().replace(/\/+$/, "");
}

const resolvedBasePath = resolveBasePath();

const nextConfig = {
  /** Self-contained output for Docker / Node hosting (`node .next/standalone/server.js`). */
  output: "standalone",

  /**
   * Optional URL prefix — set at **build time** (e.g. NEXT_PUBLIC_BASE_PATH=/grisc-sa).
   * Root deploy: unset or NEXT_PUBLIC_BASE_PATH= (Dockerfile default empty).
   * Subpath: reverse-proxy must forward the full path to Node (/grisc-sa/... unchanged).
   * See scripts/nginx-subpath.example.conf
   */
  basePath: resolvedBasePath,

  // Expose base path to the client so auth redirects (e.g. emailRedirectTo) can use
  // origin + basePath. window.location.origin alone omits /grisc-sa and breaks Supabase links.
  env: {
    NEXT_PUBLIC_BASE_PATH: resolvedBasePath,
  },

  // /grisc-sa/ → /grisc-sa/saq when traffic hits Next (nginx should also redirect bare /grisc-sa).
  async redirects() {
    return [
      {
        source: "/",
        destination: "/saq",
        permanent: true,
      },
    ];
  },
};

module.exports = nextConfig;
