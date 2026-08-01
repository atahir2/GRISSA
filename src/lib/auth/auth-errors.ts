/**
 * User-facing copy for Supabase Auth errors (rate limits, etc.).
 */
export function formatAuthErrorMessage(message: string | null | undefined): string {
  if (!message) return "Something went wrong.";
  const m = message.toLowerCase();
  if (m.includes("rate limit") || m.includes("over_email_send_rate") || m.includes("email rate")) {
    return (
      "Too many verification emails were requested in a short time. Wait a few minutes and try again. " +
      "On the Supabase free tier, auth email volume is limited; repeated sign-up attempts count toward that limit. " +
      "If you need higher limits, configure custom SMTP or upgrade your Supabase plan."
    );
  }
  return message;
}
