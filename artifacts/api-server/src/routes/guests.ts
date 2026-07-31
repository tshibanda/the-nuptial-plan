import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, guestsTable } from "@workspace/db";
import {
  ListGuestsParams,
  ListGuestsResponse,
  CreateGuestParams,
  CreateGuestBody,
  CreateGuestResponse,
  UpdateGuestParams,
  UpdateGuestBody,
  UpdateGuestResponse,
  DeleteGuestParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

// List guests for a wedding
router.get("/weddings/:weddingId/guests", async (req, res): Promise<void> => {
  const params = ListGuestsParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const guests = await db
    .select()
    .from(guestsTable)
    .where(eq(guestsTable.weddingId, params.data.weddingId))
    .orderBy(guestsTable.name);

  const confirmed = guests.filter(g => g.rsvpStatus === "Confirmé").length;
  const pending = guests.filter(g => g.rsvpStatus === "En attente").length;
  const declined = guests.filter(g => g.rsvpStatus === "Décliné").length;

  res.json(
    ListGuestsResponse.parse({
      guests,
      total: guests.length,
      confirmed,
      pending,
      declined,
    })
  );
});

// Create guest
router.post("/weddings/:weddingId/guests", async (req, res): Promise<void> => {
  const params = CreateGuestParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = CreateGuestBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [guest] = await db
    .insert(guestsTable)
    .values({ ...parsed.data, weddingId: params.data.weddingId })
    .returning();
  res.status(201).json(CreateGuestResponse.parse(guest));
});

// Update guest
router.patch("/guests/:guestId", async (req, res): Promise<void> => {
  const params = UpdateGuestParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = UpdateGuestBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [guest] = await db
    .update(guestsTable)
    .set(parsed.data)
    .where(eq(guestsTable.id, params.data.guestId))
    .returning();
  if (!guest) {
    res.status(404).json({ error: "Invité introuvable" });
    return;
  }
  res.json(UpdateGuestResponse.parse(guest));
});

// Delete guest
router.delete("/guests/:guestId", async (req, res): Promise<void> => {
  const params = DeleteGuestParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [guest] = await db
    .delete(guestsTable)
    .where(eq(guestsTable.id, params.data.guestId))
    .returning();
  if (!guest) {
    res.status(404).json({ error: "Invité introuvable" });
    return;
  }
  res.sendStatus(204);
});

export default router;
