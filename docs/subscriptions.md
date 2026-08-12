# Abonnements The Nuptial Plan

## Offre commerciale

- Essai gratuit : 1 mois
- Mensuel : 14,99 € / mois
- Annuel : 99,99 € / an
- Entitlement commun : `premium`
- Identifiants Stripe :
  - `tnp_monthly_eur`
  - `tnp_annual_eur`
- Identifiants Store :
  - iOS : `tnp_premium_monthly`, `tnp_premium_annual`
  - Android : `tnp_premium_monthly:monthly`, `tnp_premium_annual:annual`

## Stripe website

Run `pnpm --filter @workspace/scripts run seed:subscriptions` once the Stripe
connection is attached. The script is idempotent and creates the product and
both recurring prices with lookup keys. Checkout always resolves prices from
Stripe; the website does not maintain a duplicate product catalog.

The API configures the managed webhook at `/api/stripe/webhook`, stores only the
latest planner access snapshot in `subscriptions`, and exposes:

- `GET /api/subscription/plans`
- `GET /api/subscription/status`
- `POST /api/subscription/checkout`
- `POST /api/subscription/portal`

## iOS and Android

RevenueCat is configured via the Replit RevenueCat connector. Run the seed
script (idempotent) to (re-)apply the product catalog:

```
pnpm --filter @workspace/scripts run seed:revenuecat
```

### RevenueCat project (configured)

| Resource           | ID / key                                |
| ------------------ | --------------------------------------- |
| Project            | `proj7339034d`                          |
| Test Store app     | `app67e3ee8663`                         |
| App Store app      | `appd42beb7cdc`                         |
| Play Store app     | `app7ba77d54ef`                         |
| Entitlement        | `premium`                               |
| Offering           | `default` (current)                     |
| Monthly package    | `$rc_monthly`                           |
| Annual package     | `$rc_annual`                            |

Environment variables set (see `artifacts/mobile/lib/subscription.tsx`):

- `EXPO_PUBLIC_REVENUECAT_TEST_API_KEY`
- `EXPO_PUBLIC_REVENUECAT_IOS_API_KEY`
- `EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY`
- `REVENUECAT_PROJECT_ID`
- `REVENUECAT_TEST_STORE_APP_ID`
- `REVENUECAT_APPLE_APP_STORE_APP_ID`
- `REVENUECAT_GOOGLE_PLAY_STORE_APP_ID`

### Production store setup (manual — done once per store)

These steps must be completed in the real store consoles before submitting to
the App Store or Google Play. The test store already works without them.

**App Store Connect**

1. App `com.thenuptialplan.mobile` — create two in-app purchases:
   - `tnp_premium_monthly` (Auto-Renewable Subscription, €14.99/month)
   - `tnp_premium_annual` (Auto-Renewable Subscription, €99.99/year)
2. On each product, add a one-month free introductory offer.
3. After publishing to TestFlight, use the Replit Publishing pane →
   "Sync products to App Store Connect" to link RevenueCat ↔ Apple.
4. Enroll in the [Apple Small Business Program](https://developer.apple.com/app-store/small-business-program/enroll/)
   to reduce commission from 30% to 15%.

**Google Play Console**

1. App `com.thenuptialplan.mobile` — create a subscription with:
   - Subscription ID `tnp_premium_monthly`, base plan `monthly` (€14.99/month)
   - Subscription ID `tnp_premium_annual`, base plan `annual` (€99.99/year)
2. On each base plan, add a one-month free trial.
3. Connect the Google Play app to RevenueCat in the RevenueCat dashboard
   (App Settings → Google Play → upload service account JSON).

### Sandbox purchase & restore (test store)

The test store is active in Expo Go and does not require a native build.
RevenueCat automatically enters Preview API Mode in development, replacing
native purchase calls with JavaScript mocks. A sandbox purchase flow can be
verified end-to-end in the app's Paramètres → Abonnement section.

To verify restore: purchase a package, sign out, sign back in, and tap
"Restaurer mes achats" — the entitlement should reactivate.
