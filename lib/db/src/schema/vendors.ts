import { pgTable, text, serial, timestamp, numeric, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { weddingsTable } from "./weddings";

export const vendorsTable = pgTable("vendors", {
  id: serial("id").primaryKey(),
  weddingId: integer("wedding_id").notNull().references(() => weddingsTable.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  category: text("category").notNull(),
  status: text("status").notNull().default("Contrat en attente"),
  totalAmount: numeric("total_amount", { precision: 12, scale: 2 }),
  depositAmount: numeric("deposit_amount", { precision: 12, scale: 2 }),
  contactName: text("contact_name"),
  contactEmail: text("contact_email"),
  contactPhone: text("contact_phone"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertVendorSchema = createInsertSchema(vendorsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertVendor = z.infer<typeof insertVendorSchema>;
export type Vendor = typeof vendorsTable.$inferSelect;
