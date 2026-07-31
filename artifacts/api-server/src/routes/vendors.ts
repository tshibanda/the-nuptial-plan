import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, vendorsTable } from "@workspace/db";
import { coerceNumeric } from "../lib/coerce";
import {
  ListVendorsParams,
  ListVendorsResponse,
  CreateVendorParams,
  CreateVendorBody,
  CreateVendorResponse,
  UpdateVendorParams,
  UpdateVendorBody,
  UpdateVendorResponse,
  DeleteVendorParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

// List vendors for a wedding
router.get("/weddings/:weddingId/vendors", async (req, res): Promise<void> => {
  const params = ListVendorsParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const vendors = await db
    .select()
    .from(vendorsTable)
    .where(eq(vendorsTable.weddingId, params.data.weddingId))
    .orderBy(vendorsTable.createdAt);
  res.json(ListVendorsResponse.parse(vendors.map(v => coerceNumeric(v, ["totalAmount", "depositAmount"]))));
});

// Create vendor
router.post("/weddings/:weddingId/vendors", async (req, res): Promise<void> => {
  const params = CreateVendorParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = CreateVendorBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [vendor] = await db
    .insert(vendorsTable)
    .values({ ...parsed.data, weddingId: params.data.weddingId })
    .returning();
  res.status(201).json(CreateVendorResponse.parse(coerceNumeric(vendor, ["totalAmount", "depositAmount"])));
});

// Update vendor
router.patch("/vendors/:vendorId", async (req, res): Promise<void> => {
  const params = UpdateVendorParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = UpdateVendorBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [vendor] = await db
    .update(vendorsTable)
    .set(parsed.data)
    .where(eq(vendorsTable.id, params.data.vendorId))
    .returning();
  if (!vendor) {
    res.status(404).json({ error: "Prestataire introuvable" });
    return;
  }
  res.json(UpdateVendorResponse.parse(coerceNumeric(vendor, ["totalAmount", "depositAmount"])));
});

// Delete vendor
router.delete("/vendors/:vendorId", async (req, res): Promise<void> => {
  const params = DeleteVendorParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [vendor] = await db
    .delete(vendorsTable)
    .where(eq(vendorsTable.id, params.data.vendorId))
    .returning();
  if (!vendor) {
    res.status(404).json({ error: "Prestataire introuvable" });
    return;
  }
  res.sendStatus(204);
});

export default router;
