import app from "./app";
import { logger } from "./lib/logger";
import { db, calendarEventsTable, notificationsTable } from "@workspace/db";
import { and, eq } from "drizzle-orm";
import { runMigrations } from "stripe-replit-sync";
import { getStripeSync } from "./stripeClient";
import { seedAppleReview } from "./lib/seedAppleReview";
import { ensureSocialSchema } from "./lib/socialSchema";

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

await ensureSocialSchema().catch((error) => {
  logger.error({ error }, "Social account schema initialization failed");
  throw error;
});

await seedAppleReview().catch((error) => logger.error({ error }, "Apple Review seed failed"));

app.listen(port, (err) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }

  logger.info({ port }, "Server listening");
});

async function createTaskDueNotifications() {
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);
  const target = tomorrow.toISOString().slice(0, 10);
  const events = await db.select().from(calendarEventsTable)
    .where(and(eq(calendarEventsTable.eventDate, target), eq(calendarEventsTable.completed, false)));
  for (const event of events) {
    const dedupeKey = `task-due-24h-${event.id}-${target}`;
    const [existing] = await db.select({ id: notificationsTable.id }).from(notificationsTable)
      .where(eq(notificationsTable.dedupeKey, dedupeKey)).limit(1);
    if (!existing) {
      await db.insert(notificationsTable).values({
        weddingId: event.weddingId,
        kind: "task_due_24h",
        title: "Échéance dans 24 h",
        body: `La tâche « ${event.title} » arrive à échéance demain.`,
        route: "/calendrier",
        dedupeKey,
      });
    }
  }
}

void createTaskDueNotifications().catch((error) => logger.error({ error }, "Unable to create task notifications"));
setInterval(() => {
  void createTaskDueNotifications().catch((error) => logger.error({ error }, "Unable to create task notifications"));
}, 60 * 60 * 1000);
