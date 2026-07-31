---
name: Drizzle numeric coercion
description: Drizzle numeric() columns return strings from Postgres; must coerce before Zod parsing.
---

Drizzle's `numeric(...)` column type maps to PostgreSQL NUMERIC, which pg returns as a **string**. When Zod schemas expect `number` (generated from OpenAPI `type: number`), `.parse()` will throw:

```
ZodError: Expected number, received string (path: budgetTotal)
```

**Why:** pg's node driver does not auto-cast NUMERIC to JS number to avoid precision loss. Drizzle does not override this.

**How to apply:** In every route that reads a numeric column and passes the row to Zod:
1. Create a `coerceNumeric(row, fields)` helper in `src/lib/coerce.ts`
2. Call it on each DB row before `.parse()`:
   ```ts
   res.json(ListWeddingsResponse.parse(rows.map(r => coerceNumeric(r, ["budgetTotal"]))));
   ```
Affected column types in this project: `budgetTotal`, `totalAmount`, `depositAmount`, `amount` (all `numeric()` columns).
