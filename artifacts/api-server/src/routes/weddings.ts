import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, weddingsTable, vendorsTable, guestsTable, paymentsTable, contractsTable, milestonesTable } from "@workspace/db";
import { coerceNumeric } from "../lib/coerce";
import {
  CreateWeddingBody,
  UpdateWeddingBody,
  UpdateWeddingParams,
  GetWeddingParams,
  DeleteWeddingParams,
  ListWeddingsResponse,
  CreateWeddingResponse,
  GetWeddingResponse,
  UpdateWeddingResponse,
  GetWeddingDashboardParams,
  GetWeddingDashboardResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

// List all weddings
router.get("/weddings", async (req, res): Promise<void> => {
  const weddings = await db.select().from(weddingsTable).orderBy(weddingsTable.weddingDate);
  res.json(ListWeddingsResponse.parse(weddings.map(w => coerceNumeric(w, ["budgetTotal"]))));
});

// Create wedding
router.post("/weddings", async (req, res): Promise<void> => {
  const parsed = CreateWeddingBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [wedding] = await db.insert(weddingsTable).values(parsed.data).returning();
  res.status(201).json(CreateWeddingResponse.parse(coerceNumeric(wedding, ["budgetTotal"])));
});

// Get single wedding
router.get("/weddings/:weddingId", async (req, res): Promise<void> => {
  const params = GetWeddingParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [wedding] = await db.select().from(weddingsTable).where(eq(weddingsTable.id, params.data.weddingId));
  if (!wedding) {
    res.status(404).json({ error: "Mariage introuvable" });
    return;
  }
  res.json(GetWeddingResponse.parse(coerceNumeric(wedding, ["budgetTotal"])));
});

// Update wedding
router.patch("/weddings/:weddingId", async (req, res): Promise<void> => {
  const params = UpdateWeddingParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = UpdateWeddingBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [wedding] = await db
    .update(weddingsTable)
    .set(parsed.data)
    .where(eq(weddingsTable.id, params.data.weddingId))
    .returning();
  if (!wedding) {
    res.status(404).json({ error: "Mariage introuvable" });
    return;
  }
  res.json(UpdateWeddingResponse.parse(coerceNumeric(wedding, ["budgetTotal"])));
});

// Delete wedding
router.delete("/weddings/:weddingId", async (req, res): Promise<void> => {
  const params = DeleteWeddingParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [wedding] = await db
    .delete(weddingsTable)
    .where(eq(weddingsTable.id, params.data.weddingId))
    .returning();
  if (!wedding) {
    res.status(404).json({ error: "Mariage introuvable" });
    return;
  }
  res.sendStatus(204);
});

// Wedding dashboard summary
router.get("/weddings/:weddingId/dashboard", async (req, res): Promise<void> => {
  const params = GetWeddingDashboardParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const weddingId = params.data.weddingId;
  const [wedding] = await db.select().from(weddingsTable).where(eq(weddingsTable.id, weddingId));
  if (!wedding) {
    res.status(404).json({ error: "Mariage introuvable" });
    return;
  }

  const guests = await db.select().from(guestsTable).where(eq(guestsTable.weddingId, weddingId));
  const vendors = await db.select().from(vendorsTable).where(eq(vendorsTable.weddingId, weddingId));
  const payments = await db.select().from(paymentsTable).where(eq(paymentsTable.weddingId, weddingId));
  const contracts = await db.select().from(contractsTable).where(eq(contractsTable.weddingId, weddingId));
  const milestones = await db.select().from(milestonesTable).where(eq(milestonesTable.weddingId, weddingId));

  const today = new Date();
  const weddingDateObj = new Date(wedding.weddingDate);
  const daysUntil = Math.ceil((weddingDateObj.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  const confirmedGuests = guests.filter(g => g.rsvpStatus === "Confirmé").length;
  const pendingGuests = guests.filter(g => g.rsvpStatus === "En attente").length;

  const budgetTotal = parseFloat(wedding.budgetTotal ?? "0");
  const budgetCommitted = vendors.reduce((sum, v) => sum + parseFloat(v.totalAmount ?? "0"), 0);

  const pendingPaymentsTotal = payments
    .filter(p => p.status !== "Payé")
    .reduce((sum, p) => sum + parseFloat(p.amount), 0);
  const urgentPaymentsCount = payments.filter(p => p.status === "Urgent").length;
  const unsignedContractsCount = contracts.filter(c => c.status !== "Signé").length;
  const tasksDone = milestones.filter(m => m.completed).length;

  res.json(
    GetWeddingDashboardResponse.parse({
      wedding: coerceNumeric(wedding, ["budgetTotal"]),
      daysUntil,
      guestCount: guests.length,
      confirmedGuests,
      pendingGuests,
      budgetTotal,
      budgetCommitted,
      budgetRemaining: budgetTotal - budgetCommitted,
      tasksTotal: milestones.length,
      tasksDone,
      pendingPaymentsTotal,
      urgentPaymentsCount,
      unsignedContractsCount,
    })
  );
});

export default router;
