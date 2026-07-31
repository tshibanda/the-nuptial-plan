import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { budgetCategoriesTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router: IRouter = Router({ mergeParams: true });

const p = (req: { params: Record<string, string> }, key: string) => Number(req.params[key]);

router.get("/", async (req, res): Promise<void> => {
  const weddingId = p(req, "weddingId");
  const categories = await db.select().from(budgetCategoriesTable).where(eq(budgetCategoriesTable.weddingId, weddingId));
  const totalAllocated = categories.reduce((sum, c) => sum + c.allocatedCents, 0);
  const totalSpent = categories.reduce((sum, c) => sum + c.spentCents, 0);
  res.json({ weddingId, totalAllocated, totalSpent, categories });
});

export default router;
