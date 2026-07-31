import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { vendorsTable, activityTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import {
  CreateVendorBody,
  UpdateVendorBody,
} from "@workspace/api-zod";

const router: IRouter = Router({ mergeParams: true });

const p = (req: { params: Record<string, string> }, key: string) => Number(req.params[key]);

router.get("/", async (req, res): Promise<void> => {
  const weddingId = p(req, "weddingId");
  const vendors = await db.select().from(vendorsTable).where(eq(vendorsTable.weddingId, weddingId));
  res.json(vendors);
});

router.post("/", async (req, res): Promise<void> => {
  const weddingId = p(req, "weddingId");
  const body = CreateVendorBody.safeParse(req.body);
  if (!body.success) { res.status(400).json({ error: "Invalid input" }); return; }
  const [vendor] = await db.insert(vendorsTable).values({ ...body.data, weddingId }).returning();
  await db.insert(activityTable).values({
    weddingId,
    description: `Prestataire ajouté : ${vendor!.name}`,
    entityType: "vendor",
    initials: vendor!.name.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase(),
  });
  res.status(201).json(vendor);
});

router.get("/:id", async (req, res): Promise<void> => {
  const weddingId = p(req, "weddingId");
  const id = p(req, "id");
  const [vendor] = await db.select().from(vendorsTable).where(and(eq(vendorsTable.id, id), eq(vendorsTable.weddingId, weddingId)));
  if (!vendor) { res.status(404).json({ error: "Not found" }); return; }
  res.json(vendor);
});

router.patch("/:id", async (req, res): Promise<void> => {
  const weddingId = p(req, "weddingId");
  const id = p(req, "id");
  const body = UpdateVendorBody.safeParse(req.body);
  if (!body.success) { res.status(400).json({ error: "Invalid input" }); return; }
  const [vendor] = await db.update(vendorsTable).set(body.data).where(and(eq(vendorsTable.id, id), eq(vendorsTable.weddingId, weddingId))).returning();
  if (!vendor) { res.status(404).json({ error: "Not found" }); return; }
  await db.insert(activityTable).values({
    weddingId,
    description: `Prestataire mis à jour : ${vendor.name}`,
    entityType: "vendor",
    initials: vendor.name.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase(),
  });
  res.json(vendor);
});

router.delete("/:id", async (req, res): Promise<void> => {
  const weddingId = p(req, "weddingId");
  const id = p(req, "id");
  await db.delete(vendorsTable).where(and(eq(vendorsTable.id, id), eq(vendorsTable.weddingId, weddingId)));
  res.status(204).send();
});

export default router;
