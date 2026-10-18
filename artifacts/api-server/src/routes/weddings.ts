import { Router, type IRouter } from "express";
import { clerkClient } from "@clerk/express";
import { db } from "@workspace/db";
import {
  weddingsTable,
  vendorsTable,
  guestsTable,
  budgetCategoriesTable,
  calendarEventsTable,
  paymentsTable,
  activityTable,
} from "@workspace/db";
import { and, eq } from "drizzle-orm";
import { CreateWeddingBody, UpdateWeddingBody } from "@workspace/api-zod";
import { seedOnboardingDemo, type DemoLanguage } from "../lib/seedOnboardingDemo";

const router: IRouter = Router();

const p = (req: { params: Record<string, string> }, key: string) => Number(req.params[key]);
const owner = (req: unknown) => (req as { userId?: string }).userId;

// Provision one private, editable sample wedding for a freshly registered user.
router.post("/demo-seed", async (req, res): Promise<void> => {
  const ownerId = owner(req);
  const language = req.body?.language;
  if (!ownerId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  if (language !== "fr" && language !== "en") {
    res.status(400).json({ error: "language must be fr or en" });
    return;
  }

  try {
    const user = await clerkClient.users.getUser(ownerId);
    const privateMetadata = user.privateMetadata as Record<string, unknown>;
    if (privateMetadata.tnpOnboardingDemoSeededAt) {
      const [existingWedding] = await db.select({ id: weddingsTable.id })
        .from(weddingsTable)
        .where(eq(weddingsTable.ownerId, ownerId))
        .orderBy(weddingsTable.id)
        .limit(1);
      res.json({ created: false, weddingId: existingWedding?.id ?? null });
      return;
    }

    const result = await seedOnboardingDemo(ownerId, language as DemoLanguage);
    await clerkClient.users.updateUserMetadata(ownerId, {
      privateMetadata: {
        ...privateMetadata,
        tnpOnboardingDemoSeededAt: new Date().toISOString(),
      },
    });
    res.json(result);
  } catch (error) {
    req.log.error({ error, ownerId }, "Failed to prepare onboarding demo wedding");
    res.status(500).json({ error: "Could not prepare the sample wedding" });
  }
});

// List all weddings
router.get("/", async (req, res): Promise<void> => {
  const weddings = await db.select().from(weddingsTable)
    .where(eq(weddingsTable.ownerId, owner(req)!))
    .orderBy(weddingsTable.weddingDate);
  res.json(weddings);
});

// Create a wedding
router.post("/", async (req, res): Promise<void> => {
  const parsed = CreateWeddingBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [wedding] = await db.insert(weddingsTable)
    .values({ ...parsed.data, ownerId: owner(req)!, totalBudget: String(parsed.data.totalBudget) })
    .returning();
  await db.insert(activityTable).values({
    weddingId: wedding!.id,
    description: `Nouveau mariage créé : ${wedding!.names}`,
    entityType: "wedding",
    initials: (wedding!.names.includes("&")
      ? wedding!.names.split("&").map((s: string) => s.trim())
      : wedding!.names.split(/\s+/)
    ).filter(Boolean).map((n: string) => n[0]).join("").slice(0, 2).toUpperCase(),
  });
  res.status(201).json(wedding);
});

// Get a wedding by id
router.get("/:id", async (req, res): Promise<void> => {
  const id = p(req, "id");
  const [wedding] = await db.select().from(weddingsTable)
    .where(and(eq(weddingsTable.id, id), eq(weddingsTable.ownerId, owner(req)!)));
  if (!wedding) { res.status(404).json({ error: "Not found" }); return; }
  res.json(wedding);
});

// Update a wedding
router.patch("/:id", async (req, res): Promise<void> => {
  const id = p(req, "id");
  const body = UpdateWeddingBody.safeParse(req.body);
  if (!body.success) { res.status(400).json({ error: "Invalid input" }); return; }
  const [wedding] = await db.update(weddingsTable).set({
    ...body.data,
    totalBudget: body.data.totalBudget === undefined ? undefined : String(body.data.totalBudget),
  })
    .where(and(eq(weddingsTable.id, id), eq(weddingsTable.ownerId, owner(req)!))).returning();
  if (!wedding) { res.status(404).json({ error: "Not found" }); return; }
  res.json(wedding);
});

// Delete a wedding
router.delete("/:id", async (req, res): Promise<void> => {
  const id = p(req, "id");
  await db.delete(weddingsTable)
    .where(and(eq(weddingsTable.id, id), eq(weddingsTable.ownerId, owner(req)!)));
  res.status(204).send();
});

// Dashboard summary
router.get("/:id/summary", async (req, res): Promise<void> => {
  const id = p(req, "id");
  const [wedding] = await db.select().from(weddingsTable)
    .where(and(eq(weddingsTable.id, id), eq(weddingsTable.ownerId, owner(req)!)));
  if (!wedding) { res.status(404).json({ error: "Not found" }); return; }

  const now = new Date();
  const wDate = new Date(wedding.weddingDate);
  const daysUntil = Math.max(0, Math.ceil((wDate.getTime() - now.getTime()) / 86400000));

  const guests = await db.select().from(guestsTable).where(eq(guestsTable.weddingId, id));
  const confirmedGuests = guests.filter((g) => g.rsvpStatus === "confirmed").length;

  const budgetCategories = await db.select().from(budgetCategoriesTable).where(eq(budgetCategoriesTable.weddingId, id));
  const budgetSpent = budgetCategories.reduce((sum, c) => sum + Number(c.spentCents), 0);

  const events = await db.select().from(calendarEventsTable).where(eq(calendarEventsTable.weddingId, id));
  const today = now.toISOString().slice(0, 10);
  const upcomingEvents = events.filter((e) => !e.completed && e.eventDate >= today).length;

  const [vendors] = await Promise.all([
    db.select().from(vendorsTable).where(eq(vendorsTable.weddingId, id)),
  ]);
  const vendorCount = vendors.length;

  const payments = await db.select().from(paymentsTable).where(eq(paymentsTable.weddingId, id));
  const pendingPaymentsTotal = payments
    .filter((pm) => pm.status === "pending" || pm.status === "overdue")
    .reduce((sum, pm) => sum + Number(pm.amountCents), 0);

  const tasksTotal = events.length;
  const tasksComplete = events.filter((e) => e.completed).length;

  res.json({
    weddingId: id,
    daysUntil,
    confirmedGuests,
    totalGuests: guests.length,
    budgetSpent,
    budgetTotal: wedding.totalBudget,
    tasksComplete,
    tasksTotal,
    upcomingEvents,
    vendorCount,
    pendingPaymentsTotal,
  });
});

// Activity feed
router.get("/:id/activity", async (req, res): Promise<void> => {
  const id = p(req, "id");
  const [wedding] = await db.select({ id: weddingsTable.id })
    .from(weddingsTable)
    .where(and(eq(weddingsTable.id, id), eq(weddingsTable.ownerId, owner(req)!)));
  if (!wedding) { res.status(404).json({ error: "Not found" }); return; }
  const activity = await db
    .select()
    .from(activityTable)
    .where(eq(activityTable.weddingId, id))
    .orderBy(activityTable.createdAt);
  res.json(activity.slice(-20).reverse());
});

export default router;
