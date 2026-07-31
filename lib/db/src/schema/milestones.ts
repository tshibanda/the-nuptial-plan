import { pgTable, text, serial, timestamp, integer, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { weddingsTable } from "./weddings";

export const milestonesTable = pgTable("milestones", {
  id: serial("id").primaryKey(),
  weddingId: integer("wedding_id").notNull().references(() => weddingsTable.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  detail: text("detail"),
  dueDate: text("due_date").notNull(), // YYYY-MM-DD
  completed: boolean("completed").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertMilestoneSchema = createInsertSchema(milestonesTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertMilestone = z.infer<typeof insertMilestoneSchema>;
export type Milestone = typeof milestonesTable.$inferSelect;
