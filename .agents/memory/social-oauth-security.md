---
name: Social OAuth security
description: Cross-client OAuth constraints and credential-handling policy for planner social accounts.
---

# Social OAuth security

OAuth callbacks originate outside the authenticated app session. Identify the planner exclusively through a short-lived, HMAC-signed state value; use a web route for web sessions and the registered app deep link for mobile sessions.

**Why:** Browser cookies do not transfer from an Expo app into a provider authorization flow, and an unsigned callback parameter could connect a provider account to the wrong planner.

**How to apply:** Keep all provider tokens server-only and encrypted at rest. When introducing or changing the credential table, ensure production startup can safely create/upgrade the table before any social route is served; do not depend on a developer-only schema push.