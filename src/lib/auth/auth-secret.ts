export function getAuthSecret(): string {
  return process.env.NEXTAUTH_SECRET ?? process.env.AUTH_SECRET ?? "saq-local-dev-secret-change-in-production";
}
