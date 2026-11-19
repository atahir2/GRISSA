import { DrizzleAdapter } from "@auth/drizzle-adapter";
import bcrypt from "bcryptjs";
import { getServerSession, type NextAuthOptions } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import { and, eq } from "drizzle-orm";
import { cookies } from "next/headers";
import { withBasePath } from "@/src/lib/base-path";
import { getDb } from "@/src/lib/db/drizzle";
import { accounts, profiles, sessions, users, verificationTokens } from "../../../drizzle/schema";
import { AUTH_ERROR } from "./auth-errors";
import { getAuthSecret } from "./auth-secret";
import Orcid from "./orcid";
import { orcidEmailCollectionUrl } from "./orcid-pending";
import { appPathUrl } from "./verification-email";

function oauthIntent(): "login" | "signup" {
  try {
    return cookies().get("grissa_oauth_intent")?.value === "signup" ? "signup" : "login";
  } catch {
    return "login";
  }
}

/**
 * Only wire Drizzle when DATABASE_URL is set. `next build` (e.g. Docker) often runs
 * without DB env vars; session strategy is JWT, so the adapter is optional at build time.
 * Login still calls getDb() inside authorize() at runtime.
 */
function getDrizzleAuthAdapter() {
  if (!process.env.DATABASE_URL) return undefined;
  return DrizzleAdapter(getDb(), {
    usersTable: users,
    accountsTable: accounts,
    sessionsTable: sessions,
    verificationTokensTable: verificationTokens,
  });
}

function providerReady(id: string | undefined, secret: string | undefined): boolean {
  return Boolean(id?.trim() && secret?.trim());
}

export { getAuthSecret };

export const authOptions: NextAuthOptions = {
  adapter: getDrizzleAuthAdapter(),
  secret: getAuthSecret(),
  session: {
    strategy: "jwt",
  },
  providers: [
    ...(providerReady(process.env.GOOGLE_CLIENT_ID, process.env.GOOGLE_CLIENT_SECRET)
      ? [
          Google({
            clientId: process.env.GOOGLE_CLIENT_ID ?? "",
            clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
            allowDangerousEmailAccountLinking: true,
          }),
        ]
      : []),
    ...(providerReady(process.env.ORCID_CLIENT_ID, process.env.ORCID_CLIENT_SECRET)
      ? [
          Orcid({
            clientId: process.env.ORCID_CLIENT_ID ?? "",
            clientSecret: process.env.ORCID_CLIENT_SECRET ?? "",
            allowDangerousEmailAccountLinking: true,
          }),
        ]
      : []),
    Credentials({
      name: "Email and Password",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const email = String(credentials?.email ?? "").trim().toLowerCase();
        const password = String(credentials?.password ?? "");
        if (!email || !password) return null;

        const db = getDb();
        const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
        if (!user) return null;
        if (!user.passwordHash) {
          throw new Error(AUTH_ERROR.passwordNotSet);
        }
        const ok = await bcrypt.compare(password, user.passwordHash);
        if (!ok) return null;
        if (!user.emailVerified) {
          throw new Error(AUTH_ERROR.emailNotConfirmed);
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
        };
      },
    }),
  ],
  pages: {
    // NextAuth emits these as root-absolute Locations. Include the base path or nginx 404s.
    signIn: withBasePath("/login"),
    error: withBasePath("/login"),
  },
  callbacks: {
    async signIn({ user, account }) {
      const provider = account?.provider;
      if (provider !== "google" && provider !== "orcid") return true;

      const providerAccountId = String(account?.providerAccountId ?? "").trim();
      const email = user.email?.trim().toLowerCase() ?? "";
      const db = process.env.DATABASE_URL ? getDb() : null;
      const [linked] =
        db && providerAccountId
          ? await db
              .select({ userId: accounts.userId })
              .from(accounts)
              .where(and(eq(accounts.provider, provider), eq(accounts.providerAccountId, providerAccountId)))
              .limit(1)
          : [];
      const [byEmail] =
        db && email
          ? await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1)
          : [];
      const known = Boolean(linked || byEmail);

      if (oauthIntent() === "login" && !known) {
        const signup = appPathUrl("/signup");
        signup.searchParams.set("notice", "no-account");
        return signup.toString();
      }

      if (provider === "orcid" && !email && !linked) {
        if (!providerAccountId) return false;
        return orcidEmailCollectionUrl(providerAccountId, user.name ?? null);
      }
      return true;
    },
    redirect({ url, baseUrl }) {
      const origin = baseUrl.replace(/\/$/, "");
      const base = (process.env.NEXT_PUBLIC_BASE_PATH ?? "").replace(/\/+$/, "");
      const withPrefix = (path: string) => {
        if (!base || path === base || path.startsWith(`${base}/`)) return path;
        return `${base}${path.startsWith("/") ? path : `/${path}`}`;
      };
      if (url.startsWith("/")) return `${origin}${withPrefix(url)}`;
      try {
        const target = new URL(url);
        if (target.origin === origin) {
          target.pathname = withPrefix(target.pathname);
          return target.toString();
        }
      } catch {
        // Fall through to the app home.
      }
      return `${origin}${withPrefix("/saq")}`;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = String(token.sub ?? "");
      }
      return session;
    },
  },
  events: {
    async signIn({ user, account }) {
      if (!user.id || !process.env.DATABASE_URL) return;
      const db = getDb();
      if (account?.provider === "google" || account?.provider === "orcid") {
        const [row] = await db
          .select({ emailVerified: users.emailVerified })
          .from(users)
          .where(eq(users.id, user.id))
          .limit(1);
        if (row && !row.emailVerified) {
          await db.update(users).set({ emailVerified: new Date() }).where(eq(users.id, user.id));
        }
      }
      const [profile] = await db
        .select({ id: profiles.id })
        .from(profiles)
        .where(eq(profiles.id, user.id))
        .limit(1);
      if (!profile) {
        await db.insert(profiles).values({
          id: user.id,
          fullName: user.name ?? null,
        });
      }
    },
  },
};

export function auth() {
  return getServerSession(authOptions);
}
