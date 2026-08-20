import crypto from "crypto";
import { Router, type IRouter, type Request, type Response } from "express";
import { and, asc, eq } from "drizzle-orm";
import { db, editorialPostsTable } from "@workspace/db";

const router: IRouter = Router();

const PLATFORMS = ["facebook", "instagram", "tiktok"] as const;
const STATUSES = ["draft", "scheduled", "published", "cancelled"] as const;
type EditorialPlatform = typeof PLATFORMS[number];
type EditorialStatus = typeof STATUSES[number];

type EditorialInput = {
  platform: EditorialPlatform;
  title: string;
  content: string;
  scheduledDate: string;
  scheduledTime: string | null;
  status: EditorialStatus;
  notes: string;
};

function owner(req: Request): string {
  return (req as Request & { userId?: string }).userId ?? "";
}

function isDate(value: unknown): value is string {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function isTime(value: unknown): value is string {
  return typeof value === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
}

function asOptionalText(value: unknown, maxLength: number): string | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (typeof value !== "string" || value.length > maxLength) return undefined;
  return value;
}

function parseCreateInput(body: unknown): EditorialInput | null {
  if (!body || typeof body !== "object") return null;
  const data = body as Record<string, unknown>;
  const title = typeof data.title === "string" ? data.title.trim() : "";
  const content = asOptionalText(data.content, 10_000);
  const notes = asOptionalText(data.notes, 4_000);

  if (
    !title
    || title.length > 180
    || !PLATFORMS.includes(data.platform as EditorialPlatform)
    || !STATUSES.includes(data.status as EditorialStatus)
    || !isDate(data.scheduledDate)
    || content === undefined
    || notes === undefined
    || (data.scheduledTime !== null && data.scheduledTime !== undefined && !isTime(data.scheduledTime))
  ) {
    return null;
  }

  return {
    platform: data.platform as EditorialPlatform,
    title,
    content: content ?? "",
    scheduledDate: data.scheduledDate,
    scheduledTime: data.scheduledTime ?? null,
    status: data.status as EditorialStatus,
    notes: notes ?? "",
  };
}

function parseUpdateInput(body: unknown): Partial<EditorialInput> | null {
  if (!body || typeof body !== "object") return null;
  const data = body as Record<string, unknown>;
  const update: Partial<EditorialInput> = {};

  if ("platform" in data) {
    if (!PLATFORMS.includes(data.platform as EditorialPlatform)) return null;
    update.platform = data.platform as EditorialPlatform;
  }
  if ("title" in data) {
    if (typeof data.title !== "string" || !data.title.trim() || data.title.trim().length > 180) return null;
    update.title = data.title.trim();
  }
  if ("content" in data) {
    const content = asOptionalText(data.content, 10_000);
    if (content === undefined || content === null) return null;
    update.content = content;
  }
  if ("notes" in data) {
    const notes = asOptionalText(data.notes, 4_000);
    if (notes === undefined || notes === null) return null;
    update.notes = notes;
  }
  if ("scheduledDate" in data) {
    if (!isDate(data.scheduledDate)) return null;
    update.scheduledDate = data.scheduledDate;
  }
  if ("scheduledTime" in data) {
    if (data.scheduledTime !== null && !isTime(data.scheduledTime)) return null;
    update.scheduledTime = data.scheduledTime as string | null;
  }
  if ("status" in data) {
    if (!STATUSES.includes(data.status as EditorialStatus)) return null;
    update.status = data.status as EditorialStatus;
  }

  return Object.keys(update).length ? update : null;
}

router.get("/", async (req: Request, res: Response): Promise<void> => {
  const posts = await db.select()
    .from(editorialPostsTable)
    .where(eq(editorialPostsTable.ownerId, owner(req)))
    .orderBy(asc(editorialPostsTable.scheduledDate), asc(editorialPostsTable.scheduledTime));
  res.json(posts);
});

router.post("/", async (req: Request, res: Response): Promise<void> => {
  const input = parseCreateInput(req.body);
  if (!input) {
    res.status(400).json({ error: "Invalid editorial post" });
    return;
  }

  const [post] = await db.insert(editorialPostsTable).values({
    id: crypto.randomUUID(),
    ownerId: owner(req),
    ...input,
    publishedAt: input.status === "published" ? new Date() : null,
  }).returning();

  res.status(201).json(post);
});

router.patch("/:id", async (req: Request, res: Response): Promise<void> => {
  const input = parseUpdateInput(req.body);
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  if (!input || !id) {
    res.status(400).json({ error: "Invalid editorial post" });
    return;
  }

  const [existing] = await db.select()
    .from(editorialPostsTable)
    .where(and(eq(editorialPostsTable.id, id), eq(editorialPostsTable.ownerId, owner(req))));

  if (!existing) {
    res.status(404).json({ error: "Editorial post not found" });
    return;
  }

  const statusChangedToPublished = input.status === "published" && existing.status !== "published";
  const statusChangedAwayFromPublished = input.status !== undefined && input.status !== "published";
  const [post] = await db.update(editorialPostsTable)
    .set({
      ...input,
      publishedAt: statusChangedToPublished ? new Date() : statusChangedAwayFromPublished ? null : existing.publishedAt,
      updatedAt: new Date(),
    })
    .where(and(eq(editorialPostsTable.id, id), eq(editorialPostsTable.ownerId, owner(req)))
    ).returning();

  res.json(post);
});

router.delete("/:id", async (req: Request, res: Response): Promise<void> => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  if (!id) {
    res.status(400).json({ error: "Invalid editorial post id" });
    return;
  }

  const [post] = await db.delete(editorialPostsTable)
    .where(and(eq(editorialPostsTable.id, id), eq(editorialPostsTable.ownerId, owner(req)))
    ).returning();

  if (!post) {
    res.status(404).json({ error: "Editorial post not found" });
    return;
  }

  res.status(204).send();
});

export default router;