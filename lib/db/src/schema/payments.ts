import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const paymentsTable = pgTable("payments", {
  id: serial("id").primaryKey(),
  weddingId: integer("wedding_id").notNull(),
  vendorId: integer("vendor_id"),
  vendorName: text("vendor_name").notNull(),
  description: text("description").notNull(),
  amountCents: integer("amount_cents").notNull().default(0),
  dueDate: text("due_date").notNull(),
  status: text("status").notNull().default("pending"),
  paidDate: text("paid_date"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertPaymentSchema = createInsertSchema(paymentsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertPayment = z.infer<typeof insertPaymentSchema>;
export type Payment = typeof paymentsTable.$inferSelect;
