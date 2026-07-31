import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const weddingsTable = pgTable("weddings", {
  id: serial("id").primaryKey(),
  names: text("names").notNull(),
  weddingDate: text("wedding_date").notNull(),
  venue: text("venue").notNull(),
  totalBudget: integer("total_budget").notNull().default(0),
  guestCount: integer("guest_count").notNull().default(0),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertWeddingSchema = createInsertSchema(weddingsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertWedding = z.infer<typeof insertWeddingSchema>;
export type Wedding = typeof weddingsTable.$inferSelect;
