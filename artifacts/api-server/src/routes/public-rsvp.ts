import { Router, type IRouter } from "express";
import { db, activityTable, guestsTable, weddingsTable, notificationsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import crypto from "node:crypto";
import { sendPushNotificationToWedding } from "../lib/pushNotifications";

const router: IRouter = Router();

router.get("/:token", async (req, res): Promise<void> => {
  const [row] = await db.select({
    guest: guestsTable,
    wedding: weddingsTable,
  }).from(guestsTable).innerJoin(weddingsTable, eq(guestsTable.weddingId, weddingsTable.id))
    .where(eq(guestsTable.rsvpToken, req.params.token));
  if (!row) { res.status(404).json({ error: "Lien RSVP invalide ou expiré" }); return; }
  res.json({
    guest: { id: row.guest.id, name: row.guest.name, rsvpStatus: row.guest.rsvpStatus },
    wedding: { id: row.wedding.id, names: row.wedding.names, weddingDate: row.wedding.weddingDate, venue: row.wedding.venue },
  });
});

router.post("/:token/respond", async (req, res): Promise<void> => {
  const status = req.body?.rsvpStatus;
  if (status !== "confirmed" && status !== "declined") { res.status(400).json({ error: "rsvpStatus must be confirmed or declined" }); return; }
  const [guest] = await db.select().from(guestsTable).where(eq(guestsTable.rsvpToken, req.params.token));
  if (!guest) { res.status(404).json({ error: "Lien RSVP invalide ou expiré" }); return; }
  const [updated] = await db.update(guestsTable).set({ rsvpStatus: status }).where(eq(guestsTable.id, guest.id)).returning();
  const label = status === "confirmed" ? "confirme sa présence" : "ne pourra pas venir";
  await db.insert(activityTable).values({ weddingId: guest.weddingId, description: `${guest.name} ${label}`, entityType: "guest", initials: "RS" });
  await db.insert(notificationsTable).values({
    weddingId: guest.weddingId, kind: "rsvp", title: "Nouvelle réponse RSVP",
    body: `${guest.name} ${label}.`, route: "/invites", dedupeKey: `rsvp-${guest.id}-${Date.now()}`,
  });
  void sendPushNotificationToWedding(guest.weddingId, {
    title: "Nouvelle réponse RSVP",
    body: `${guest.name} ${label}.`,
    route: "/(tabs)/invites",
    type: "rsvp",
  });
  res.json({ guest: { id: updated!.id, name: updated!.name, rsvpStatus: updated!.rsvpStatus } });
});

export function createRsvpToken() {
  return crypto.randomBytes(24).toString("base64url");
}

export default router;