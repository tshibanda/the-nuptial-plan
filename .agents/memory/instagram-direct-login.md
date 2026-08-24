---
name: Instagram direct login
description: Keep the Instagram OAuth integration independent from Facebook Page access.
---

Instagram uses Instagram Login with its own client credentials, token exchange, token refresh, account lookup, and Graph host. Never make the Instagram connection conditional on a Facebook account or Page.

**Why:** Wedding planners may connect an Instagram professional or creator account without a Facebook presence; the former Facebook Login flow rejected those valid accounts.

**How to apply:** Keep Facebook OAuth and `graph.facebook.com` logic isolated to Facebook. Keep Instagram OAuth, refresh, profile, and metrics calls on the Instagram-specific endpoints and credentials. Instagram's official API supports professional and creator accounts; it cannot provide API access to standard personal accounts.