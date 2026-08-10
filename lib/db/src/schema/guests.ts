import { pgTable, serial, text, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const guestsTable = pgTable("guests", {
  id: serial("id").primaryKey(),
  weddingId: integer("wedding_id").notNull(),
  name: text("name").notNull(),
  email: text("email"),
  tableNumber: text("table_number"),
  dietaryRequirements: text("dietary"),   // DB column is "dietary"
  rsvpStatus: text("rsvp_status").notNull().default("pending"),
  rsvpToken: text("rsvp_token"),
  plusOne: boolean("plus_one").notNull().default(false),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertGuestSchema = createInsertSchema(guestsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertGuest = z.infer<typeof insertGuestSchema>;
export type Guest = typeof guestsTable.$inferSelect;
