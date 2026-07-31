import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { guestsTable, activityTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { CreateGuestBody, UpdateGuestBody } from "@workspace/api-zod";

const router: IRouter = Router({ mergeParams: true });

const p = (req: { params: Record<string, string> }, key: string) => Number(req.params[key]);

router.get("/stats", async (req, res): Promise<void> => {
  const weddingId = p(req, "weddingId");
  const guests = await db.select().from(guestsTable).where(eq(guestsTable.weddingId, weddingId));
  res.json({
    total: guests.length,
    confirmed: guests.filter((g) => g.rsvpStatus === "confirmed").length,
    pending: guests.filter((g) => g.rsvpStatus === "pending").length,
    declined: guests.filter((g) => g.rsvpStatus === "declined").length,
  });
});

router.get("/", async (req, res): Promise<void> => {
  const weddingId = p(req, "weddingId");
  const guests = await db.select().from(guestsTable).where(eq(guestsTable.weddingId, weddingId));
  res.json(guests);
});

router.post("/", async (req, res): Promise<void> => {
  const weddingId = p(req, "weddingId");
  const body = CreateGuestBody.safeParse(req.body);
  if (!body.success) { res.status(400).json({ error: "Invalid input" }); return; }
  const [guest] = await db.insert(guestsTable).values({ ...body.data, weddingId }).returning();
  await db.insert(activityTable).values({
    weddingId,
    description: `Invité ajouté : ${guest!.name}`,
    entityType: "guest",
    initials: guest!.name.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase(),
  });
  res.status(201).json(guest);
});

router.patch("/:id", async (req, res): Promise<void> => {
  const weddingId = p(req, "weddingId");
  const id = p(req, "id");
  const body = UpdateGuestBody.safeParse(req.body);
  if (!body.success) { res.status(400).json({ error: "Invalid input" }); return; }
  const [guest] = await db.update(guestsTable).set(body.data).where(and(eq(guestsTable.id, id), eq(guestsTable.weddingId, weddingId))).returning();
  if (!guest) { res.status(404).json({ error: "Not found" }); return; }
  res.json(guest);
});

router.delete("/:id", async (req, res): Promise<void> => {
  const weddingId = p(req, "weddingId");
  const id = p(req, "id");
  await db.delete(guestsTable).where(and(eq(guestsTable.id, id), eq(guestsTable.weddingId, weddingId)));
  res.status(204).send();
});

export default router;
