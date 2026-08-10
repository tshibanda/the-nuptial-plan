import { Router, type IRouter, type Request } from "express";
import { and, eq } from "drizzle-orm";
import { db, addressBookEntriesTable, vendorsTable, weddingsTable } from "@workspace/db";
import {
  CreateAddressBookEntryBody,
  UpdateAddressBookEntryBody,
} from "@workspace/api-zod";

const router: IRouter = Router();

const owner = (req: Request) => (req as Request & { userId?: string }).userId;
const numberParam = (value: string | string[] | undefined) =>
  Number(Array.isArray(value) ? value[0] : value);

router.get("/address-book", async (req, res): Promise<void> => {
  const ownerId = owner(req);
  const entries = await db
    .select()
    .from(addressBookEntriesTable)
    .where(eq(addressBookEntriesTable.ownerId, ownerId!))
    .orderBy(addressBookEntriesTable.name);
  res.json(entries);
});

router.post("/address-book", async (req, res): Promise<void> => {
  const parsed = CreateAddressBookEntryBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [entry] = await db.insert(addressBookEntriesTable).values({
    ...parsed.data,
    ownerId: owner(req)!,
  }).returning();
  res.status(201).json(entry);
});

router.patch("/address-book/:id", async (req, res): Promise<void> => {
  const id = numberParam(req.params.id);
  const parsed = UpdateAddressBookEntryBody.safeParse(req.body);
  if (!Number.isInteger(id) || !parsed.success) {
    res.status(400).json({ error: parsed.success ? "Invalid id" : parsed.error.message });
    return;
  }
  const [entry] = await db
    .update(addressBookEntriesTable)
    .set(parsed.data)
    .where(and(eq(addressBookEntriesTable.id, id), eq(addressBookEntriesTable.ownerId, owner(req)!)))
    .returning();
  if (!entry) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  res.json(entry);
});

router.delete("/address-book/:id", async (req, res): Promise<void> => {
  const id = numberParam(req.params.id);
  if (!Number.isInteger(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const [entry] = await db
    .delete(addressBookEntriesTable)
    .where(and(eq(addressBookEntriesTable.id, id), eq(addressBookEntriesTable.ownerId, owner(req)!)))
    .returning({ id: addressBookEntriesTable.id });
  if (!entry) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  res.status(204).send();
});

router.post(
  "/weddings/:weddingId/vendors/from-address-book/:addressBookId",
  async (req, res): Promise<void> => {
    const weddingId = numberParam(req.params.weddingId);
    const addressBookId = numberParam(req.params.addressBookId);
    if (!Number.isInteger(weddingId) || !Number.isInteger(addressBookId)) {
      res.status(400).json({ error: "Invalid id" });
      return;
    }

    const [wedding] = await db
      .select({ id: weddingsTable.id })
      .from(weddingsTable)
      .where(and(eq(weddingsTable.id, weddingId), eq(weddingsTable.ownerId, owner(req)!)));
    if (!wedding) {
      res.status(404).json({ error: "Not found" });
      return;
    }

    const [entry] = await db
      .select()
      .from(addressBookEntriesTable)
      .where(and(eq(addressBookEntriesTable.id, addressBookId), eq(addressBookEntriesTable.ownerId, owner(req)!)));
    if (!entry) {
      res.status(404).json({ error: "Not found" });
      return;
    }

    const [vendor] = await db.insert(vendorsTable).values({
      weddingId,
      name: entry.name,
      category: entry.category,
      status: "awaiting_contract",
      totalAmountCents: "0",
      contactName: entry.contactName,
      contactEmail: entry.contactEmail,
      contactPhone: entry.contactPhone,
      notes: entry.notes,
    }).returning();

    res.status(201).json({
      ...vendor,
      totalAmountCents: Number(vendor!.totalAmountCents),
      depositAmountCents: vendor!.depositAmountCents == null ? null : Number(vendor!.depositAmountCents),
    });
  },
);

export default router;