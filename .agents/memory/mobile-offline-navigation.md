---
name: Mobile offline navigation
description: Keep tab navigation usable across network loss and app suspension.
---

Do not present an automatic full-screen offline modal above the mobile navigator. Cached screens and the bottom menu must remain usable when connectivity drops. Use a non-blocking notice instead, and refresh NetInfo when the app becomes active again.

**Why:** A global modal tied directly to a disconnected NetInfo state intercepted every touch, including the tab bar. A stale network state after suspension could therefore appear to be a frozen bottom menu.

**How to apply:** Keep network status independent of navigation availability. Mount the full-menu modal only while explicitly open, release it before background suspension, and keep decorative tab-bar layers non-interactive.
