import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { contractsTable, activityTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { CreateContractBody, UpdateContractBody } from "@workspace/api-zod";

const router: IRouter = Router({ mergeParams: true });

const p = (req: { params: Record<string, string> }, key: string) => Number(req.params[key]);

router.get("/", async (req, res): Promise<void> => {
  const weddingId = p(req, "weddingId");
  const contracts = await db.select().from(contractsTable).where(eq(contractsTable.weddingId, weddingId));
  res.json(contracts);
});

router.post("/", async (req, res): Promise<void> => {
  const weddingId = p(req, "weddingId");
  const body = CreateContractBody.safeParse(req.body);
  if (!body.success) { res.status(400).json({ error: "Invalid input" }); return; }
  const [contract] = await db.insert(contractsTable).values({
    ...body.data,
    weddingId,
    totalAmountCents: String(body.data.totalAmountCents),
    depositPaidCents: body.data.depositPaidCents === undefined ? undefined : String(body.data.depositPaidCents),
  }).returning();
  await db.insert(activityTable).values({
    weddingId,
    description: `Contrat créé : ${contract!.vendorName}`,
    entityType: "contract",
    initials: contract!.vendorName.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase(),
  });
  res.status(201).json(contract);
});

router.patch("/:id", async (req, res): Promise<void> => {
  const weddingId = p(req, "weddingId");
  const id = p(req, "id");
  const body = UpdateContractBody.safeParse(req.body);
  if (!body.success) { res.status(400).json({ error: "Invalid input" }); return; }
  const [contract] = await db.update(contractsTable).set({
    ...body.data,
    totalAmountCents: body.data.totalAmountCents === undefined ? undefined : String(body.data.totalAmountCents),
    depositPaidCents: body.data.depositPaidCents === undefined ? undefined : String(body.data.depositPaidCents),
  }).where(and(eq(contractsTable.id, id), eq(contractsTable.weddingId, weddingId))).returning();
  if (!contract) { res.status(404).json({ error: "Not found" }); return; }
  await db.insert(activityTable).values({
    weddingId,
    description: `Contrat mis à jour : ${contract.vendorName}`,
    entityType: "contract",
    initials: contract.vendorName.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase(),
  });
  res.json(contract);
});

router.delete("/:id", async (req, res): Promise<void> => {
  const weddingId = p(req, "weddingId");
  const id = p(req, "id");
  await db.delete(contractsTable).where(and(eq(contractsTable.id, id), eq(contractsTable.weddingId, weddingId)));
  res.status(204).send();
});

export default router;
