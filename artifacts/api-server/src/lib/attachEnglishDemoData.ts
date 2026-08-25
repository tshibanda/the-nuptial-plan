import { seedAppleReviewForOwner } from "./seedAppleReview";

const DEMO_EMAIL = "thenuptialplan2@yopmail.com";

/**
 * Clerk user IDs vary between environments and may be recreated. Populate the
 * dedicated review workspace only after its verified email authenticates.
 */
export async function attachEnglishDemoData(ownerId: string, email: string | null | undefined): Promise<void> {
  if (email?.trim().toLowerCase() !== DEMO_EMAIL) return;
  await seedAppleReviewForOwner(ownerId);
}