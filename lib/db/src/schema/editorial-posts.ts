import { date, index, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

/**
 * Editorial posts are planner-owned content plans. They intentionally track
 * planning and manual follow-up only; publishing remains provider-specific.
 */
export const editorialPostsTable = pgTable(
  "editorial_posts",
  {
    id: text("id").primaryKey(),
    ownerId: text("owner_id").notNull(),
    platform: text("platform").notNull(),
    title: text("title").notNull(),
    content: text("content").notNull().default(""),
    scheduledDate: date("scheduled_date", { mode: "string" }).notNull(),
    scheduledTime: text("scheduled_time"),
    status: text("status").notNull().default("draft"),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    notes: text("notes").notNull().default(""),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
  },
  (table) => ({
    ownerScheduledIndex: index("editorial_posts_owner_scheduled_idx").on(table.ownerId, table.scheduledDate),
  }),
);

export const insertEditorialPostSchema = createInsertSchema(editorialPostsTable).omit({
  id: true,
  ownerId: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertEditorialPost = z.infer<typeof insertEditorialPostSchema>;
export type EditorialPost = typeof editorialPostsTable.$inferSelect;