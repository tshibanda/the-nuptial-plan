---
name: English demo ownership
description: Ensures the English demonstration dataset survives Clerk development-user recreation.
---

# English demo ownership

The English demo dataset must be attached to the verified Clerk account that signs in with the designated demo email, rather than relying on a fixed Clerk user ID.

**Why:** Clerk development and production have separate user stores, and development users may be recreated. A fixed owner ID leaves otherwise valid demo records orphaned and invisible to the intended planner.

**How to apply:** Preserve the email-gated, idempotent ownership handoff. Only transfer the legacy demo dataset when the destination account has no weddings, and keep all ownership-scoped companion records aligned with the transferred wedding collection.