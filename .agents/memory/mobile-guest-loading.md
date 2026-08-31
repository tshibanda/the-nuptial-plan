---
name: Mobile guest loading
description: Performance rule for loading the Invités screen efficiently on mobile.
---

The mobile Invités screen must derive the RSVP totals from the already-loaded guest list, rather than requesting the guest statistics endpoint alongside the list.

**Why:** Both endpoints read the same records. The duplicate request adds network and database work during the first iOS render without adding information unavailable from the list.

**How to apply:** Keep the guest list cached with a finite stale time, calculate total/confirmed/pending/declined locally, avoid fetching it before Premium access is known, and invalidate the guest-list cache after guest mutations.