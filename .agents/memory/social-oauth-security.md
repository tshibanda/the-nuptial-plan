---
name: Social OAuth security
description: Cross-client OAuth constraints and credential-handling policy for planner social accounts.
---

# Social OAuth security

OAuth callbacks originate outside the authenticated app session. Identify the planner exclusively through a short-lived, HMAC-signed state value; use a web route for web sessions and the registered app deep link for mobile sessions.

**Why:** Browser cookies do not transfer from an Expo app into a provider authorization flow, and an unsigned callback parameter could connect a provider account to the wrong planner.

**How to apply:** Keep all provider tokens server-only and encrypted at rest. When introducing or changing the credential table, ensure production startup can safely create/upgrade the table before any social route is served; do not depend on a developer-only schema push.

## Scheduled metrics refresh

The social metrics job runs inside the API process on startup and every six hours. It reuses the manual sync path, processes accounts independently, and only updates `statsCache` after a non-null provider response.

**Why:** Provider failures must not erase the planner's last known-good dashboard metrics, and a failed account must not prevent other connected platforms from refreshing.

**How to apply:** Keep scheduled work non-blocking at boot, guard against overlapping runs, and treat token reauthorization failures separately from ordinary stats-fetch failures.

## Legacy table compatibility

The database may contain an earlier `social_accounts` shape with an integer id and `encrypted_access_token`. Startup schema initialization must add the current columns and migrate that credential before reading rows.

**Why:** `CREATE TABLE IF NOT EXISTS` does not upgrade an existing table, so deployments can fail before the API begins serving requests.

**How to apply:** Make social schema changes additive and idempotent in the API startup migration; preserve legacy credentials rather than replacing the table.