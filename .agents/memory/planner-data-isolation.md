---
name: Planner data isolation
description: Ownership boundary for wedding planner data and legacy records
---

Every wedding is scoped to the authenticated Clerk user through `owner_id`. Child resources are protected by the wedding ownership middleware, and private conversations/files must also verify the same owner before read or mutation.

**Why:** Filtering only by `wedding_id` allowed an authenticated planner to access another planner's records by changing an ID in the request.

**How to apply:** New routes must resolve the Clerk user ID server-side and constrain every read, update, delete, aggregate, and private object lookup to that owner. Existing rows with no owner must remain inaccessible until explicitly assigned; never bulk-assign them arbitrarily. Production receives the schema through Publish.