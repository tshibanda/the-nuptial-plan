import { clerkClient, getAuth } from '@clerk/express';
import type { Request, Response, NextFunction } from 'express';
import { attachEnglishDemoData } from '../lib/attachEnglishDemoData';

/**
 * Express middleware that requires a valid Clerk session.
 * Attaches `req.userId` for use in downstream handlers.
 * Returns 401 if no authenticated session is found.
 */
export async function requireAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  const auth = getAuth(req);
  const userId = auth?.userId;

  if (!userId) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  // Attach for downstream use if needed
  (req as any).userId = userId;
  // The primary email is read from Clerk's verified user record so downstream
  // Premium checks can safely apply account-level access grants.
  try {
    const user = await clerkClient.users.getUser(userId);
    (req as any).userEmail = user.primaryEmailAddress?.emailAddress ?? null;
  } catch {
    // Authentication remains valid even if the profile lookup is temporarily
    // unavailable; email-based grants simply won't apply for this request.
    (req as any).userEmail = null;
  }
  try {
    await attachEnglishDemoData(userId, (req as any).userEmail);
  } catch (error) {
    req.log.error({ error, userId }, "Unable to prepare the Apple Review workspace");
  }
  next();
}
