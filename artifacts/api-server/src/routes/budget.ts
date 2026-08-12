import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { budgetCategoriesTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { CreateBudgetCategoryBody, UpdateBudgetCategoryBody } from "@workspace/api-zod";

const router: IRouter = Router({ mergeParams: true });

const p = (req: { params: Record<string, string> }, key: string) => Number(req.params[key]);

router.get("/", async (req, res): Promise<void> => {
  const weddingId = p(req, "weddingId");
  const categories = await db.select().from(budgetCategoriesTable).where(eq(budgetCategoriesTable.weddingId, weddingId));
  res.json(categories);
});

router.post("/", async (req, res): Promise<void> => {
  const weddingId = p(req, "weddingId");
  const body = CreateBudgetCategoryBody.safeParse(req.body);
  if (!body.success) { res.status(400).json({ error: "Invalid input" }); return; }
  const [category] = await db.insert(budgetCategoriesTable).values({
    ...body.data,
    weddingId,
    allocatedCents: String(body.data.allocatedCents),
    spentCents: body.data.spentCents === undefined ? undefined : String(body.data.spentCents),
  }).returning();
  res.status(201).json(category);
});

router.patch("/:id", async (req, res): Promise<void> => {
  const weddingId = p(req, "weddingId");
  const id = p(req, "id");
  const body = UpdateBudgetCategoryBody.safeParse(req.body);
  if (!body.success) { res.status(400).json({ error: "Invalid input" }); return; }
  const [category] = await db.update(budgetCategoriesTable).set({
    ...body.data,
    allocatedCents: body.data.allocatedCents === undefined ? undefined : String(body.data.allocatedCents),
    spentCents: body.data.spentCents === undefined ? undefined : String(body.data.spentCents),
  }).where(and(eq(budgetCategoriesTable.id, id), eq(budgetCategoriesTable.weddingId, weddingId))).returning();
  if (!category) { res.status(404).json({ error: "Not found" }); return; }
  res.json(category);
});

router.delete("/:id", async (req, res): Promise<void> => {
  const weddingId = p(req, "weddingId");
  const id = p(req, "id");
  await db.delete(budgetCategoriesTable).where(and(eq(budgetCategoriesTable.id, id), eq(budgetCategoriesTable.weddingId, weddingId)));
  res.status(204).send();
});

export default router;
