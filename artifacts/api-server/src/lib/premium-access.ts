/**
 * Accounts granted Premium access by the application team.
 *
 * Keep this list deliberately small and normalized. Server-side access checks
 * use the verified primary email from Clerk, never a client-supplied address.
 */
const PREMIUM_EMAIL_ALLOWLIST = new Set([
  "e.tshibanda78@gmail.com",
  "thenuptialplan@yopmail.com",
]);

export function hasPremiumEmailAccess(email: string | null | undefined): boolean {
  return Boolean(email && PREMIUM_EMAIL_ALLOWLIST.has(email.trim().toLowerCase()));
}