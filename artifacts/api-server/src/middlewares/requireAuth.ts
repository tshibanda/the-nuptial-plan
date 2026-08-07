import { getAuth } from '@clerk/express';
import type { Request, Response, NextFunction } from 'express';

/**
 * Express middleware that requires a valid Clerk session.
 * Attaches `req.userId` for use in downstream handlers.
 * Returns 401 if no authenticated session is found.
 */
export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const auth = getAuth(req);
  const userId = auth?.userId;

  if (!userId) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  // Attach for downstream use if needed
  (req as any).userId = userId;
  next();
}
