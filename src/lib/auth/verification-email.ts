import { randomBytes } from "crypto";
import { and, eq } from "drizzle-orm";
import { getDb } from "@/src/lib/db/drizzle";
import { accounts, profiles, users, verificationTokens } from "../../../drizzle/schema";
import { isOrcidId } from "./orcid";
import { emailLinkHtml, sendAppEmail } from "./mail";
import { getPublicSiteUrl } from "./site-url";

const VERIFY_HOURS = 24;
const RESET_HOURS = 1;
const COOLDOWN_MS = 60_000;
const RESET_PREFIX = "reset:";
export const ORCID_LINK_PREFIX = "orcid-link:";

export function publicAppUrl(): string {
  const fromEnv = getPublicSiteUrl();
  if (fromEnv) return fromEnv;
  const nextAuth = process.env.NEXTAUTH_URL?.trim().replace(/\/$/, "");
  return nextAuth || "http://localhost:3000";
}

function appUrl(pathname: string, params: Record<string, string>): string {
  const url = new URL(pathname, publicAppUrl());
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }
  return url.toString();
}

type IssuedLink = { url: string; deliver: boolean };

async function issueToken(options: {
  identifier: string;
  hours: number;
  storedToken: string;
  url: string;
}): Promise<IssuedLink> {
  const db = getDb();
  const now = Date.now();
  const existing = await db
    .select()
    .from(verificationTokens)
    .where(eq(verificationTokens.identifier, options.identifier));
  const coolingDown = existing.some(
    (row) => row.expires.getTime() > now + options.hours * 60 * 60 * 1000 - COOLDOWN_MS
  );
  if (coolingDown) return { url: options.url, deliver: false };

  await db.delete(verificationTokens).where(eq(verificationTokens.identifier, options.identifier));
  await db.insert(verificationTokens).values({
    identifier: options.identifier,
    token: options.storedToken,
    expires: new Date(now + options.hours * 60 * 60 * 1000),
  });
  return { url: options.url, deliver: true };
}

export async function issueVerificationLink(email: string): Promise<IssuedLink> {
  const token = randomBytes(32).toString("hex");
  return issueToken({
    identifier: email,
    hours: VERIFY_HOURS,
    storedToken: token,
    url: appUrl("/api/auth/verify-email", { email, token }),
  });
}

export async function sendVerificationEmail(email: string, verificationUrl: string): Promise<void> {
  await sendAppEmail({
    to: email,
    subject: "Confirm your GRISSA account",
    text: `Confirm your email address and continue to the login page:\n\n${verificationUrl}\n\nThis link expires in ${VERIFY_HOURS} hours.`,
    html: `<p>Confirm your email address and continue to the login page.</p>${emailLinkHtml(verificationUrl, "Confirm and go to login")}<p>This link expires in ${VERIFY_HOURS} hours.</p>`,
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

export async function issuePasswordResetLink(email: string): Promise<IssuedLink> {
  const token = randomBytes(32).toString("hex");
  return issueToken({
    identifier: `${RESET_PREFIX}${email}`,
    hours: RESET_HOURS,
    storedToken: token,
    url: appUrl("/reset-password", { email, token }),
  });
}

export async function sendPasswordResetEmail(email: string, resetUrl: string): Promise<void> {
  await sendAppEmail({
    to: email,
    subject: "Reset your GRISSA password",
    text: `Choose a new password for your GRISSA account:\n\n${resetUrl}\n\nThis link expires in ${RESET_HOURS} hour. If you did not ask for this, you can ignore the message.`,
    html: `<p>Choose a new password for your GRISSA account.</p>${emailLinkHtml(resetUrl, "Choose a new password")}<p>This link expires in ${RESET_HOURS} hour. If you did not ask for this, you can ignore the message.</p>`,
  });
}

export async function consumePasswordResetToken(email: string, token: string): Promise<boolean> {
  const db = getDb();
  const identifier = `${RESET_PREFIX}${email}`;
  const [row] = await db
    .select()
    .from(verificationTokens)
    .where(and(eq(verificationTokens.identifier, identifier), eq(verificationTokens.token, token)))
    .limit(1);
  if (!row || row.expires.getTime() < Date.now()) {
    if (row) {
      await db
        .delete(verificationTokens)
        .where(and(eq(verificationTokens.identifier, identifier), eq(verificationTokens.token, token)));
    }
    return false;
  }
  await db
    .delete(verificationTokens)
    .where(and(eq(verificationTokens.identifier, identifier), eq(verificationTokens.token, token)));
  return true;
}

function encodeName(name: string): string {
  return Buffer.from(name.slice(0, 200), "utf8").toString("base64url");
}

function decodeName(value: string): string {
  try {
    return Buffer.from(value, "base64url").toString("utf8").slice(0, 200);
  } catch {
    return "";
  }
}

export async function issueOrcidLink(email: string, orcid: string, name: string): Promise<IssuedLink> {
  const secret = randomBytes(32).toString("hex");
  return issueToken({
    identifier: `${ORCID_LINK_PREFIX}${email}`,
    hours: VERIFY_HOURS,
    storedToken: `${secret}:${orcid}:${encodeName(name)}`,
    url: appUrl("/api/auth/orcid/confirm", { email, token: secret }),
  });
}

export async function sendOrcidLinkEmail(email: string, confirmUrl: string, orcid: string): Promise<void> {
  await sendAppEmail({
    to: email,
    subject: "Confirm your email to finish ORCID sign-in",
    text: `Finish signing in to GRISSA with ORCID iD ${orcid}:\n\n${confirmUrl}\n\nThis link expires in ${VERIFY_HOURS} hours. If you did not start ORCID sign-in, ignore this message.`,
    html: `<p>Finish signing in to GRISSA with ORCID iD ${orcid}.</p>${emailLinkHtml(confirmUrl, "Confirm email and continue")}<p>This link expires in ${VERIFY_HOURS} hours. If you did not start ORCID sign-in, ignore this message.</p>`,
  });
}

export type OrcidConfirmResult = "ok" | "invalid" | "taken";

/** Creates or links the account only after the person opens the emailed link. */
export async function confirmOrcidLink(email: string, secret: string): Promise<OrcidConfirmResult> {
  const db = getDb();
  const identifier = `${ORCID_LINK_PREFIX}${email}`;
  const rows = await db
    .select()
    .from(verificationTokens)
    .where(eq(verificationTokens.identifier, identifier));
  const row = rows.find((item) => item.token.startsWith(`${secret}:`));
  if (!row || row.expires.getTime() < Date.now()) {
    if (row) {
      await db.delete(verificationTokens).where(eq(verificationTokens.identifier, identifier));
    }
    return "invalid";
  }

  const [, orcid = "", namePart = ""] = row.token.split(":");
  if (!isOrcidId(orcid)) return "invalid";
  const fullName = decodeName(namePart).trim();

  return db.transaction(async (tx) => {
    const [linked] = await tx
      .select({ userId: accounts.userId })
      .from(accounts)
      .where(and(eq(accounts.provider, "orcid"), eq(accounts.providerAccountId, orcid)))
      .limit(1);

    const [existing] = await tx
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (linked && (!existing || linked.userId !== existing.id)) {
      await tx.delete(verificationTokens).where(eq(verificationTokens.identifier, identifier));
      return "taken";
    }

    let userId = existing?.id;
    if (!userId) {
      const [created] = await tx
        .insert(users)
        .values({
          email,
          name: fullName || null,
          emailVerified: new Date(),
          passwordHash: null,
        })
        .returning({ id: users.id });
      if (!created) return "invalid";
      userId = created.id;
    } else {
      await tx
        .update(users)
        .set({ emailVerified: new Date(), updatedAt: new Date() })
        .where(eq(users.id, userId));
    }

    if (!linked) {
      await tx.insert(accounts).values({
        userId,
        type: "oauth",
        provider: "orcid",
        providerAccountId: orcid,
      });
    }

    const [profile] = await tx
      .select({ id: profiles.id })
      .from(profiles)
      .where(eq(profiles.id, userId))
      .limit(1);
    if (!profile) {
      await tx.insert(profiles).values({
        id: userId,
        fullName: fullName || null,
      });
    }

    await tx.delete(verificationTokens).where(eq(verificationTokens.identifier, identifier));
    return "ok";
  });
}
