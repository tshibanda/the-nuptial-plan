---
name: The Nuptial Plan
description: Premium French wedding planner web app — architecture decisions, known quirks, and conventions.
---

# The Nuptial Plan — Architecture & Conventions

## Visual identity
- Fonts: Cormorant Garamond (serif) + DM Sans (sans-serif), loaded via Google Fonts in `src/index.css`
- Colors: navy #263b48, ivory #f5f1eb, gold #c8aa70 / #ab8b52, used as raw hex in Tailwind classes
- All monetary values stored in cents (pence); displayed as £X XXX format

## Active wedding context
- `lib/wedding-context.tsx` holds `activeWeddingId` in React state
- `AppShell` auto-selects `weddings[0].id` via `useEffect` (NOT inline during render — that caused a React warning)
- All page hooks receive `weddingId` from `useActiveWedding()`

## OpenAPI / codegen quirk
- Zod v3 has no `zod.int()` — OpenAPI `integer` fields must be `number` type in the spec or codegen fails with TS2339
- The sed fix: `sed -i 's/type: integer/type: number/g'` AND `sed -i 's/type: \["integer", "null"\]/type: ["number", "null"]/g'`

## Express mergeParams typing
- Child routers use `mergeParams: true` but TypeScript doesn't know about the parent `:weddingId` param
- Fix: extract with `const p = (req: { params: Record<string, string> }, key: string) => Number(req.params[key])`

## French strings in JSX
- Single-quoted JSX strings break if they contain French apostrophes (e.g. `'Modifier l'invité'`)
- **Why:** Babel parser sees the apostrophe as a string delimiter
- **Fix:** Use double-quotes for any French string containing an apostrophe: `"Modifier l'invité"`

## DB schema
- All tables live in `lib/db/src/schema/` — one file per entity
- After adding schema files, run `pnpm run typecheck:libs` to regenerate declarations before checking api-server typecheck
- Push: `pnpm --filter @workspace/db run push`
