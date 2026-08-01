import { DrizzleAdapter } from "@auth/drizzle-adapter";
import bcrypt from "bcryptjs";
import { getServerSession, type NextAuthOptions } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { eq } from "drizzle-orm";
import { getDb } from "@/src/lib/db/drizzle";
import { users } from "../../../drizzle/schema";

const devFallbackSecret = "saq-local-dev-secret-change-in-production";

/**
 * Only wire Drizzle when DATABASE_URL is set. `next build` (e.g. Docker) often runs
 * without DB env vars; session strategy is JWT, so the adapter is optional at build time.
 * Login still calls getDb() inside authorize() at runtime.
 */
function getDrizzleAuthAdapter() {
  if (!process.env.DATABASE_URL) return undefined;
  return DrizzleAdapter(getDb());
}

export function getAuthSecret(): string {
  return process.env.NEXTAUTH_SECRET ?? process.env.AUTH_SECRET ?? devFallbackSecret;
}

export const authOptions: NextAuthOptions = {
  adapter: getDrizzleAuthAdapter(),
  secret: getAuthSecret(),
  session: {
    strategy: "jwt",
  },
  providers: [
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
        if (!user?.passwordHash) return null;
        const ok = await bcrypt.compare(password, user.passwordHash);
        if (!ok) return null;

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
  },
  callbacks: {
    session({ session, token }) {
      if (session.user) {
        session.user.id = String(token.sub ?? "");
      }
      return session;
    },
  },
};

export function auth() {
  return getServerSession(authOptions);
}

