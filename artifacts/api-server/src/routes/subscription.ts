import { Router, type Request } from "express";
import { and, desc, eq } from "drizzle-orm";
import { db, subscriptionsTable } from "@workspace/db";
import { getUncachableStripeClient } from "../stripeClient";

const router = Router();
const MONTHLY_LOOKUP_KEY = "tnp_monthly_eur";
const ANNUAL_LOOKUP_KEY = "tnp_annual_eur";

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