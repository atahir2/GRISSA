import { DrizzleAdapter } from "@auth/drizzle-adapter";
import bcrypt from "bcryptjs";
import { getServerSession, type NextAuthOptions } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import { eq } from "drizzle-orm";
import { getDb } from "@/src/lib/db/drizzle";
import { profiles, users } from "../../../drizzle/schema";
import { AUTH_ERROR } from "./auth-errors";
import { getAuthSecret } from "./auth-secret";
import Orcid from "./orcid";
import { orcidEmailCollectionUrl } from "./orcid-pending";

/**
 * Only wire Drizzle when DATABASE_URL is set. `next build` (e.g. Docker) often runs
 * without DB env vars; session strategy is JWT, so the adapter is optional at build time.
 * Login still calls getDb() inside authorize() at runtime.
 */
function getDrizzleAuthAdapter() {
  if (!process.env.DATABASE_URL) return undefined;
  return DrizzleAdapter(getDb());
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
    signIn: "/login",
    error: "/login",
  },
  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider !== "orcid") return true;
      if (user.email?.trim()) return true;
      const orcid = String(account.providerAccountId ?? "").trim();
      if (!orcid) return false;
      return orcidEmailCollectionUrl(orcid, user.name ?? null);
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
