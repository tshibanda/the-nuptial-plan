import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, contractsTable } from "@workspace/db";
import { coerceNumeric } from "../lib/coerce";
import {
  ListContractsParams,
  ListContractsResponse,
  CreateContractParams,
  CreateContractBody,
  CreateContractResponse,
  UpdateContractParams,
  UpdateContractBody,
  UpdateContractResponse,
  DeleteContractParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

// List contracts for a wedding
router.get("/weddings/:weddingId/contracts", async (req, res): Promise<void> => {
  const params = ListContractsParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const contracts = await db
    .select()
    .from(contractsTable)
    .where(eq(contractsTable.weddingId, params.data.weddingId))
    .orderBy(contractsTable.createdAt);
  res.json(ListContractsResponse.parse(contracts.map(c => coerceNumeric(c, ["totalAmount", "depositAmount"]))));
});

// Create contract
router.post("/weddings/:weddingId/contracts", async (req, res): Promise<void> => {
  const params = CreateContractParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = CreateContractBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [contract] = await db
    .insert(contractsTable)
    .values({ ...parsed.data, weddingId: params.data.weddingId })
    .returning();
  res.status(201).json(CreateContractResponse.parse(coerceNumeric(contract, ["totalAmount", "depositAmount"])));
});

// Update contract
router.patch("/contracts/:contractId", async (req, res): Promise<void> => {
  const params = UpdateContractParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = UpdateContractBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [contract] = await db
    .update(contractsTable)
    .set(parsed.data)
    .where(eq(contractsTable.id, params.data.contractId))
    .returning();
  if (!contract) {
    res.status(404).json({ error: "Contrat introuvable" });
    return;
  }
  res.json(UpdateContractResponse.parse(coerceNumeric(contract, ["totalAmount", "depositAmount"])));
});

// Delete contract
router.delete("/contracts/:contractId", async (req, res): Promise<void> => {
  const params = DeleteContractParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [contract] = await db
    .delete(contractsTable)
    .where(eq(contractsTable.id, params.data.contractId))
    .returning();
  if (!contract) {
    res.status(404).json({ error: "Contrat introuvable" });
    return;
  }
  res.sendStatus(204);
});

export default router;
