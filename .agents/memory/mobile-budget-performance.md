---
name: Mobile budget loading
description: Performance rule for loading the Budget screen with persisted wedding selection.
---

The mobile Budget screen should use the wedding ID restored from local storage immediately, while the wedding list loads. The budget query must be disabled when no real ID exists and must never fall back to a network request for wedding ID 0. After the dashboard’s first interactions, warm the shared React Query caches for remote-data tabs (Budget, Premium guests/payments/contracts/address book/documents) using the same keys and stale times as their screens.

**Why:** Waiting for the weddings list created a sequential request on iOS and the old numeric fallback enabled an unnecessary `/weddings/0/budget-summary` request, making the tab visibly slower. Several other data tabs also made their first request only when opened; a direct uncached fetch in Documents repeated on each visit.

**How to apply:** Keep the persisted selected ID as the first query input; use generated query options with `enabled: false` until an actual ID is available, use a safe numeric fallback only for component prop typing, and share exact query keys/stale times between idle prefetch and tab hooks. Gate Premium data prefetches by entitlement and use React Query for file/document lists instead of uncached mount effects.
