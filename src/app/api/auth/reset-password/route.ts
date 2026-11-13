import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { normalizeEmail } from "@/src/lib/auth/email-address";
import { validatePassword } from "@/src/lib/auth/password-policy";
import { consumePasswordResetToken } from "@/src/lib/auth/verification-email";
import { getDb } from "@/src/lib/db/drizzle";
import { users } from "../../../../../drizzle/schema";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { email?: string; token?: string; password?: string };
    const email = normalizeEmail(body.email);
    const token = String(body.token ?? "").trim();
    const password = String(body.password ?? "");
    if (!email || !token) {
      return NextResponse.json({ error: "This reset link is incomplete. Request a new one." }, { status: 400 });
    }
    const passwordError = validatePassword(password);
    if (passwordError) {
      return NextResponse.json({ error: passwordError }, { status: 400 });
    }

    const ok = await consumePasswordResetToken(email, token);
    if (!ok) {
      return NextResponse.json(
        { error: "This reset link is invalid or has expired. Request a new one." },
        { status: 400 }
      );
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const db = getDb();
    await db
      .update(users)
      .set({ passwordHash, emailVerified: new Date(), updatedAt: new Date() })
      .where(eq(users.email, email));
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Password reset failed", error);
    return NextResponse.json({ error: "The password could not be updated." }, { status: 500 });
  }
}
