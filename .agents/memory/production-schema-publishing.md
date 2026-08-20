---
name: Production schema publishing
description: Keep database schema changes out of API startup so production readiness is not blocked.
---

Database schema changes, including the social accounts table, must be declared in the Drizzle schema and applied by Replit's publish-time production schema diff. Do not add `CREATE TABLE`, `ALTER TABLE`, or data-migration DDL to API startup.

**Why:** A blocking social-schema migration prevented the API from opening its configured port during an Autoscale deployment, causing the health check and deployment promotion to time out.

**How to apply:** When adding or changing persistent tables, update the schema source of truth, rebuild shared database declarations for local verification, and let the Publish UI apply the production diff. Keep startup work non-schema-related and fast enough for the health check.