---
name: Nuptia data actions
description: Security boundary for AI-driven mutations in the wedding planner.
---

Nuptia must mutate data only through server-side tools. The server resolves the Clerk owner, verifies the wedding belongs to that owner, and scopes every child create/update/delete query by wedding ID; client-provided summaries are never authorization evidence.

**Why:** An AI assistant must not receive direct database access or rely on a browser-supplied wedding context, because either would allow accidental or cross-planner mutations.

**How to apply:** Add new Nuptia capabilities as validated tools with explicit action/entity arguments, owner-scoped queries, and a tool result that the model must use when reporting success or failure.