"use client";

import type { ReactNode } from "react";
import { SessionProvider } from "next-auth/react";
import { withBasePath } from "@/src/lib/base-path";

/**
 * NextAuth client (`signIn`, `useSession`, CSRF) builds URLs from `NEXTAUTH_URL` only at module load.
 * With Next.js `basePath` (e.g. `/grissa`), env often sets `NEXTAUTH_URL` to `https://host/grissa`, which
 * parses to pathname `/grissa` — then requests miss `/api/auth` and hit `/grissa/session` (404).
 * Passing **`basePath={…/api/auth}`** matches where App Router mounts `[...nextauth]` (`withBasePath("/api/auth")`).
 */
export function AuthSessionProvider({ children }: { children: ReactNode }) {
  const nextAuthClientBasePath = withBasePath("/api/auth");
  return (
    <SessionProvider basePath={nextAuthClientBasePath}>{children}</SessionProvider>
  );
}

