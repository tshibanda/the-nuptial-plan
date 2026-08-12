import { pgTable, text, timestamp, boolean, uniqueIndex } from "drizzle-orm/pg-core";

/**
 * Unified access snapshot for a planner.
 *
 * Product catalog and billing truth stay in Stripe/RevenueCat. This table only
 * stores the provider identifiers and the latest access state needed by the
 * application, so web and mobile can share one entitlement decision.
 */
export const subscriptionsTable = pgTable(
  "subscriptions",
  {
    id: text("id").primaryKey(),
    ownerId: text("owner_id").notNull(),
    provider: text("provider").notNull(), // stripe | revenuecat
    status: text("status").notNull(), // trialing | active | past_due | canceled | expired
    plan: text("plan").notNull(), // monthly | annual
    trialEndsAt: timestamp("trial_ends_at", { withTimezone: true }),
    currentPeriodEnd: timestamp("current_period_end", { withTimezone: true }),
    cancelAtPeriodEnd: boolean("cancel_at_period_end").notNull().default(false),
    providerCustomerId: text("provider_customer_id"),
    providerSubscriptionId: text("provider_subscription_id"),
    entitlementId: text("entitlement_id"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
  },
  (table) => ({
    ownerProviderUnique: uniqueIndex("subscriptions_owner_provider_idx").on(table.ownerId, table.provider),
    providerSubscriptionUnique: uniqueIndex("subscriptions_provider_subscription_idx").on(table.provider, table.providerSubscriptionId),
  }),
);

export type Subscription = typeof subscriptionsTable.$inferSelect;