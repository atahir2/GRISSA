import { createHash, randomBytes } from "crypto";
import { and, eq } from "drizzle-orm";
import nodemailer from "nodemailer";
import { getDb } from "@/src/lib/db/drizzle";
import { users, verificationTokens } from "../../../drizzle/schema";
import { getPublicSiteUrl } from "./site-url";

const TOKEN_HOURS = 24;

export function smtpConfigured(): boolean {
  return Boolean(process.env.SMTP_HOST?.trim() && process.env.EMAIL_FROM?.trim());
}

export function publicAppUrl(): string {
  const fromEnv = getPublicSiteUrl();
  if (fromEnv) return fromEnv;
  const nextAuth = process.env.NEXTAUTH_URL?.trim().replace(/\/$/, "");
  return nextAuth || "http://localhost:3000";
}

export async function issueVerificationLink(email: string): Promise<string> {
  const token = randomBytes(32).toString("hex");
  const db = getDb();
  const expires = new Date(Date.now() + TOKEN_HOURS * 60 * 60 * 1000);
  await db.delete(verificationTokens).where(eq(verificationTokens.identifier, email));
  await db.insert(verificationTokens).values({ identifier: email, token, expires });
  const url = new URL("/api/auth/verify-email", publicAppUrl());
  url.searchParams.set("email", email);
  url.searchParams.set("token", token);
  return url.toString();
}

export async function sendVerificationEmail(email: string, verificationUrl: string): Promise<void> {
  const port = Number(process.env.SMTP_PORT ?? 587);
  const transport = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port,
    secure: port === 465,
    auth:
      process.env.SMTP_USER && process.env.SMTP_PASS
        ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
        : undefined,
  });
  const from = process.env.EMAIL_FROM ?? "GRISSA <noreply@localhost>";
  await transport.sendMail({
    from,
    to: email,
    subject: "Confirm your GRISSA account",
    text: `Confirm your email address and continue to the login page:\n\n${verificationUrl}\n\nThis link expires in ${TOKEN_HOURS} hours.`,
    html: `<p>Confirm your email address and continue to the login page.</p><p><a href="${verificationUrl}">Confirm and go to login</a></p><p>This link expires in ${TOKEN_HOURS} hours.</p>`,
  });
}

export async function consumeVerificationToken(email: string, token: string): Promise<boolean> {
  const db = getDb();
  const [row] = await db
    .select()
    .from(verificationTokens)
    .where(and(eq(verificationTokens.identifier, email), eq(verificationTokens.token, token)))
    .limit(1);
  if (!row || row.expires.getTime() < Date.now()) {
    if (row) {
      await db
        .delete(verificationTokens)
        .where(and(eq(verificationTokens.identifier, email), eq(verificationTokens.token, token)));
    }
    return false;
  }
  await db.update(users).set({ emailVerified: new Date() }).where(eq(users.email, email));
  await db
    .delete(verificationTokens)
    .where(and(eq(verificationTokens.identifier, email), eq(verificationTokens.token, token)));
  return true;
}

/** Stable fingerprint so logs can be correlated without printing the raw token. */
export function verificationLinkFingerprint(url: string): string {
  return createHash("sha256").update(url).digest("hex").slice(0, 12);
}
