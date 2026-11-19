/** Stable codes thrown by the credentials provider and returned on the login page. */
export const AUTH_ERROR = {
  credentials: "CredentialsSignin",
  emailNotConfirmed: "EmailNotConfirmed",
  passwordNotSet: "PasswordNotSet",
  orcidEmailMissing: "OrcidEmailMissing",
} as const;

const MESSAGES: Record<string, string> = {
  [AUTH_ERROR.credentials]: "Incorrect email or password.",
  [AUTH_ERROR.emailNotConfirmed]:
    "Confirm your email before signing in. Use the link in the confirmation message.",
  [AUTH_ERROR.passwordNotSet]:
    "This account does not have a password. Continue with Google or ORCID, or use Forgot password to set one.",
  [AUTH_ERROR.orcidEmailMissing]:
    "ORCID did not share an email address. Enter the email you want to use for this account.",
  OAuthAccountNotLinked:
    "An account with this email already exists. Sign in with email and password, or with the service you used before.",
  OAuthSignin: "The sign-in service could not be started. Try again, or use email and password.",
  OAuthCallback: "The sign-in service did not complete. Try again.",
  OAuthCreateAccount: "The account could not be created from that sign-in service.",
  Callback: "Sign-in could not be completed. Try again.",
  AccessDenied: "Sign-in was cancelled or is not allowed for this account.",
  Configuration: "Sign-in is not configured correctly on this server.",
  Verification: "This confirmation link is invalid or has expired.",
};

/**
 * User-facing copy for sign-in failures. NextAuth otherwise shows raw codes such as CredentialsSignin.
 */
export function formatAuthErrorMessage(message: string | null | undefined): string {
  if (!message) return "Something went wrong.";
  const trimmed = message.trim();
  const known = MESSAGES[trimmed];
  if (known) return known;

  const lower = trimmed.toLowerCase();
  if (lower.includes("rate limit") || lower.includes("over_email_send_rate") || lower.includes("email rate")) {
    return "Too many messages were requested in a short time. Wait a few minutes and try again.";
  }
  if (/^[A-Za-z0-9]+$/.test(trimmed)) {
    return "Sign-in could not be completed. Check your details and try again.";
  }
  return trimmed;
}
