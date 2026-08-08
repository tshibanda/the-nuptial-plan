import { Router, type IRouter } from "express";
import { db, weddingsTable, paymentsTable, contractsTable, vendorsTable } from "@workspace/db";
import { eq, inArray } from "drizzle-orm";

const router: IRouter = Router();

router.get("/dashboard/overview", async (req, res): Promise<void> => {
  const ownerId = (req as typeof req & { userId: string }).userId;
  const weddings = await db.select().from(weddingsTable).where(eq(weddingsTable.ownerId, ownerId));
  const weddingIds = weddings.map((w) => w.id);
  const payments = weddingIds.length
    ? await db.select().from(paymentsTable).where(inArray(paymentsTable.weddingId, weddingIds))
    : [];
  const contracts = weddingIds.length
    ? await db.select().from(contractsTable).where(inArray(contractsTable.weddingId, weddingIds))
    : [];
  const vendors = weddingIds.length
    ? await db.select().from(vendorsTable).where(inArray(vendorsTable.weddingId, weddingIds))
    : [];

  const today = new Date();
  const todayStr = today.toISOString().split("T")[0];

  const upcomingCount = weddings.filter(w => w.weddingDate >= todayStr).length;

  const totalBudgetCommitted = vendors.reduce((sum, v) => sum + parseFloat(v.totalAmountCents ?? "0"), 0);
  const totalBudgetRemaining = weddings.reduce((sum, w) => sum + parseFloat(w.totalBudget ?? "0"), 0) - totalBudgetCommitted;

  const pendingPaymentsCount = payments.filter(p => p.status !== "Payé").length;
  const pendingContractsCount = contracts.filter(c => c.status !== "Signé").length;

  res.json({
    totalWeddings: weddings.length,
    upcomingCount,
    totalBudgetCommitted,
    totalBudgetRemaining,
    pendingPaymentsCount,
    pendingContractsCount,
    upcomingMilestones: [],
  });
});

export default router;
