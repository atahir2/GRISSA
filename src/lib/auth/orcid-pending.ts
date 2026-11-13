import { encode, decode } from "next-auth/jwt";
import { getAuthSecret } from "./auth-secret";
import { isOrcidId } from "./orcid";
import { publicAppUrl } from "./verification-email";

const SALT = "grissa-orcid-email";
const MAX_AGE_SECONDS = 15 * 60;

export async function orcidEmailCollectionUrl(orcid: string, name: string | null): Promise<string> {
  const pending = await encode({
    token: {
      sub: orcid,
      name: name?.trim() || null,
      purpose: "orcid-email",
    },
    secret: getAuthSecret(),
    salt: SALT,
    maxAge: MAX_AGE_SECONDS,
  });
  const url = new URL("/signup/orcid", publicAppUrl());
  url.searchParams.set("pending", pending);
  return url.toString();
}

export async function readOrcidPending(
  pending: string
): Promise<{ orcid: string; name: string } | null> {
  try {
    const payload = await decode({
      token: pending,
      secret: getAuthSecret(),
      salt: SALT,
    });
    if (!payload || payload.purpose !== "orcid-email") return null;
    const orcid = String(payload.sub ?? "").trim();
    if (!isOrcidId(orcid)) return null;
    const name = String(payload.name ?? "").trim().slice(0, 200);
    return { orcid, name };
  } catch {
    return null;
  }
}
