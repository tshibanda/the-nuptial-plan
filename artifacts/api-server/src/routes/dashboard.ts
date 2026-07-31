import { Router, type IRouter } from "express";
import { db, weddingsTable, paymentsTable, contractsTable, milestonesTable } from "@workspace/db";
import { GetDashboardOverviewResponse } from "@workspace/api-zod";
import { gt, ne } from "drizzle-orm";

const router: IRouter = Router();

router.get("/dashboard/overview", async (req, res): Promise<void> => {
  const weddings = await db.select().from(weddingsTable);
  const payments = await db.select().from(paymentsTable);
  const contracts = await db.select().from(contractsTable);
  const milestones = await db.select().from(milestonesTable);

  const today = new Date();
  const todayStr = today.toISOString().split("T")[0];

  const upcomingCount = weddings.filter(w => w.weddingDate >= todayStr).length;

  const totalBudgetCommitted = 0; // Aggregated from vendors would be more accurate, skip for overview
  const totalBudgetRemaining = weddings.reduce((sum, w) => sum + parseFloat(w.budgetTotal ?? "0"), 0);

  const pendingPaymentsCount = payments.filter(p => p.status !== "Payé").length;
  const pendingContractsCount = contracts.filter(c => c.status !== "Signé").length;

  const upcomingMilestones = milestones
    .filter(m => !m.completed && m.dueDate >= todayStr)
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
    .slice(0, 5);

  res.json(
    GetDashboardOverviewResponse.parse({
      totalWeddings: weddings.length,
      upcomingCount,
      totalBudgetCommitted,
      totalBudgetRemaining,
      pendingPaymentsCount,
      pendingContractsCount,
      upcomingMilestones,
    })
  );
});

export default router;
