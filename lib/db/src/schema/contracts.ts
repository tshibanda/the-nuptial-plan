import { pgTable, text, serial, timestamp, numeric, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { weddingsTable } from "./weddings";

export const contractsTable = pgTable("contracts", {
  id: serial("id").primaryKey(),
  weddingId: integer("wedding_id").notNull().references(() => weddingsTable.id, { onDelete: "cascade" }),
  vendorName: text("vendor_name").notNull(),
  status: text("status").notNull().default("En attente"),
  totalAmount: numeric("total_amount", { precision: 12, scale: 2 }).notNull(),
  depositAmount: numeric("deposit_amount", { precision: 12, scale: 2 }),
  signedAt: text("signed_at"), // YYYY-MM-DD
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertContractSchema = createInsertSchema(contractsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertContract = z.infer<typeof insertContractSchema>;
export type Contract = typeof contractsTable.$inferSelect;
