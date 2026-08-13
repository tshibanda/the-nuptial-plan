/**
 * POST /api/revenuecat/webhook
 *
 * Receives real-time lifecycle events from RevenueCat so the server stays
 * accurate even when the app is closed.
 *
 * Security: RevenueCat sends an Authorization header whose value must match
 * the REVENUECAT_WEBHOOK_SECRET environment variable. Requests without the
 * correct secret are rejected with 401 before any DB writes occur.
 *
 * Identity: The mobile client sets the RevenueCat app_user_id to the Clerk
 * user ID. That is the authoritative owner identifier used here.
 *
 * Out-of-order safety: RevenueCat retries unacknowledged events and does not
 * guarantee delivery order. All writes are monotonic on currentPeriodEnd —
 * an event for an older period never overwrites a row that already reflects a
 * later one. Specifically:
 *   • If the incoming event's currentPeriodEnd is null and the stored row
 *     already has a non-null one, the event is skipped.
 *   • If both are non-null and the incoming value is strictly older than the
 *     stored one, the event is skipped.
 *
 * Handled events:
 *   INITIAL_PURCHASE | RENEWAL  → status = active, cancelAtPeriodEnd = false
 *   CANCELLATION                → status = active, cancelAtPeriodEnd = true
 *                                 (auto-renew off; entitled until period end)
 *   UNCANCELLATION              → status = active, cancelAtPeriodEnd = false
 *   EXPIRATION                  → status = canceled
 *
 * All other event types are acknowledged (200) and ignored.
 */

import { Router } from "express";
import { eq } from "drizzle-orm";
import { db, subscriptionsTable } from "@workspace/db";
import { logger } from "../lib/logger";

const router = Router();

const ENTITLEMENT_IDENTIFIER = "TNP Premium";

// Mounted at /api/revenuecat/webhook — path here is just "/"
router.post("/", async (req, res) => {
  // ── 1. Verify shared secret ────────────────────────────────────────────────
  const secret = process.env.REVENUECAT_WEBHOOK_SECRET;
  if (!secret) {
    logger.warn("REVENUECAT_WEBHOOK_SECRET is not set — rejecting webhook");
    res.status(503).json({ error: "Webhook secret not configured." });
    return;
  }

  const authHeader = req.headers["authorization"] ?? "";
  if (authHeader !== secret) {
    logger.warn("RevenueCat webhook received with invalid Authorization header");
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  // ── 2. Parse payload ───────────────────────────────────────────────────────
  const event = req.body?.event;
  if (!event || typeof event !== "object") {
    res.status(400).json({ error: "Invalid payload: missing event object." });
    return;
  }

  const eventType: string = event.type ?? "";

  // The mobile client sets app_user_id to the signed-in Clerk user ID.
  const ownerId: string = event.app_user_id ?? "";
  if (!ownerId) {
    res.status(400).json({ error: "Invalid payload: missing app_user_id." });
    return;
  }

  logger.info({ eventType, ownerId }, "RevenueCat webhook received");

  // ── 3. Route by event type ─────────────────────────────────────────────────
  const HANDLED = new Set([
    "INITIAL_PURCHASE",
    "RENEWAL",
    "CANCELLATION",
    "UNCANCELLATION",
    "EXPIRATION",
  ]);
  if (!HANDLED.has(eventType)) {
    res.json({ received: true, action: "ignored" });
    return;
  }

  // ── 4. Derive common fields from event ────────────────────────────────────
  const expiresAtMs: number | null = event.expiration_at_ms ?? null;
  const incomingPeriodEnd: Date | null = expiresAtMs ? new Date(expiresAtMs) : null;

  const productId: string = event.product_id ?? "";
  const isAnnual = productId.toLowerCase().includes("annual");
  const plan: "monthly" | "annual" = isAnnual ? "annual" : "monthly";

  const periodType: string = event.period_type ?? "";

  const rowId = `revenuecat_${ownerId}`;

  // ── 5. Read existing row for monotonic comparison ─────────────────────────
  try {
    const [existing] = await db
      .select({
        currentPeriodEnd: subscriptionsTable.currentPeriodEnd,
      })
      .from(subscriptionsTable)
      .where(eq(subscriptionsTable.id, rowId))
      .limit(1);

    const storedPeriodEnd: Date | null = existing?.currentPeriodEnd ?? null;

    // Skip if this event's period end is strictly older than what we already
    // have stored. Both null means we have no period info — apply.
    const isStale =
      storedPeriodEnd !== null &&
      (incomingPeriodEnd === null || incomingPeriodEnd < storedPeriodEnd);

    if (isStale) {
      logger.info(
        { eventType, ownerId, storedPeriodEnd, incomingPeriodEnd },
        "RevenueCat webhook skipped — stale event for older period",
      );
      res.json({ received: true, action: "ignored_stale" });
      return;
    }

    // ── 6. Compute target state ──────────────────────────────────────────────
    let status: "active" | "trialing" | "canceled";
    let cancelAtPeriodEnd: boolean;

    switch (eventType) {
      case "INITIAL_PURCHASE":
      case "RENEWAL":
        status = periodType === "TRIAL" ? "trialing" : "active";
        cancelAtPeriodEnd = false;
        break;
      case "CANCELLATION":
        // Auto-renew disabled; planner is still entitled until period end.
        status = periodType === "TRIAL" ? "trialing" : "active";
        cancelAtPeriodEnd = true;
        break;
      case "UNCANCELLATION":
        status = periodType === "TRIAL" ? "trialing" : "active";
        cancelAtPeriodEnd = false;
        break;
      case "EXPIRATION":
        status = "canceled";
        cancelAtPeriodEnd = false;
        break;
      default:
        // Unreachable — HANDLED guard above covers all cases
        res.json({ received: true, action: "ignored" });
        return;
    }

    // ── 7. Upsert ─────────────────────────────────────────────────────────────
    await db
      .insert(subscriptionsTable)
      .values({
        id: rowId,
        ownerId,
        provider: "revenuecat",
        status,
        plan,
        currentPeriodEnd: incomingPeriodEnd,
        cancelAtPeriodEnd,
        entitlementId: ENTITLEMENT_IDENTIFIER,
      })
      .onConflictDoUpdate({
        target: subscriptionsTable.id,
        set: {
          status,
          plan,
          currentPeriodEnd: incomingPeriodEnd,
          cancelAtPeriodEnd,
          entitlementId: ENTITLEMENT_IDENTIFIER,
          updatedAt: new Date(),
        },
      });

    logger.info({ eventType, ownerId, status, cancelAtPeriodEnd, plan }, "RevenueCat webhook applied");
    res.json({ received: true, action: "applied", status, cancelAtPeriodEnd });
  } catch (error) {
    logger.error({ error, eventType, ownerId }, "RevenueCat webhook DB write failed");
    res.status(500).json({ error: "Internal error applying webhook." });
  }
});

export default router;
