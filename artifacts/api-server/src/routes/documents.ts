import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { documentsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";

const router: IRouter = Router({ mergeParams: true });

const p = (req: { params: Record<string, string> }, key: string) => Number(req.params[key]);

// GET /weddings/:weddingId/documents[?entityType=vendor&entityId=5]
router.get("/", async (req, res): Promise<void> => {
  const weddingId = p(req, "weddingId");
  const { entityType, entityId } = req.query as { entityType?: string; entityId?: string };

  let docs;
  if (entityType && entityId) {
    docs = await db
      .select()
      .from(documentsTable)
      .where(
        and(
          eq(documentsTable.weddingId, weddingId),
          eq(documentsTable.entityType, entityType),
          eq(documentsTable.entityId, Number(entityId)),
        ),
      );
  } else if (entityType) {
    docs = await db
      .select()
      .from(documentsTable)
      .where(and(eq(documentsTable.weddingId, weddingId), eq(documentsTable.entityType, entityType)));
  } else {
    docs = await db.select().from(documentsTable).where(eq(documentsTable.weddingId, weddingId));
  }

  res.json(docs);
});

// POST /weddings/:weddingId/documents
router.post("/", async (req, res): Promise<void> => {
  const weddingId = p(req, "weddingId");
  const { name, objectPath, contentType, size, entityType, entityId } = req.body as {
    name: string;
    objectPath: string;
    contentType?: string;
    size?: number;
    entityType?: string;
    entityId?: number;
  };

  if (!name || !objectPath) {
    res.status(400).json({ error: "name and objectPath are required" });
    return;
  }

  const [doc] = await db
    .insert(documentsTable)
    .values({
      weddingId,
      name,
      objectPath,
      contentType: contentType ?? null,
      size: size ?? null,
      entityType: entityType ?? "wedding",
      entityId: entityId ?? null,
    })
    .returning();

  res.status(201).json(doc);
});

// DELETE /weddings/:weddingId/documents/:id
router.delete("/:id", async (req, res): Promise<void> => {
  const weddingId = p(req, "weddingId");
  const id = p(req, "id");
  await db.delete(documentsTable).where(and(eq(documentsTable.id, id), eq(documentsTable.weddingId, weddingId)));
  res.status(204).send();
});

export default router;
