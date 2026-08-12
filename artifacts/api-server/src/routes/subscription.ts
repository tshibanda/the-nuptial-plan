import { Router, type Request } from "express";
import { and, desc, eq } from "drizzle-orm";
import { db, subscriptionsTable } from "@workspace/db";
import { getUncachableStripeClient } from "../stripeClient";
import { getUncachableRevenueCatClient } from "../revenueCatClient";
import { listCustomerActiveEntitlements } from "@replit/revenuecat-sdk";

const router = Router();
const MONTHLY_LOOKUP_KEY = "tnp_monthly_eur";
const ANNUAL_LOOKUP_KEY = "tnp_annual_eur";
const ENTITLEMENT_IDENTIFIER = "premium";
const RC_PROJECT_ID = process.env.REVENUECAT_PROJECT_ID ?? "";

function owner(req: Request): string {
  return (req as Request & { userId?: string }).userId ?? "";
}

function nextMonthTimestamp(): number {
  const date = new Date();
  date.setMonth(date.getMonth() + 1);
  return Math.floor(date.getTime() / 1000);
}

function planFromLookupKey(lookupKey: string | null | undefined): "monthly" | "annual" {
  return lookupKey === ANNUAL_LOOKUP_KEY ? "annual" : "monthly";
}

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------

router.get("/plans", async (_req, res) => {
  const stripe = await getUncachableStripeClient();
  const prices = await stripe.prices.list({
    active: true,
    type: "recurring",
    lookup_keys: [MONTHLY_LOOKUP_KEY, ANNUAL_LOOKUP_KEY],
    limit: 10,
  });
  res.json({
    data: prices.data.map((price) => ({
      id: price.id,
      lookupKey: price.lookup_key,
      plan: planFromLookupKey(price.lookup_key),
      amount: price.unit_amount,
      currency: price.currency,
      interval: price.recurring?.interval,
      trialMonths: 1,
    })),
  });
});

router.get("/status", async (req, res) => {
  const [subscription] = await db.select().from(subscriptionsTable)
    .where(eq(subscriptionsTable.ownerId, owner(req)))
    .orderBy(desc(subscriptionsTable.updatedAt))
    .limit(1);
  res.json({ subscription: subscription ?? null });
});

router.post("/checkout", async (req, res) => {
  const ownerId = owner(req);
  const lookupKey = req.body?.lookupKey === ANNUAL_LOOKUP_KEY ? ANNUAL_LOOKUP_KEY : MONTHLY_LOOKUP_KEY;
  const stripe = await getUncachableStripeClient();
  const prices = await stripe.prices.list({ active: true, lookup_keys: [lookupKey], limit: 1 });
  const price = prices.data[0];
  if (!price) {
    res.status(503).json({ error: "Subscription price is not configured in Stripe yet." });
    return;
  }

  const [existing] = await db.select().from(subscriptionsTable)
    .where(and(eq(subscriptionsTable.ownerId, ownerId), eq(subscriptionsTable.provider, "stripe")))
    .limit(1);
  const customer = existing?.providerCustomerId
    ? existing.providerCustomerId
    : (await stripe.customers.create({ metadata: { ownerId } })).id;
  const baseUrl = `${req.protocol}://${req.get("host")}`;
  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer,
    line_items: [{ price: price.id, quantity: 1 }],
    success_url: `${baseUrl}/parametres?subscription=success`,
    cancel_url: `${baseUrl}/parametres?subscription=cancelled`,
    subscription_data: { trial_end: nextMonthTimestamp(), metadata: { ownerId, plan: planFromLookupKey(lookupKey) } },
    metadata: { ownerId, plan: planFromLookupKey(lookupKey) },
  });
  await db.insert(subscriptionsTable).values({
    id: `stripe_${ownerId}`,
    ownerId,
    provider: "stripe",
    status: "trialing",
    plan: planFromLookupKey(lookupKey),
    trialEndsAt: new Date(nextMonthTimestamp() * 1000),
    providerCustomerId: customer,
  }).onConflictDoUpdate({
    target: subscriptionsTable.id,
    set: { plan: planFromLookupKey(lookupKey), status: "trialing", providerCustomerId: customer, updatedAt: new Date() },
  });
  res.json({ url: session.url });
});

/**
 * POST /subscription/sync
 *
 * Called by the mobile app after a RevenueCat purchase or restore, and on
 * initial app load when the client SDK reports an active entitlement.
 *
 * The server independently verifies the entitlement using the Replit-managed
 * RevenueCat integration client (`getUncachableRevenueCatClient`), which uses
 * integration-level credentials — no public SDK keys are involved.
 *
 * Security model:
 *  - The mobile triggers the sync with only a `platform` hint; no entitlement
 *    data from the client is trusted or stored.
 *  - On a SUCCESSFUL API response with NO active "premium" entitlement, the
 *    server marks any existing RevenueCat row as "canceled".
 *  - On API failure (network error, auth issue, rate limit), the existing DB
 *    row is PRESERVED and a 503 is returned so the client can retry. A failing
 *    sync never revokes a paying user's access.
 */
router.post("/sync", async (req, res) => {
  const ownerId = owner(req);

  if (!RC_PROJECT_ID) {
    // RevenueCat not configured — skip gracefully so mobile still loads
    res.status(503).json({ error: "RevenueCat project not configured.", code: "RC_NOT_CONFIGURED" });
    return;
  }

  let client: Awaited<ReturnType<typeof getUncachableRevenueCatClient>>;
  try {
    client = await getUncachableRevenueCatClient();
  } catch {
    // Cannot reach RevenueCat integration — preserve existing DB state
    res.status(503).json({ error: "RevenueCat integration unavailable.", code: "RC_UNAVAILABLE" });
    return;
  }

  // Call RevenueCat REST API server-side with integration-managed credentials
  const { data: entitlementsPage, error } = await listCustomerActiveEntitlements({
    client,
    path: {
      project_id: RC_PROJECT_ID,
      customer_id: ownerId, // Clerk user ID == RevenueCat app_user_id
    },
  });

  if (error) {
    // Verification failed due to an API error — do NOT revoke existing access.
    // The client should retry after a delay.
    res.status(503).json({ error: "Could not verify subscription with RevenueCat.", code: "RC_VERIFY_FAILED" });
    return;
  }

  // Find the active premium entitlement in the response items
  const items: any[] = (entitlementsPage as any)?.items ?? [];
  const premiumEntitlement = items.find(
    (e: any) => e.entitlement?.lookup_key === ENTITLEMENT_IDENTIFIER || e.lookup_key === ENTITLEMENT_IDENTIFIER,
  );

  if (!premiumEntitlement) {
    // Confirmed by RevenueCat: no active premium entitlement.
    // Revoke the stored row so requirePremium denies access.
    await db
      .update(subscriptionsTable)
      .set({ status: "canceled", updatedAt: new Date() })
      .where(
        and(
          eq(subscriptionsTable.ownerId, ownerId),
          eq(subscriptionsTable.provider, "revenuecat"),
        ),
      );
    res.status(403).json({ error: "No active premium entitlement found.", code: "PREMIUM_REQUIRED" });
    return;
  }

  // Derive plan and status from the entitlement data
  const expiresDate: Date | null = premiumEntitlement.expires_at
    ? new Date(premiumEntitlement.expires_at)
    : null;
  const isAnnual = String(premiumEntitlement.product_identifier ?? "")
    .toLowerCase()
    .includes("annual");
  const plan: "monthly" | "annual" = isAnnual ? "annual" : "monthly";
  const periodType: string = premiumEntitlement.period_type ?? premiumEntitlement.renewal_type ?? "normal";
  const status: "active" | "trialing" = periodType === "trial" ? "trialing" : "active";

  // Upsert using (ownerId, provider) as the conflict target via the primary key.
  // providerSubscriptionId is intentionally left unset — the product identifier
  // is shared across all customers and would violate the unique index
  // (provider, providerSubscriptionId).
  await db
    .insert(subscriptionsTable)
    .values({
      id: `revenuecat_${ownerId}`,
      ownerId,
      provider: "revenuecat",
      status,
      plan,
      currentPeriodEnd: expiresDate,
      entitlementId: ENTITLEMENT_IDENTIFIER,
    })
    .onConflictDoUpdate({
      target: subscriptionsTable.id, // conflicts on primary key only
      set: {
        status,
        plan,
        currentPeriodEnd: expiresDate,
        entitlementId: ENTITLEMENT_IDENTIFIER,
        updatedAt: new Date(),
      },
    });

  res.json({ synced: true, status, plan });
});

router.post("/portal", async (req, res) => {
  const [subscription] = await db.select().from(subscriptionsTable)
    .where(and(eq(subscriptionsTable.ownerId, owner(req)), eq(subscriptionsTable.provider, "stripe")))
    .limit(1);
  if (!subscription?.providerCustomerId) {
    res.status(404).json({ error: "No Stripe customer found." });
    return;
  }
  const stripe = await getUncachableStripeClient();
  const baseUrl = `${req.protocol}://${req.get("host")}`;
  const session = await stripe.billingPortal.sessions.create({ customer: subscription.providerCustomerId, return_url: `${baseUrl}/parametres` });
  res.json({ url: session.url });
});

export default router;
