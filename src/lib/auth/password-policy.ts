export const PASSWORD_MIN_LENGTH = 8;

export const PASSWORD_POLICY_MESSAGE =
  "Password must be at least 8 characters and include a letter, a number, and a special character.";

/** Returns an error message, or null when the password meets the policy. */
export function validatePassword(password: string): string | null {
  if (password.length < PASSWORD_MIN_LENGTH) return PASSWORD_POLICY_MESSAGE;
  if (!/[A-Za-z]/.test(password)) return PASSWORD_POLICY_MESSAGE;
  if (!/\d/.test(password)) return PASSWORD_POLICY_MESSAGE;
  if (!/[^A-Za-z0-9]/.test(password)) return PASSWORD_POLICY_MESSAGE;
  return null;
}
