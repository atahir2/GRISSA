import type { OAuthConfig, OAuthUserConfig } from "next-auth/providers/oauth";

export interface OrcidProfile extends Record<string, unknown> {
  sub: string;
  name?: string;
  given_name?: string;
  family_name?: string;
  email?: string;
}

/** Public API by default. Sandbox: ORCID_ISSUER=https://sandbox.orcid.org */
export function orcidIssuer(): string {
  return process.env.ORCID_ISSUER?.trim().replace(/\/$/, "") || "https://orcid.org";
}

/**
 * ORCID OAuth. Public clients use scope `openid` and often omit email.
 * Member clients that may read email should set ORCID_SCOPES=openid email.
 * Token exchange uses client_secret_post, which ORCID requires.
 */
export default function Orcid(
  options: OAuthUserConfig<OrcidProfile>
): OAuthConfig<OrcidProfile> {
  const issuer = orcidIssuer();
  const scope = process.env.ORCID_SCOPES?.trim() || "openid";
  return {
    id: "orcid",
    name: "ORCID",
    type: "oauth",
    issuer,
    wellKnown: `${issuer}/.well-known/openid-configuration`,
    authorization: { params: { scope } },
    client: { token_endpoint_auth_method: "client_secret_post" },
    checks: ["pkce", "state"],
    profile(profile) {
      const email = typeof profile.email === "string" ? profile.email : null;
      const combined = [profile.given_name, profile.family_name].filter(Boolean).join(" ");
      return {
        id: profile.sub,
        name: profile.name || combined || null,
        email,
        image: null,
      };
    },
    options,
  };
}

/** ORCID iDs are 16 digits in four groups; the last character may be X. */
export function isOrcidId(value: string): boolean {
  return /^\d{4}-\d{4}-\d{4}-\d{3}[\dX]$/i.test(value.trim());
}
