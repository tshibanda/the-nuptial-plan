import { clerkClient } from "@clerk/express";
import { and, eq, inArray } from "drizzle-orm";
import { Router, type Request } from "express";
import {
  activityTable,
  addressBookEntriesTable,
  budgetCategoriesTable,
  calendarEventsTable,
  contractsTable,
  conversations,
  db,
  documentsTable,
  editorialPostsTable,
  guestsTable,
  messages,
  milestonesTable,
  notificationsTable,
  paymentsTable,
  pushDevicesTable,
  socialAccountsTable,
  subscriptionsTable,
  vendorsTable,
  weddingsTable,
} from "@workspace/db";
import { getUncachableStripeClient } from "../stripeClient";
import { ObjectStorageService } from "../lib/objectStorage";

const router = Router();

function owner(req: Request): string {
  return (req as Request & { userId?: string }).userId ?? "";
}

async function cancelStripeSubscriptions(ownerId: string) {
  const records = await db.select().from(subscriptionsTable)
    .where(and(eq(subscriptionsTable.ownerId, ownerId), eq(subscriptionsTable.provider, "stripe")));
  const customerIds = [...new Set(records.map((record) => record.providerCustomerId).filter(Boolean) as string[])];
  const subscriptionIds = new Set(records.map((record) => record.providerSubscriptionId).filter(Boolean) as string[]);
  if (!customerIds.length && !subscriptionIds.size) return;

  const stripe = await getUncachableStripeClient();
  for (const customerId of customerIds) {
    const subscriptions = await stripe.subscriptions.list({ customer: customerId, status: "all", limit: 100 });
    subscriptions.data
      .filter((subscription) => ["active", "trialing", "past_due", "unpaid"].includes(subscription.status))
      .forEach((subscription) => subscriptionIds.add(subscription.id));
  }
  for (const subscriptionId of subscriptionIds) {
    await stripe.subscriptions.cancel(subscriptionId);
  }
}

router.delete("/account", async (req, res) => {
  const ownerId = owner(req);
  if (!ownerId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  try {
    // Stop web billing before removing our local subscription references.
    await cancelStripeSubscriptions(ownerId);

    const weddings = await db.select({ id: weddingsTable.id }).from(weddingsTable)
      .where(eq(weddingsTable.ownerId, ownerId));
    const weddingIds = weddings.map((wedding) => wedding.id);
    const documents = weddingIds.length
      ? await db.select({ objectPath: documentsTable.objectPath }).from(documentsTable)
        .where(inArray(documentsTable.weddingId, weddingIds))
      : [];
    const ownerConversations = await db.select({ id: conversations.id }).from(conversations)
      .where(eq(conversations.ownerId, ownerId));
    const conversationIds = ownerConversations.map((conversation) => conversation.id);

    await db.transaction(async (tx) => {
      if (conversationIds.length) await tx.delete(messages).where(inArray(messages.conversationId, conversationIds));
      await tx.delete(conversations).where(eq(conversations.ownerId, ownerId));

      if (weddingIds.length) {
        await tx.delete(documentsTable).where(inArray(documentsTable.weddingId, weddingIds));
        await tx.delete(contractsTable).where(inArray(contractsTable.weddingId, weddingIds));
        await tx.delete(paymentsTable).where(inArray(paymentsTable.weddingId, weddingIds));
        await tx.delete(guestsTable).where(inArray(guestsTable.weddingId, weddingIds));
        await tx.delete(notificationsTable).where(inArray(notificationsTable.weddingId, weddingIds));
        await tx.delete(calendarEventsTable).where(inArray(calendarEventsTable.weddingId, weddingIds));
        await tx.delete(activityTable).where(inArray(activityTable.weddingId, weddingIds));
        await tx.delete(budgetCategoriesTable).where(inArray(budgetCategoriesTable.weddingId, weddingIds));
        await tx.delete(milestonesTable).where(inArray(milestonesTable.weddingId, weddingIds));
        await tx.delete(vendorsTable).where(inArray(vendorsTable.weddingId, weddingIds));
        await tx.delete(weddingsTable).where(eq(weddingsTable.ownerId, ownerId));
      }

      await tx.delete(editorialPostsTable).where(eq(editorialPostsTable.ownerId, ownerId));
      await tx.delete(socialAccountsTable).where(eq(socialAccountsTable.ownerId, ownerId));
      await tx.delete(pushDevicesTable).where(eq(pushDevicesTable.ownerId, ownerId));
      await tx.delete(addressBookEntriesTable).where(eq(addressBookEntriesTable.ownerId, ownerId));
      await tx.delete(subscriptionsTable).where(eq(subscriptionsTable.ownerId, ownerId));
    });

    // Private document blobs are not part of the SQL transaction. Do not retain
    // them if one disappeared earlier; their database records are already gone.
    const storage = new ObjectStorageService();
    await Promise.allSettled(documents.map(async ({ objectPath }) => {
      const file = await storage.getObjectEntityFile(objectPath);
      await file.delete({ ignoreNotFound: true });
    }));

    await clerkClient.users.deleteUser(ownerId);
    res.json({ deleted: true });
  } catch (error) {
    req.log.error({ error, ownerId }, "Account deletion failed");
    res.status(502).json({ error: "Impossible de supprimer le compte. Aucune donnée n'a été supprimée si la résiliation a échoué." });
  }
});

export default router;