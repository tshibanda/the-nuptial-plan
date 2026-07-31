import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const contractsTable = pgTable("contracts", {
  id: serial("id").primaryKey(),
  weddingId: integer("wedding_id").notNull(),
  vendorId: integer("vendor_id"),
  vendorName: text("vendor_name").notNull(),
  status: text("status").notNull().default("pending"),
  totalAmountCents: integer("total_amount_cents").notNull().default(0),
  depositPaidCents: integer("deposit_paid_cents"),
  signedDate: text("signed_date"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertContractSchema = createInsertSchema(contractsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertContract = z.infer<typeof insertContractSchema>;
export type Contract = typeof contractsTable.$inferSelect;
