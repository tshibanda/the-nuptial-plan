import { pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const addressBookEntriesTable = pgTable("address_book_entries", {
  id: serial("id").primaryKey(),
  ownerId: text("owner_id").notNull(),
  name: text("name").notNull(),
  category: text("category").notNull(),
  contactName: text("contact_name"),
  contactEmail: text("contact_email"),
  contactPhone: text("contact_phone"),
  website: text("website"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertAddressBookEntrySchema = createInsertSchema(addressBookEntriesTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertAddressBookEntry = z.infer<typeof insertAddressBookEntrySchema>;
export type AddressBookEntry = typeof addressBookEntriesTable.$inferSelect;