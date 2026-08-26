---
name: Mobile document list stability
description: Rules for keeping the Documents FlatList stationary while related data resolves.
---

Document sections must use stable entity-based keys, never their display titles. A document response from an older request must not update the active screen.

**Why:** Vendor and contract names arrive asynchronously. Using a title as a list key turns a label update into a remove-and-insert operation on iOS, which can shift the visible scroll position. Late responses from another wedding can also replace the current data.

**How to apply:** Group documents by entity type and ID; only derive the section label from the latest related data. Gate document responses with a monotonically increasing request generation whenever the selected wedding or request changes.