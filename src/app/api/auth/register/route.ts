import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getDb } from "@/src/lib/db/drizzle";
import { validateOrganisationProfile } from "@/src/lib/auth/organisation-profile";
import { validatePassword } from "@/src/lib/auth/password-policy";
import {
  issueVerificationLink,
  sendVerificationEmail,
  smtpConfigured,
  verificationLinkFingerprint,
} from "@/src/lib/auth/verification-email";
import { profiles, users } from "../../../../../drizzle/schema";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      email?: string;
      password?: string;
      fullName?: string;
      organisationName?: string;
      organisationSize?: string;
      industry?: string;
      country?: string;
    };

    const email = String(body.email ?? "").trim().toLowerCase();
    const password = String(body.password ?? "");
    const fullName = String(body.fullName ?? "").trim();
    const organisationName = String(body.organisationName ?? "").trim();
    const organisationSize = String(body.organisationSize ?? "").trim();
    const industry = String(body.industry ?? "").trim();
    const country = String(body.country ?? "").trim();

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required." }, { status: 400 });
    }
    if (!fullName) {
      return NextResponse.json({ error: "Full name is required." }, { status: 400 });
    }
    const passwordError = validatePassword(password);
    if (passwordError) {
      return NextResponse.json({ error: passwordError }, { status: 400 });
    }
    const profileError = validateOrganisationProfile({
      organisationName,
      organisationSize,
      industry,
      country,
    });
    if (profileError) {
      return NextResponse.json({ error: profileError }, { status: 400 });
    }

    const db = getDb();
    const [existing] = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);
    if (existing) {
      return NextResponse.json({ error: "An account with this email already exists." }, { status: 409 });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const [newUser] = await db
      .insert(users)
      .values({
        email,
        name: fullName,
        passwordHash,
        emailVerified: null,
      })
      .returning({ id: users.id });

    if (newUser?.id) {
      await db.insert(profiles).values({
        id: newUser.id,
        fullName,
        organisationName,
        organisationSize,
        industry,
        country,
      });
    }

    const verificationUrl = await issueVerificationLink(email);
    if (smtpConfigured()) {
      try {
        await sendVerificationEmail(email, verificationUrl);
      } catch (error) {
        console.error("Confirmation email failed", error);
        return NextResponse.json(
          {
            error:
              "The account was created, but the confirmation email could not be sent. Ask an operator to check SMTP settings.",
          },
          { status: 502 }
        );
      }
      return NextResponse.json({ ok: true, emailSent: true });
    }

    console.warn(
      `SMTP is not configured. Confirmation link fingerprint ${verificationLinkFingerprint(verificationUrl)} for ${email}`
    );
    return NextResponse.json({
      ok: true,
      emailSent: false,
      verificationUrl,
    });
  } catch {
    return NextResponse.json({ error: "Registration failed." }, { status: 500 });
  }
}
