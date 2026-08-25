---
name: Account deletion and store billing
description: How account erasure relates to web and native subscription cancellation.
---

Server-managed Stripe subscriptions may be cancelled as part of account deletion before application data and the Clerk user are erased.

Apple App Store and Google Play subscriptions cannot be cancelled directly by the application server. The account-deletion experience must clearly direct the user to the relevant store subscription management flow before they erase their account.

**Why:** Store subscriptions are controlled by the customer’s store account; deleting app data or a RevenueCat customer does not reliably cancel the external renewal.

**How to apply:** Keep the native deletion warning and management guidance in place. Do not claim that native billing has been cancelled unless the store confirms it.