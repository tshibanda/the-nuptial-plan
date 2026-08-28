import { Router, type IRouter, type Request } from "express";
import { db, notificationsTable, pushDevicesTable } from "@workspace/db";
import { and, desc, eq } from "drizzle-orm";
import { weddingsTable } from "@workspace/db";
import { RegisterPushTokenBody, UnregisterPushTokenBody } from "@workspace/api-zod";

const router: IRouter = Router();

function owner(req: Request): string {
  return (req as Request & { userId?: string }).userId ?? "";
}

function isExpoPushToken(token: string): boolean {
  return /^(Exponent|Expo)PushToken\[[A-Za-z0-9_-]+\]$/.test(token);
}

router.post("/push-token", async (req, res): Promise<void> => {
  const body = RegisterPushTokenBody.safeParse(req.body);
  if (!body.success || !isExpoPushToken(body.data.token)) {
    res.status(400).json({ error: "Invalid push token" });
    return;
  }

  const ownerId = owner(req);
  await db.insert(pushDevicesTable).values({
    ownerId,
    expoPushToken: body.data.token,
    platform: body.data.platform,
  }).onConflictDoUpdate({
    target: pushDevicesTable.expoPushToken,
    set: {
      ownerId,
      platform: body.data.platform,
      updatedAt: new Date(),
    },
  });
  res.json({ registered: true });
});

router.delete("/push-token", async (req, res): Promise<void> => {
  const body = UnregisterPushTokenBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: "Invalid push token" });
    return;
  }
  await db.delete(pushDevicesTable).where(and(
    eq(pushDevicesTable.ownerId, owner(req)),
    eq(pushDevicesTable.expoPushToken, body.data.token),
  ));
  res.status(204).send();
});

router.get("/", async (req, res): Promise<void> => {
  const weddingId = Number(req.query.weddingId);
  if (!Number.isFinite(weddingId)) { res.status(400).json({ error: "weddingId is required" }); return; }
  const ownerId = (req as typeof req & { userId?: string }).userId;
  const [wedding] = await db.select({ id: weddingsTable.id }).from(weddingsTable)
    .where(and(eq(weddingsTable.id, weddingId), eq(weddingsTable.ownerId, ownerId ?? "")));
  if (!wedding) { res.status(404).json({ error: "Not found" }); return; }
  const items = await db.select().from(notificationsTable)
    .where(and(eq(notificationsTable.weddingId, weddingId)))
    .orderBy(desc(notificationsTable.createdAt)).limit(30);
  res.json(items);
});

router.patch("/:id/read", async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  const ownerId = (req as typeof req & { userId?: string }).userId;
  const [owned] = await db.select({ id: notificationsTable.id })
    .from(notificationsTable)
    .innerJoin(weddingsTable, eq(notificationsTable.weddingId, weddingsTable.id))
    .where(and(eq(notificationsTable.id, id), eq(weddingsTable.ownerId, ownerId ?? "")));
  if (!owned) { res.status(404).json({ error: "Not found" }); return; }
  const [item] = await db.update(notificationsTable).set({ read: true }).where(eq(notificationsTable.id, id)).returning();
  if (!item) { res.status(404).json({ error: "Not found" }); return; }
  res.json(item);
});

export default router;