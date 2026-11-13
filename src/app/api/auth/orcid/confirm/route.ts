import { NextResponse } from "next/server";
import { normalizeEmail } from "@/src/lib/auth/email-address";
import { confirmOrcidLink, publicAppUrl } from "@/src/lib/auth/verification-email";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const email = normalizeEmail(url.searchParams.get("email"));
  const token = String(url.searchParams.get("token") ?? "").trim();
  const login = new URL("/login", publicAppUrl());

  if (!email || !token) {
    login.searchParams.set("error", "Confirmation link is incomplete.");
    return NextResponse.redirect(login);
  }

  const result = await confirmOrcidLink(email, token);
  if (result === "taken") {
    login.searchParams.set("error", "This ORCID iD is already connected to another account.");
    return NextResponse.redirect(login);
  }
  if (result !== "ok") {
    login.searchParams.set("error", "This confirmation link is invalid or has expired.");
    return NextResponse.redirect(login);
  }

  login.searchParams.set("verified", "orcid");
  return NextResponse.redirect(login);
}
