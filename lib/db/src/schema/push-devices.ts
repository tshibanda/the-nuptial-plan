import { index, pgTable, serial, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";

/**
 * Mobile devices that explicitly authorized push notifications. A token belongs
 * to exactly one planner at a time so a shared device cannot receive another
 * planner's notifications after they sign in.
 */
export const pushDevicesTable = pgTable(
  "push_devices",
  {
    id: serial("id").primaryKey(),
    ownerId: text("owner_id").notNull(),
    expoPushToken: text("expo_push_token").notNull(),
    platform: text("platform").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
  },
  (table) => ({
    tokenUnique: uniqueIndex("push_devices_token_idx").on(table.expoPushToken),
    ownerIndex: index("push_devices_owner_idx").on(table.ownerId),
  }),
);

export type PushDevice = typeof pushDevicesTable.$inferSelect;