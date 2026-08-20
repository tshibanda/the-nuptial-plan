import { pgTable, text, timestamp, jsonb, uniqueIndex } from "drizzle-orm/pg-core";

/**
 * Stores OAuth tokens and cached stats for each connected social account.
 * One row per planner (ownerId) per platform.
 *
 * OAuth tokens are encrypted in the API process before storage; restrict DB
 * access and rotate the encryption secret according to the security policy.
 * statsCache holds the last-fetched metrics so the UI stays fast between syncs.
 */
export const socialAccountsTable = pgTable(
  "social_accounts",
  {
    id: text("id").primaryKey(),
    ownerId: text("owner_id").notNull(),
    platform: text("platform").notNull(), // facebook | instagram | tiktok
    handle: text("handle").notNull().default(""),
    pageId: text("page_id"), // Meta Page or IG Business account ID
    accessToken: text("access_token").notNull(),
    refreshToken: text("refresh_token"),
    tokenExpiresAt: timestamp("token_expires_at", { withTimezone: true }),
    scopes: text("scopes").notNull().default(""),
    status: text("status").notNull().default("connected"), // connected | needs_reauth
    statsCache: jsonb("stats_cache"), // { followers, reach, engagement, posts, lastPost }
    statsUpdatedAt: timestamp("stats_updated_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
  },
  (table) => ({
    ownerPlatformUnique: uniqueIndex("social_accounts_owner_platform_idx").on(table.ownerId, table.platform),
  }),
);

export type SocialAccount = typeof socialAccountsTable.$inferSelect;
