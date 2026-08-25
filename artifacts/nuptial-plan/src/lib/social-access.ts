export const SOCIALS_ACCESS_EMAIL = 'e.tshibanda78@gmail.com';

export function canAccessSocials(email: string | null | undefined): boolean {
  return email?.trim().toLowerCase() === SOCIALS_ACCESS_EMAIL;
}