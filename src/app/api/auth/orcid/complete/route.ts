import { NextResponse } from "next/server";
import { normalizeEmail } from "@/src/lib/auth/email-address";
import { smtpConfigured, smtpNotReadyMessage } from "@/src/lib/auth/mail";
import { readOrcidPending } from "@/src/lib/auth/orcid-pending";
import { issueOrcidLink, sendOrcidLinkEmail } from "@/src/lib/auth/verification-email";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { pending?: string; email?: string };
    const email = normalizeEmail(body.email);
    const pending = await readOrcidPending(String(body.pending ?? ""));
    if (!email) {
      return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
    }
    if (!pending) {
      return NextResponse.json(
        { error: "This ORCID sign-in has expired. Start again from the login page." },
        { status: 400 }
      );
    }
    if (!smtpConfigured()) {
      return NextResponse.json({ error: smtpNotReadyMessage() }, { status: 503 });
    }

    const issued = await issueOrcidLink(email, pending.orcid, pending.name);
    if (issued.deliver) await sendOrcidLinkEmail(email, issued.url, pending.orcid);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("ORCID confirmation email failed", error);
    return NextResponse.json(
      { error: "The confirmation email could not be sent. Try again later." },
      { status: 502 }
    );
  }
}
