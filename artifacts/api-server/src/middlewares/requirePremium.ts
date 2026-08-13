import { and, desc, eq, inArray, isNotNull, or } from "drizzle-orm";
import type { Request, Response, NextFunction } from "express";
import { db, subscriptionsTable } from "@workspace/db";
import { hasPremiumEmailAccess } from "../lib/premium-access";

const ACTIVE_STATUSES = ["active", "trialing"] as const;

/**
 * Express middleware that requires an active (or trialing) premium subscription.
 *
 * Must be placed after `requireAuth` and `requireWeddingOwnership` so that
 * `req.userId` is already populated.
 *
 * Checks `subscriptionsTable` for:
 *  - An `active` or `trialing` row belonging to the authenticated user, AND
 *  - `currentPeriodEnd` is null (lifetime / Stripe trial) or in the future.
 *
 * Rows are written by:
 *  - Stripe webhook processing (provider = "stripe")
 *  - POST /api/subscription/sync, which calls RevenueCat server-side to verify
 *    before writing (provider = "revenuecat")
 *
 * Returns 403 `{ error, code: "PREMIUM_REQUIRED" }` when no valid subscription
 * is found.
 */
export async function requirePremium(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const userId = (req as Request & { userId?: string }).userId;

  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const userEmail = (req as Request & { userEmail?: string | null }).userEmail;
  if (hasPremiumEmailAccess(userEmail)) {
    next();
    return;
  }

  const now = new Date();

  const [subscription] = await db
    .select({
      id: subscriptionsTable.id,
      status: subscriptionsTable.status,
      currentPeriodEnd: subscriptionsTable.currentPeriodEnd,
    })
    .from(subscriptionsTable)
    .where(
      and(
        eq(subscriptionsTable.ownerId, userId),
        inArray(subscriptionsTable.status, [...ACTIVE_STATUSES]),
        or(
          eq(subscriptionsTable.provider, "revenuecat"),
          and(
            eq(subscriptionsTable.provider, "stripe"),
            isNotNull(subscriptionsTable.providerSubscriptionId),
          ),
        ),
      ),
    )
    .orderBy(desc(subscriptionsTable.updatedAt))
    .limit(1);

  if (!subscription) {
    res
      .status(403)
      .json({ error: "Premium subscription required.", code: "PREMIUM_REQUIRED" });
    return;
  }

  // Reject if the subscription period has ended.
  // `currentPeriodEnd` is null for Stripe trials (no fixed end in the DB at
  // checkout time) — treat null as not expired.
  if (subscription.currentPeriodEnd && subscription.currentPeriodEnd < now) {
    res
      .status(403)
      .json({ error: "Premium subscription has expired.", code: "PREMIUM_REQUIRED" });
    return;
  }

  next();
}
