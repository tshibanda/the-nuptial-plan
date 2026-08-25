---
name: Product localization
description: Language selection and automatic French/English fallback rules for both Nuptial Plan clients.
---

# Product localization

The app supports French and English. A planner’s manual language choice is persisted locally on each client and always overrides automatic detection. Without a saved preference, use French when the device/browser language is French or its locale identifies a francophone region; otherwise use English.

**Why:** This provides a usable default for French-speaking planners while respecting an explicit selection, including on shared or travelling devices.

**How to apply:** Any new user-facing UI, legal copy, alert, notification, PDF label, date, number, currency, or status presentation must use the active locale. Never translate stored planner data such as names, notes, venues, messages, or post content.