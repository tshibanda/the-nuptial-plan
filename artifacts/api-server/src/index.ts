import app from "./app";
import { logger } from "./lib/logger";
import { db, calendarEventsTable, notificationsTable, paymentsTable, socialAccountsTable } from "@workspace/db";
import { and, eq, lt } from "drizzle-orm";
import { runMigrations } from "stripe-replit-sync";
import { getStripeSync } from "./stripeClient";
import { seedAppleReview } from "./lib/seedAppleReview";
import { refreshSocialAccountStats } from "./routes/social";
import { sendPushNotificationToWedding } from "./lib/pushNotifications";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

async function initializeStripe() {
  if (!process.env.DATABASE_URL || !process.env.REPLIT_CONNECTORS_HOSTNAME) {
    logger.warn("Stripe integration not initialized: database or connector environment is unavailable.");
    return;
  }
  await runMigrations({ databaseUrl: process.env.DATABASE_URL });
  const sync = await getStripeSync();
  const baseUrl = `https://${process.env.REPLIT_DOMAINS?.split(",")[0]}`;
  await sync.findOrCreateManagedWebhook(`${baseUrl}/api/stripe/webhook`);
  void sync.syncBackfill().catch((error) => logger.error({ error }, "Stripe backfill failed"));
}

await initializeStripe().catch((error) => logger.error({ error }, "Stripe initialization failed"));

await seedAppleReview().catch((error) => logger.error({ error }, "Apple Review seed failed"));

app.listen(port, (err) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }

  logger.info({ port }, "Server listening");
});

function isoDateAfter(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

async function createNotificationAndSend({
  weddingId,
  kind,
  title,
  body,
  route,
  dedupeKey,
}: {
  weddingId: number;
  kind: string;
  title: string;
  body: string;
  route: string;
  dedupeKey: string;
}) {
  const [existing] = await db.select({ id: notificationsTable.id }).from(notificationsTable)
    .where(eq(notificationsTable.dedupeKey, dedupeKey)).limit(1);
  if (existing) return;

  await db.insert(notificationsTable).values({ weddingId, kind, title, body, route, dedupeKey });
  await sendPushNotificationToWedding(weddingId, { title, body, route, type: kind });
}

async function createScheduledNotifications() {
  const today = new Date();
  const target = isoDateAfter(1);
  const events = await db.select().from(calendarEventsTable)
    .where(and(eq(calendarEventsTable.eventDate, target), eq(calendarEventsTable.completed, false)));
  for (const event of events) {
    const dedupeKey = `task-due-24h-${event.id}-${target}`;
    await createNotificationAndSend({
      weddingId: event.weddingId,
      kind: "event_due_24h",
      title: "Événement dans 24 h",
      body: `« ${event.title} » est prévu demain.`,
      route: "/(tabs)/evenements",
      dedupeKey,
    });
  }

  const paymentTarget = isoDateAfter(2);
  const dueSoon = await db.select().from(paymentsTable)
    .where(and(eq(paymentsTable.dueDate, paymentTarget), eq(paymentsTable.status, "pending")));
  for (const payment of dueSoon) {
    await createNotificationAndSend({
      weddingId: payment.weddingId,
      kind: "payment_due_48h",
      title: "Paiement à venir",
      body: `${payment.vendorName} · échéance le ${payment.dueDate}.`,
      route: "/(tabs)/paiements",
      dedupeKey: `payment-due-48h-${payment.id}-${paymentTarget}`,
    });
  }

  const todayKey = today.toISOString().slice(0, 10);
  const overduePayments = await db.select().from(paymentsTable)
    .where(and(lt(paymentsTable.dueDate, todayKey), eq(paymentsTable.status, "pending")));
  for (const payment of overduePayments) {
    await createNotificationAndSend({
      weddingId: payment.weddingId,
      kind: "payment_overdue",
      title: "Paiement en retard",
      body: `${payment.vendorName} · échéance le ${payment.dueDate}.`,
      route: "/(tabs)/paiements",
      dedupeKey: `payment-overdue-${payment.id}-${todayKey}`,
    });
  }
}

const SOCIAL_STATS_REFRESH_INTERVAL_MS = 6 * 60 * 60 * 1000;
let socialStatsRefreshInFlight = false;

/**
 * Refresh every connected account without requiring a planner session.
 * Each account is isolated so a failed provider request cannot prevent the
 * remaining accounts from being refreshed. The shared sync function only
 * writes a new cache after a successful stats response.
 */
async function refreshConnectedSocialStats() {
  if (socialStatsRefreshInFlight) {
    logger.info("Skipping social stats refresh because the previous run is still in progress");
    return;
  }
  socialStatsRefreshInFlight = true;
  try {
    const accounts = await db.select().from(socialAccountsTable)
      .where(eq(socialAccountsTable.status, "connected"));
    let refreshed = 0;
    let failed = 0;
    for (const account of accounts) {
      try {
        const stats = await refreshSocialAccountStats(account);
        if (stats) refreshed += 1;
      } catch (error) {
        failed += 1;
        logger.warn(
          { error, accountId: account.id, ownerId: account.ownerId, platform: account.platform },
          "Scheduled social stats refresh failed",
        );
      }
    }
    logger.info({ accounts: accounts.length, refreshed, failed }, "Scheduled social stats refresh completed");
  } catch (error) {
    logger.error({ error }, "Unable to load accounts for scheduled social stats refresh");
  } finally {
    socialStatsRefreshInFlight = false;
  }
}

void createScheduledNotifications().catch((error) => logger.error({ error }, "Unable to create scheduled notifications"));
setInterval(() => {
  void createScheduledNotifications().catch((error) => logger.error({ error }, "Unable to create scheduled notifications"));
}, 60 * 60 * 1000);

// Run once after startup and then on a predictable six-hour cadence. The
// initial call is intentionally non-blocking so API startup is not delayed by
// provider latency.
void refreshConnectedSocialStats();
setInterval(() => {
  void refreshConnectedSocialStats();
}, SOCIAL_STATS_REFRESH_INTERVAL_MS);
