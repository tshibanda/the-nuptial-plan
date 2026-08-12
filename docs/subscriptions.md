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

- `EXPO_PUBLIC_REVENUECAT_TEST_API_KEY` — `test_AnBknYBMGcfFlcpnPuJAFTUjBHn`
- `EXPO_PUBLIC_REVENUECAT_IOS_API_KEY` — `appl_DPvDqlxFvylugSdVsmAptlFgdlb`
- `EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY` — `goog_mBYVQFlcUPYhkPokBpdaRfQDSBV`
- `REVENUECAT_PROJECT_ID` — `proj7339034d`
- `REVENUECAT_TEST_STORE_APP_ID` — `app67e3ee8663`
- `REVENUECAT_APPLE_APP_STORE_APP_ID` — `appd42beb7cdc`
- `REVENUECAT_GOOGLE_PLAY_STORE_APP_ID` — `app7ba77d54ef`

### Production store setup (manual — done once per store)

These steps must be completed in the real store consoles before submitting to
the App Store or Google Play. The test store already works without them.

---

#### App Store Connect

> URL: https://appstoreconnect.apple.com

1. **Create an App Record** (if it doesn't exist yet):
   - My Apps → **+** → New App
   - Platform: iOS, Bundle ID: `com.thenuptialplan.mobile`
   - Name: **The Nuptial Plan**, Primary language: French

2. **Create the Monthly subscription**:
   - App record → Monetisation → In-App Purchases → **+**
   - Type: **Auto-Renewable Subscription**
   - Reference name: `Premium Monthly`
   - Product ID: `tnp_premium_monthly`
   - Create a **Subscription Group** named `Premium` (first time only)
   - Set price: **€14.99 / month** (tier 14 in EUR)
   - Localisation (FR): Name = `Premium Mensuel`, Description = `Accès complet à The Nuptial Plan`
   - Add introductory offer:
     - Type: **Free Trial**, Duration: **1 month**, Eligibility: All users

3. **Create the Annual subscription**:
   - Same Subscription Group `Premium` → **+**
   - Reference name: `Premium Annual`
   - Product ID: `tnp_premium_annual`
   - Set price: **€99.99 / year** (tier 67 in EUR)
   - Localisation (FR): Name = `Premium Annuel`, Description = `Accès complet à The Nuptial Plan — économisez 44%`
   - Add introductory offer:
     - Type: **Free Trial**, Duration: **1 month**, Eligibility: All users

4. **Submit products for review**:
   - Both products need a screenshot (use Simulator, 6.5" display)
   - Review notes: "Subscription unlocks all planning features — guests, budget, vendors, seating."

5. **Sync with RevenueCat** (after products are approved):
   - In the Replit Publishing pane → RevenueCat section → **Sync products to App Store Connect**
   - This links RevenueCat's App Store app (`appd42beb7cdc`) to Apple's IAP system

6. **Enroll in Small Business Program** (optional — reduces commission 30% → 15%):
   - https://developer.apple.com/app-store/small-business-program/enroll/

---

#### Google Play Console

> URL: https://play.google.com/console

**Part A — Enable the Google Play Android Developer API**

This step links a Google Cloud project to your Play Console account so that
RevenueCat's server can verify purchases server-side. Without it RevenueCat
cannot validate Android receipts even if store credentials are correct.

1. Go to **Google Play Console** → (account level, not app level) →
   **Setup** → **API access**
2. Click **Link to an existing Google Cloud project** (or create a new one).
   Choose the project you will use for the service account (e.g. `the-nuptial-plan`).
3. Click **Learn how to create a service account** → this opens Google Cloud Console.
   In Cloud Console:
   - Navigate to **APIs & Services** → **Enabled APIs & Services**
   - Click **+ Enable APIs and Services**, search for
     **Google Play Android Developer API**, and enable it.
4. Back in Cloud Console, go to **IAM & Admin** → **Service Accounts** →
   **Create service account**:
   - Name: `revenuecat-server`
   - Role: **Service Account User** (project level — grants token creation)
   - Click **Done**
5. Open the new service account → **Keys** tab → **Add key** → **Create new key**
   → **JSON** → **Create**. Save the downloaded `.json` file securely.

**Part B — Grant Play Console permissions to the service account**

1. In **Google Play Console** → **Setup** → **API access**, find the service
   account you just created and click **Grant access**.
2. App permissions (choose your app): enable:
   - **View app information and download bulk reports (read-only)**
   - **View financial data, orders, and cancellation survey responses**
   - **Manage orders and subscriptions**
3. Click **Apply** and then **Invite user**.

**Part C — Create the subscription products**

1. App record → **Monetise** → **Products** → **Subscriptions** → **Create subscription**

2. **Monthly subscription**:
   - Product ID: `tnp_premium_monthly`
   - Name: `Premium Mensuel`
   - Add base plan:
     - Base plan ID: `monthly`
     - Billing period: **Monthly**
     - Price: **€14.99**
   - Add offer to the base plan:
     - Offer type: **Free trial**, Duration: **1 month**
     - Eligibility: New subscribers
   - Click **Activate**

3. **Annual subscription**:
   - Product ID: `tnp_premium_annual`
   - Name: `Premium Annuel`
   - Add base plan:
     - Base plan ID: `annual`
     - Billing period: **Yearly**
     - Price: **€99.99**
   - Add offer to the base plan:
     - Offer type: **Free trial**, Duration: **1 month**
     - Eligibility: New subscribers
   - Click **Activate**

**Part D — Upload service account JSON to RevenueCat**

1. RevenueCat dashboard → Project `proj7339034d` → Apps →
   **The Nuptial Plan Android** (`app7ba77d54ef`)
2. App Settings → Google Play → **Upload service account JSON**
3. Upload the `.json` file from Part A step 5.
4. RevenueCat will confirm the connection by showing the package name
   `com.thenuptialplan.mobile`.

---

### Building the app for store testing

The project uses [EAS Build](https://docs.expo.dev/build/introduction/).
`eas.json` is at `artifacts/mobile/eas.json` and defines three profiles:

| Profile       | Purpose                                          | Distribution |
| ------------- | ------------------------------------------------ | ------------ |
| `development` | Dev client (Expo Go replacement), direct install | Internal     |
| `preview`     | TestFlight / Play internal testing               | Store        |
| `production`  | App Store / Google Play public release           | Store        |

Both `preview` and `production` use `distribution: "store"`, which produces:
- **iOS** — a signed `.ipa` store archive (uploadable to TestFlight)
- **Android** — a signed `.aab` bundle (uploadable to Play Console)

Before filling in the `submit.production` block in `eas.json`, you need:
- `ascAppId` — App Store Connect → My Apps → App Information → Apple ID
- `appleTeamId` — developer.apple.com → Membership → Team ID

Install the EAS CLI once:
```
npm install -g eas-cli
eas login   # sign in with your Expo account
```

Configure the project (one-time, links to your EAS account):
```
cd artifacts/mobile
eas build:configure
```

### TestFlight sandbox test (iOS — after App Store products are approved)

1. Build a store-distribution archive:
   ```
   cd artifacts/mobile
   eas build --platform ios --profile preview
   ```
   EAS produces a signed `.ipa` store archive and prints a download link.

2. Submit the archive to TestFlight:
   - Fill in `ascAppId` and `appleTeamId` in `eas.json` → `submit.production.ios`, then:
     ```
     eas submit --platform ios --profile production --latest
     ```
   - Or manually download the `.ipa` from the EAS dashboard and upload it in
     App Store Connect → TestFlight → **+** (upload binary button).

3. Add yourself as an internal tester in App Store Connect → TestFlight.
4. On a physical iOS device, install the TestFlight build.
5. In device Settings → App Store, sign in with a **Sandbox tester account**
   (App Store Connect → Users & Access → Sandbox → Testers → **+**).
6. Open the app → Paramètres → Abonnement → tap a package.
7. Complete the sandbox purchase (no real charge).
8. Verify: `subscription.isActive === true` appears in the UI (active badge /
   "Votre abonnement est actif" copy).

### Internal test track sandbox test (Android — after Play subscriptions are activated)

1. Build a store-distribution bundle:
   ```
   cd artifacts/mobile
   eas build --platform android --profile preview
   ```
   EAS produces a signed `.aab` bundle.

2. Upload the `.aab` to Google Play:
   - Download the `.aab` from the EAS dashboard.
   - Google Play Console → App → **Internal testing** → **Create new release** →
     upload the `.aab` → Review release → **Roll out**.
   - Or use `eas submit` with the service account key configured in
     `eas.json` → `submit.production.android.serviceAccountKeyPath`.

3. Add yourself as an internal tester and install via the opt-in link.
4. Open the app → Paramètres → Abonnement → tap a package.
5. Complete the test purchase (uses your real Google account; not charged in
   the internal test track).
6. Verify: `subscription.isActive === true` in the app.

### Sandbox purchase & restore (test store — no native build needed)

The test store is active in Expo Go and does not require a native build.
RevenueCat automatically enters Preview API Mode in development, replacing
native purchase calls with JavaScript mocks. A sandbox purchase flow can be
verified end-to-end in the app's Paramètres → Abonnement section.

To verify restore: purchase a package, sign out, sign back in, and tap
"Restaurer mes achats" — the entitlement should reactivate.
