import { pgTable, text, serial, timestamp, numeric, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const weddingsTable = pgTable("weddings", {
  id: serial("id").primaryKey(),
  coupleName: text("couple_name").notNull(),
  partner1: text("partner1").notNull().default(""),
  partner2: text("partner2").notNull().default(""),
  weddingDate: text("wedding_date").notNull(), // YYYY-MM-DD
  venue: text("venue").notNull(),
  budgetTotal: numeric("budget_total", { precision: 12, scale: 2 }).notNull().default("0"),
  guestCountTarget: integer("guest_count_target"),
  notes: text("notes"),
  venueImageUrl: text("venue_image_url"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertWeddingSchema = createInsertSchema(weddingsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertWedding = z.infer<typeof insertWeddingSchema>;
export type Wedding = typeof weddingsTable.$inferSelect;
