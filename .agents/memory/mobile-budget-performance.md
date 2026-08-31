---
name: Mobile budget loading
description: Performance rule for loading the Budget screen with persisted wedding selection.
---

The mobile Budget screen should use the wedding ID restored from local storage immediately, while the wedding list loads. The budget query must be disabled when no real ID exists and must never fall back to a network request for wedding ID 0.

**Why:** Waiting for the weddings list created a sequential request on iOS and the old numeric fallback enabled an unnecessary `/weddings/0/budget-summary` request, making the tab visibly slower.

**How to apply:** Keep the persisted selected ID as the first query input; use the generated query options with `enabled: false` until an actual ID is available, use a safe numeric fallback only for component prop typing, and cache the summary for the same tab session.