import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { normalizeEmail } from "@/src/lib/auth/email-address";
import { smtpConfigured, smtpNotReadyMessage } from "@/src/lib/auth/mail";
import { issueVerificationLink, sendVerificationEmail } from "@/src/lib/auth/verification-email";
import { getDb } from "@/src/lib/db/drizzle";
import { users } from "../../../../../drizzle/schema";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { email?: string };
    const email = normalizeEmail(body.email);
    if (!email) {
      return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
    }
    if (!smtpConfigured()) {
      return NextResponse.json({ error: smtpNotReadyMessage() }, { status: 503 });
    }

    const db = getDb();
    const [user] = await db
      .select({ id: users.id, emailVerified: users.emailVerified })
      .from(users)
      .where(eq(users.email, email))
      .limit(1);
    if (user && !user.emailVerified) {
      const issued = await issueVerificationLink(email);
      if (issued.deliver) await sendVerificationEmail(email, issued.url);
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Confirmation email failed", error);
    return NextResponse.json(
      { error: "The confirmation email could not be sent. Try again later." },
      { status: 502 }
    );
  }
}
