import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, milestonesTable } from "@workspace/db";
import {
  ListMilestonesParams,
  ListMilestonesResponse,
  CreateMilestoneParams,
  CreateMilestoneBody,
  CreateMilestoneResponse,
  UpdateMilestoneParams,
  UpdateMilestoneBody,
  UpdateMilestoneResponse,
  DeleteMilestoneParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

// List milestones for a wedding
router.get("/weddings/:weddingId/milestones", async (req, res): Promise<void> => {
  const params = ListMilestonesParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const milestones = await db
    .select()
    .from(milestonesTable)
    .where(eq(milestonesTable.weddingId, params.data.weddingId))
    .orderBy(milestonesTable.dueDate);
  res.json(ListMilestonesResponse.parse(milestones));
});

// Create milestone
router.post("/weddings/:weddingId/milestones", async (req, res): Promise<void> => {
  const params = CreateMilestoneParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = CreateMilestoneBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [milestone] = await db
    .insert(milestonesTable)
    .values({ ...parsed.data, weddingId: params.data.weddingId })
    .returning();
  res.status(201).json(CreateMilestoneResponse.parse(milestone));
});

// Update milestone
router.patch("/milestones/:milestoneId", async (req, res): Promise<void> => {
  const params = UpdateMilestoneParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = UpdateMilestoneBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [milestone] = await db
    .update(milestonesTable)
    .set(parsed.data)
    .where(eq(milestonesTable.id, params.data.milestoneId))
    .returning();
  if (!milestone) {
    res.status(404).json({ error: "Jalon introuvable" });
    return;
  }
  res.json(UpdateMilestoneResponse.parse(milestone));
});

// Delete milestone
router.delete("/milestones/:milestoneId", async (req, res): Promise<void> => {
  const params = DeleteMilestoneParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [milestone] = await db
    .delete(milestonesTable)
    .where(eq(milestonesTable.id, params.data.milestoneId))
    .returning();
  if (!milestone) {
    res.status(404).json({ error: "Jalon introuvable" });
    return;
  }
  res.sendStatus(204);
});

export default router;
