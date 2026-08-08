import { pgTable, serial, text, integer, numeric, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const weddingsTable = pgTable("weddings", {
  id: serial("id").primaryKey(),
  ownerId: text("owner_id"),
  names: text("couple_name").notNull(),
  partner1: text("partner1"),
  partner2: text("partner2"),
  currency: text("currency").notNull().default("EUR"),
  weddingDate: text("wedding_date").notNull(),
  venue: text("venue").notNull(),
  totalBudget: numeric("budget_total").notNull().default("0"),
  guestCount: integer("guest_count_target").notNull().default(0),
  venueImageUrl: text("venue_image_url"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertWeddingSchema = createInsertSchema(weddingsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertWedding = z.infer<typeof insertWeddingSchema>;
export type Wedding = typeof weddingsTable.$inferSelect;
