import { pgTable, text, serial, timestamp, numeric, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { weddingsTable } from "./weddings";

export const paymentsTable = pgTable("payments", {
  id: serial("id").primaryKey(),
  weddingId: integer("wedding_id").notNull().references(() => weddingsTable.id, { onDelete: "cascade" }),
  vendorName: text("vendor_name").notNull(),
  description: text("description").notNull(),
  amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
  dueDate: text("due_date").notNull(), // YYYY-MM-DD
  status: text("status").notNull().default("À régler"),
  paidAt: text("paid_at"), // YYYY-MM-DD
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertPaymentSchema = createInsertSchema(paymentsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertPayment = z.infer<typeof insertPaymentSchema>;
export type Payment = typeof paymentsTable.$inferSelect;
