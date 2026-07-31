import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const documentsTable = pgTable("documents", {
  id: serial("id").primaryKey(),
  weddingId: integer("wedding_id").notNull(),
  /** 'vendor' | 'contract' | 'wedding' */
  entityType: text("entity_type").notNull().default("wedding"),
  /** Optional: id of the linked vendor or contract */
  entityId: integer("entity_id"),
  /** Original filename shown to the planner */
  name: text("name").notNull(),
  /** GCS object path, e.g. /objects/uploads/<uuid> */
  objectPath: text("object_path").notNull(),
  contentType: text("content_type"),
  size: integer("size"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertDocumentSchema = createInsertSchema(documentsTable).omit({ id: true, createdAt: true });
export type InsertDocument = z.infer<typeof insertDocumentSchema>;
export type Document = typeof documentsTable.$inferSelect;
