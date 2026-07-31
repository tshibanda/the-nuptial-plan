import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { calendarEventsTable, activityTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { CreateEventBody, UpdateEventBody } from "@workspace/api-zod";

const router: IRouter = Router({ mergeParams: true });

const p = (req: { params: Record<string, string> }, key: string) => Number(req.params[key]);

router.get("/", async (req, res): Promise<void> => {
  const weddingId = p(req, "weddingId");
  const events = await db.select().from(calendarEventsTable).where(eq(calendarEventsTable.weddingId, weddingId)).orderBy(calendarEventsTable.eventDate);
  res.json(events);
});

router.post("/", async (req, res): Promise<void> => {
  const weddingId = p(req, "weddingId");
  const body = CreateEventBody.safeParse(req.body);
  if (!body.success) { res.status(400).json({ error: "Invalid input" }); return; }
  const [event] = await db.insert(calendarEventsTable).values({ ...body.data, weddingId }).returning();
  await db.insert(activityTable).values({
    weddingId,
    description: `Événement ajouté : ${event!.title}`,
    entityType: "event",
    initials: "CA",
  });
  res.status(201).json(event);
});

router.patch("/:id", async (req, res): Promise<void> => {
  const weddingId = p(req, "weddingId");
  const id = p(req, "id");
  const body = UpdateEventBody.safeParse(req.body);
  if (!body.success) { res.status(400).json({ error: "Invalid input" }); return; }
  const [event] = await db.update(calendarEventsTable).set(body.data).where(and(eq(calendarEventsTable.id, id), eq(calendarEventsTable.weddingId, weddingId))).returning();
  if (!event) { res.status(404).json({ error: "Not found" }); return; }
  res.json(event);
});

router.delete("/:id", async (req, res): Promise<void> => {
  const weddingId = p(req, "weddingId");
  const id = p(req, "id");
  await db.delete(calendarEventsTable).where(and(eq(calendarEventsTable.id, id), eq(calendarEventsTable.weddingId, weddingId)));
  res.status(204).send();
});

export default router;
