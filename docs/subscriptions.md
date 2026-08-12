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

RevenueCat is attached to the environment and the Expo client uses its current
offering. Configure the products above in RevenueCat, then connect:

1. App Store app `com.thenuptialplan.mobile`, products
   `tnp_premium_monthly` and `tnp_premium_annual`.
2. Google Play app `com.thenuptialplan.mobile`, base plans `monthly` and
   `annual`.
3. Entitlement `premium`, attached to both products.
4. A current offering containing the monthly and annual packages.
5. A one-month introductory free trial in App Store Connect and Google Play
   Billing. Store consoles are the source of truth for the trial metadata.

Set the public RevenueCat keys emitted by the RevenueCat setup script as
`EXPO_PUBLIC_REVENUECAT_IOS_API_KEY`,
`EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY`, and
`EXPO_PUBLIC_REVENUECAT_TEST_API_KEY`.