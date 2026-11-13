import { NextResponse } from "next/server";
import { consumeVerificationToken, publicAppUrl } from "@/src/lib/auth/verification-email";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const email = String(url.searchParams.get("email") ?? "").trim().toLowerCase();
  const token = String(url.searchParams.get("token") ?? "").trim();
  const login = new URL("/login", publicAppUrl());

  if (!email || !token) {
    login.searchParams.set("error", "Confirmation link is incomplete.");
    return NextResponse.redirect(login);
  }

  const ok = await consumeVerificationToken(email, token);
  if (!ok) {
    login.searchParams.set("error", "This confirmation link is invalid or has expired.");
    return NextResponse.redirect(login);
  }

  login.searchParams.set("verified", "1");
  return NextResponse.redirect(login);
}
