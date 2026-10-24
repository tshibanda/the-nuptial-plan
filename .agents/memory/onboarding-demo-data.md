---
name: Signup demo wedding
description: Owner privacy and idempotency rules for first-signup sample wedding data.
---

Create sample wedding data only through an authenticated server-side flow, scoped to the Clerk owner. Signup surfaces must share the same idempotent seed endpoint. Persist a private Clerk metadata marker so retries do not duplicate data and an intentionally deleted sample is not recreated later.

**Why:** Email and social signup take different client paths, and the web and mobile apps have separate signup UIs. Duplicating seed logic risks inconsistent data or cross-account exposure; blindly seeding on every login can undo a planner’s deletion.

**How to apply:** Route each new-account completion flow through the shared API, pass the selected French/English language, and never create planner records directly in a client. Test retries and concurrent requests against the same owner.
