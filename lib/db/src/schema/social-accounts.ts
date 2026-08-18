import { pgTable, serial, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";

export const socialAccountsTable = pgTable("social_accounts", {
  id: serial("id").primaryKey(),
  ownerId: text("owner_id").notNull(),
  platform: text("platform").notNull(),
  providerAccountId: text("provider_account_id"),
  handle: text("handle"),
  encryptedAccessToken: text("encrypted_access_token").notNull(),
  tokenExpiresAt: timestamp("token_expires_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  ownerPlatformUnique: uniqueIndex("social_accounts_owner_platform_idx").on(table.ownerId, table.platform),
}));

export type SocialAccount = typeof socialAccountsTable.$inferSelect;