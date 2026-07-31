import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, paymentsTable } from "@workspace/db";
import { coerceNumeric } from "../lib/coerce";
import {
  ListPaymentsParams,
  ListPaymentsResponse,
  CreatePaymentParams,
  CreatePaymentBody,
  CreatePaymentResponse,
  UpdatePaymentParams,
  UpdatePaymentBody,
  UpdatePaymentResponse,
  DeletePaymentParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

// List payments for a wedding
router.get("/weddings/:weddingId/payments", async (req, res): Promise<void> => {
  const params = ListPaymentsParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const payments = await db
    .select()
    .from(paymentsTable)
    .where(eq(paymentsTable.weddingId, params.data.weddingId))
    .orderBy(paymentsTable.dueDate);
  res.json(ListPaymentsResponse.parse(payments.map(p => coerceNumeric(p, ["amount"]))));
});

// Create payment
router.post("/weddings/:weddingId/payments", async (req, res): Promise<void> => {
  const params = CreatePaymentParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = CreatePaymentBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [payment] = await db
    .insert(paymentsTable)
    .values({ ...parsed.data, weddingId: params.data.weddingId })
    .returning();
  res.status(201).json(CreatePaymentResponse.parse(coerceNumeric(payment, ["amount"])));
});

// Update payment
router.patch("/payments/:paymentId", async (req, res): Promise<void> => {
  const params = UpdatePaymentParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = UpdatePaymentBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [payment] = await db
    .update(paymentsTable)
    .set(parsed.data)
    .where(eq(paymentsTable.id, params.data.paymentId))
    .returning();
  if (!payment) {
    res.status(404).json({ error: "Paiement introuvable" });
    return;
  }
  res.json(UpdatePaymentResponse.parse(coerceNumeric(payment, ["amount"])));
});

// Delete payment
router.delete("/payments/:paymentId", async (req, res): Promise<void> => {
  const params = DeletePaymentParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [payment] = await db
    .delete(paymentsTable)
    .where(eq(paymentsTable.id, params.data.paymentId))
    .returning();
  if (!payment) {
    res.status(404).json({ error: "Paiement introuvable" });
    return;
  }
  res.sendStatus(204);
});

export default router;
