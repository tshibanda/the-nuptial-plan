import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { paymentsTable, activityTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { CreatePaymentBody, UpdatePaymentBody } from "@workspace/api-zod";

const router: IRouter = Router({ mergeParams: true });

const p = (req: { params: Record<string, string> }, key: string) => Number(req.params[key]);

function serializePayment(payment: any) {
  return {
    ...payment,
    amountCents: Number(payment.amountCents ?? 0),
  };
}

router.get("/", async (req, res): Promise<void> => {
  const weddingId = p(req, "weddingId");
  const payments = await db.select().from(paymentsTable).where(eq(paymentsTable.weddingId, weddingId)).orderBy(paymentsTable.dueDate);
  res.json(payments.map(serializePayment));
});

router.post("/", async (req, res): Promise<void> => {
  const weddingId = p(req, "weddingId");
  const body = CreatePaymentBody.safeParse(req.body);
  if (!body.success) { res.status(400).json({ error: "Invalid input" }); return; }
  const [payment] = await db.insert(paymentsTable).values({
    ...body.data,
    weddingId,
    amountCents: String(body.data.amountCents),
  }).returning();
  await db.insert(activityTable).values({
    weddingId,
    description: `Paiement enregistré : ${payment!.vendorName} – ${payment!.description}`,
    entityType: "payment",
    initials: payment!.vendorName.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase(),
  });
  res.status(201).json(serializePayment(payment));
});

router.patch("/:id", async (req, res): Promise<void> => {
  const weddingId = p(req, "weddingId");
  const id = p(req, "id");
  const body = UpdatePaymentBody.safeParse(req.body);
  if (!body.success) { res.status(400).json({ error: "Invalid input" }); return; }
  const [payment] = await db.update(paymentsTable).set({
    ...body.data,
    amountCents: body.data.amountCents === undefined ? undefined : String(body.data.amountCents),
  }).where(and(eq(paymentsTable.id, id), eq(paymentsTable.weddingId, weddingId))).returning();
  if (!payment) { res.status(404).json({ error: "Not found" }); return; }
  res.json(serializePayment(payment));
});

router.delete("/:id", async (req, res): Promise<void> => {
  const weddingId = p(req, "weddingId");
  const id = p(req, "id");
  await db.delete(paymentsTable).where(and(eq(paymentsTable.id, id), eq(paymentsTable.weddingId, weddingId)));
  res.status(204).send();
});

export default router;
