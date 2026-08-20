---
name: Social OAuth security
description: Cross-client OAuth constraints and credential-handling policy for planner social accounts.
---

# Social OAuth security

OAuth callbacks originate outside the authenticated app session. Identify the planner exclusively through a short-lived, HMAC-signed state value; use a web route for web sessions and the registered app deep link for mobile sessions.

**Why:** Browser cookies do not transfer from an Expo app into a provider authorization flow, and an unsigned callback parameter could connect a provider account to the wrong planner.

**How to apply:** Keep all provider tokens server-only and encrypted at rest. When introducing or changing the credential table, declare the change in the database schema and use Replit’s publish-time production migration flow; do not run schema DDL from the API process.

## Scheduled metrics refresh

The social metrics job runs inside the API process on startup and every six hours. It reuses the manual sync path, processes accounts independently, and only updates `statsCache` after a non-null provider response.

**Why:** Provider failures must not erase the planner's last known-good dashboard metrics, and a failed account must not prevent other connected platforms from refreshing.

**How to apply:** Keep scheduled work non-blocking at boot, guard against overlapping runs, and treat token reauthorization failures separately from ordinary stats-fetch failures.

## Legacy table compatibility

The database may contain an earlier social-account record shape. Preserve existing credentials through additive, publish-time schema changes and resolve any rename confirmation in the Publish UI.

**Why:** Replacing a table would lose previously connected accounts, while startup-time migration can block the API from becoming healthy.

**How to apply:** Keep compatibility changes additive in the schema source of truth and review the generated production schema diff before publishing.

## Legacy encrypted-token column

The legacy `encrypted_access_token` column remains required alongside the current encrypted `access_token` column. Social account creates and access-token renewals must dual-write the same ciphertext to both fields until a deliberate, data-preserving migration removes the legacy constraint.

**Why:** Existing development and production tables enforce a non-null constraint on the legacy column; omitting it makes an otherwise valid OAuth callback fail at insert time.

**How to apply:** Treat both columns as server-only encrypted credentials. Never return either column to a client, and do not log database query parameters when a social OAuth write fails.