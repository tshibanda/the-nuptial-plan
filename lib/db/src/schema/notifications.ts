import { pgTable, serial, integer, text, boolean, timestamp } from "drizzle-orm/pg-core";

export const notificationsTable = pgTable("notifications", {
  id: serial("id").primaryKey(),
  weddingId: integer("wedding_id").notNull(),
  kind: text("kind").notNull(),
  title: text("title").notNull(),
  body: text("body").notNull(),
  route: text("route"),
  read: boolean("read").notNull().default(false),
  dedupeKey: text("dedupe_key").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type Notification = typeof notificationsTable.$inferSelect;