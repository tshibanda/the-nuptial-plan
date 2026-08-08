import { and, eq } from "drizzle-orm";
import type { Request, Response, NextFunction } from "express";
import { db, weddingsTable } from "@workspace/db";

export async function requireWeddingOwnership(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const weddingId = Number(req.params.weddingId);
  const ownerId = (req as Request & { userId?: string }).userId;

  if (!Number.isInteger(weddingId) || !ownerId) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  const [wedding] = await db
    .select({ id: weddingsTable.id })
    .from(weddingsTable)
    .where(and(eq(weddingsTable.id, weddingId), eq(weddingsTable.ownerId, ownerId)));

  if (!wedding) {
    // Do not reveal whether another planner's wedding exists.
    res.status(404).json({ error: "Not found" });
    return;
  }

  next();
}