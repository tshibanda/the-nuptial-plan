/**
 * Seeds RevenueCat with The Nuptial Plan's subscription products, entitlement,
 * offering, and packages. Idempotent — safe to re-run.
 *
 * Run with: pnpm --filter @workspace/scripts run seed:revenuecat
 */

import { getUncachableRevenueCatClient } from "./revenueCatClient";
import {
  listProjects,
  createProject,
  listApps,
  createApp,
  listAppPublicApiKeys,
  listProducts,
  createProduct,
  listEntitlements,
  createEntitlement,
  attachProductsToEntitlement,
  listOfferings,
  createOffering,
  updateOffering,
  listPackages,
  createPackages,
  getProductsFromPackage,
  attachProductsToPackage,
  type App,
  type Duration,
  type Product,
  type Project,
  type Entitlement,
  type Offering,
  type Package,
  type CreateProductData,
} from "@replit/revenuecat-sdk";

// ── Project / app metadata ────────────────────────────────────────────────────
const PROJECT_NAME = "The Nuptial Plan";
const APP_STORE_APP_NAME = "The Nuptial Plan iOS";
const APP_STORE_BUNDLE_ID = "app.thenuptialplan.com";
const PLAY_STORE_APP_NAME = "The Nuptial Plan Android";
const PLAY_STORE_PACKAGE_NAME = "app.thenuptialplan.com";

// ── Entitlement ───────────────────────────────────────────────────────────────
const ENTITLEMENT_IDENTIFIER = "TNP Premium";
const ENTITLEMENT_DISPLAY_NAME = "TNP Premium";

// ── Offering ──────────────────────────────────────────────────────────────────
const OFFERING_IDENTIFIER = "default";
const OFFERING_DISPLAY_NAME = "Default Offering";

// ── Products & packages ───────────────────────────────────────────────────────
const PRODUCTS = [
  {
    // iOS / Test Store identifier
    storeIdentifier: "monthly",
    appStoreIdentifier: "app.thenuptialplan.com.monthly",
    // Android base-plan format: {subscriptionId}:{basePlanId}
    playStoreIdentifier: "tnp_premium_monthly:monthly",
    displayName: "Premium Monthly",
    userFacingTitle: "Premium Monthly",
    duration: "ONE_MONTH" as Duration,
    packageIdentifier: "$rc_monthly",
    packageDisplayName: "Monthly Subscription",
    prices: [
      { amount_micros: 14_990_000, currency: "EUR" }, // €14.99
      { amount_micros: 14_990_000, currency: "USD" }, // $14.99
    ],
  },
  {
    storeIdentifier: "yearly",
    appStoreIdentifier: "app.thenuptialplan.com.yearly",
    playStoreIdentifier: "tnp_premium_annual:annual",
    displayName: "Premium Annual",
    userFacingTitle: "Premium Annual",
    duration: "ONE_YEAR" as Duration,
    packageIdentifier: "$rc_annual",
    packageDisplayName: "Annual Subscription",
    prices: [
      { amount_micros: 99_990_000, currency: "EUR" }, // €99.99
      { amount_micros: 99_990_000, currency: "USD" }, // $99.99
    ],
  },
] as const;

type TestStorePricesResponse = {
  object: string;
  prices: { amount_micros: number; currency: string }[];
};

// ── Helpers ───────────────────────────────────────────────────────────────────
async function ensureProduct(
  client: Awaited<ReturnType<typeof getUncachableRevenueCatClient>>,
  projectId: string,
  existingProducts: Product[],
  targetApp: App,
  label: string,
  storeIdentifier: string,
  isTestStore: boolean,
  testStoreMeta?: { duration: Duration; title: string },
): Promise<Product> {
  const existing = existingProducts.find(
    (p) => p.store_identifier === storeIdentifier && p.app_id === targetApp.id,
  );
  if (existing) {
    console.log(`  ${label} product already exists: ${existing.id}`);
    return existing;
  }

  const body: CreateProductData["body"] = {
    store_identifier: storeIdentifier,
    app_id: targetApp.id,
    type: "subscription",
    display_name: label,
  };

  if (isTestStore && testStoreMeta) {
    body.subscription = { duration: testStoreMeta.duration };
    body.title = testStoreMeta.title;
  }

  const { data, error } = await createProduct({
    client,
    path: { project_id: projectId },
    body,
  });
  if (error) throw new Error(`Failed to create ${label} product: ${JSON.stringify(error)}`);
  console.log(`  Created ${label} product: ${data.id}`);
  return data;
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function seed() {
  const client = await getUncachableRevenueCatClient();

  // ── 1. Project ──────────────────────────────────────────────────────────────
  console.log("\n[1/6] Project");
  const { data: projects, error: listProjectsError } = await listProjects({
    client,
    query: { limit: 20 },
  });
  if (listProjectsError) throw new Error("Failed to list projects");

  let project: Project;
  const existingProject = projects.items?.find((p) => p.name === PROJECT_NAME);
  if (existingProject) {
    console.log(`  Project already exists: ${existingProject.id}`);
    project = existingProject;
  } else {
    const { data, error } = await createProject({ client, body: { name: PROJECT_NAME } });
    if (error) throw new Error("Failed to create project");
    console.log(`  Created project: ${data.id}`);
    project = data;
  }

  // ── 2. Apps ─────────────────────────────────────────────────────────────────
  console.log("\n[2/6] Apps");
  const { data: apps, error: listAppsError } = await listApps({
    client,
    path: { project_id: project.id },
    query: { limit: 20 },
  });
  if (listAppsError || !apps?.items?.length) throw new Error("Failed to list apps");

  const testStoreApp = apps.items.find((a) => a.type === "test_store");
  if (!testStoreApp) throw new Error("No test store app found in project");
  console.log(`  Test Store app: ${testStoreApp.id}`);

  let appStoreApp: App = apps.items.find((a) => a.type === "app_store")!;
  if (!appStoreApp) {
    const { data, error } = await createApp({
      client,
      path: { project_id: project.id },
      body: { name: APP_STORE_APP_NAME, type: "app_store", app_store: { bundle_id: APP_STORE_BUNDLE_ID } },
    });
    if (error) throw new Error(`Failed to create App Store app: ${JSON.stringify(error)}`);
    appStoreApp = data;
    console.log(`  Created App Store app: ${appStoreApp.id}`);
  } else {
    console.log(`  App Store app: ${appStoreApp.id}`);
  }

  let playStoreApp: App = apps.items.find((a) => a.type === "play_store")!;
  if (!playStoreApp) {
    const { data, error } = await createApp({
      client,
      path: { project_id: project.id },
      body: { name: PLAY_STORE_APP_NAME, type: "play_store", play_store: { package_name: PLAY_STORE_PACKAGE_NAME } },
    });
    if (error) throw new Error(`Failed to create Play Store app: ${JSON.stringify(error)}`);
    playStoreApp = data;
    console.log(`  Created Play Store app: ${playStoreApp.id}`);
  } else {
    console.log(`  Play Store app: ${playStoreApp.id}`);
  }

  // ── 3. Products ─────────────────────────────────────────────────────────────
  console.log("\n[3/6] Products");
  const { data: existingProductsData, error: listProductsError } = await listProducts({
    client,
    path: { project_id: project.id },
    query: { limit: 100 },
  });
  if (listProductsError) throw new Error("Failed to list products");
  const existingProducts: Product[] = existingProductsData.items ?? [];

  const allProductIds: string[] = [];

  for (const prod of PRODUCTS) {
    console.log(`\n  -- ${prod.displayName} --`);

    const testProduct = await ensureProduct(
      client, project.id, existingProducts, testStoreApp,
      `Test Store / ${prod.displayName}`, prod.storeIdentifier, true,
      { duration: prod.duration, title: prod.userFacingTitle },
    );

    // Add test store prices (idempotent — ignore "already exists")
    const { error: priceError } = await client.post<TestStorePricesResponse>({
      url: "/projects/{project_id}/products/{product_id}/test_store_prices",
      path: { project_id: project.id, product_id: testProduct.id },
      body: { prices: prod.prices },
    });
    if (priceError) {
      if (
        priceError &&
        typeof priceError === "object" &&
        "type" in priceError &&
        priceError["type"] === "resource_already_exists"
      ) {
        console.log("  Test store prices already set");
      } else {
        throw new Error(`Failed to set test store prices: ${JSON.stringify(priceError)}`);
      }
    } else {
      console.log("  Added test store prices");
    }

    const appStoreProduct = await ensureProduct(
      client, project.id, existingProducts, appStoreApp,
      `App Store / ${prod.displayName}`, prod.appStoreIdentifier, false,
    );

    const playStoreProduct = await ensureProduct(
      client, project.id, existingProducts, playStoreApp,
      `Play Store / ${prod.displayName}`, prod.playStoreIdentifier, false,
    );

    allProductIds.push(testProduct.id, appStoreProduct.id, playStoreProduct.id);
  }

  // ── 4. Entitlement ──────────────────────────────────────────────────────────
  console.log("\n[4/6] Entitlement");
  const { data: entitlementsData, error: listEntitlementsError } = await listEntitlements({
    client,
    path: { project_id: project.id },
    query: { limit: 20 },
  });
  if (listEntitlementsError) throw new Error("Failed to list entitlements");

  let entitlement: Entitlement;
  const existingEntitlement = entitlementsData.items?.find(
    (e) => e.lookup_key === ENTITLEMENT_IDENTIFIER,
  );
  if (existingEntitlement) {
    console.log(`  Entitlement already exists: ${existingEntitlement.id}`);
    entitlement = existingEntitlement;
  } else {
    const { data, error } = await createEntitlement({
      client,
      path: { project_id: project.id },
      body: { lookup_key: ENTITLEMENT_IDENTIFIER, display_name: ENTITLEMENT_DISPLAY_NAME },
    });
    if (error) throw new Error(`Failed to create entitlement: ${JSON.stringify(error)}`);
    console.log(`  Created entitlement: ${data.id}`);
    entitlement = data;
  }

  const { error: attachEntError } = await attachProductsToEntitlement({
    client,
    path: { project_id: project.id, entitlement_id: entitlement.id },
    body: { product_ids: allProductIds },
  });
  if (attachEntError) {
    if ((attachEntError as any).type === "unprocessable_entity_error") {
      console.log("  Products already attached to entitlement");
    } else {
      throw new Error(`Failed to attach products to entitlement: ${JSON.stringify(attachEntError)}`);
    }
  } else {
    console.log("  Attached all products to entitlement");
  }

  // ── 5. Offering ─────────────────────────────────────────────────────────────
  console.log("\n[5/6] Offering");
  const { data: offeringsData, error: listOfferingsError } = await listOfferings({
    client,
    path: { project_id: project.id },
    query: { limit: 20 },
  });
  if (listOfferingsError) throw new Error("Failed to list offerings");

  let offering: Offering;
  const existingOffering = offeringsData.items?.find((o) => o.lookup_key === OFFERING_IDENTIFIER);
  if (existingOffering) {
    console.log(`  Offering already exists: ${existingOffering.id}`);
    offering = existingOffering;
  } else {
    const { data, error } = await createOffering({
      client,
      path: { project_id: project.id },
      body: { lookup_key: OFFERING_IDENTIFIER, display_name: OFFERING_DISPLAY_NAME },
    });
    if (error) throw new Error(`Failed to create offering: ${JSON.stringify(error)}`);
    console.log(`  Created offering: ${data.id}`);
    offering = data;
  }

  if (!offering.is_current) {
    const { error } = await updateOffering({
      client,
      path: { project_id: project.id, offering_id: offering.id },
      body: { is_current: true },
    });
    if (error) throw new Error("Failed to set offering as current");
    console.log("  Set offering as current");
  } else {
    console.log("  Offering is already current");
  }

  // ── 6. Packages ─────────────────────────────────────────────────────────────
  console.log("\n[6/6] Packages");
  const { data: existingPackagesData, error: listPackagesError } = await listPackages({
    client,
    path: { project_id: project.id, offering_id: offering.id },
    query: { limit: 20 },
  });
  if (listPackagesError) throw new Error("Failed to list packages");
  const existingPackages: Package[] = existingPackagesData.items ?? [];

  for (let i = 0; i < PRODUCTS.length; i++) {
    const prod = PRODUCTS[i];
    console.log(`\n  -- ${prod.packageDisplayName} --`);

    let pkg: Package;
    const existingPkg = existingPackages.find((p) => p.lookup_key === prod.packageIdentifier);
    if (existingPkg) {
      console.log(`  Package already exists: ${existingPkg.id}`);
      pkg = existingPkg;
    } else {
      const { data, error } = await createPackages({
        client,
        path: { project_id: project.id, offering_id: offering.id },
        body: { lookup_key: prod.packageIdentifier, display_name: prod.packageDisplayName },
      });
      if (error) throw new Error(`Failed to create package: ${JSON.stringify(error)}`);
      console.log(`  Created package: ${data.id}`);
      pkg = data;
    }

    // Get the three product IDs for this offering slot
    // Offset by i*3 because allProductIds = [test0, appStore0, play0, test1, appStore1, play1]
    const testId = allProductIds[i * 3];
    const appStoreId = allProductIds[i * 3 + 1];
    const playStoreId = allProductIds[i * 3 + 2];

    const { data: attachedProducts, error: attachedProductsError } = await getProductsFromPackage({
      client,
      path: { project_id: project.id, package_id: pkg.id },
    });
    if (attachedProductsError) {
      throw new Error(`Failed to inspect products attached to package: ${JSON.stringify(attachedProductsError)}`);
    }
    const attachedProductIds = new Set(
      (attachedProducts?.items ?? []).map((item) => item.product?.id ?? item.product_id),
    );

    for (const productId of [testId, appStoreId, playStoreId]) {
      if (attachedProductIds.has(productId)) continue;
      const { error: attachProductError } = await attachProductsToPackage({
        client,
        path: { project_id: project.id, package_id: pkg.id },
        body: { products: [{ product_id: productId, eligibility_criteria: "all" }] },
      });
      if (attachProductError) {
        throw new Error(`Failed to attach product ${productId} to package: ${JSON.stringify(attachProductError)}`);
      }
    }
    console.log("  Package products are configured");
  }

  // ── Public API keys ─────────────────────────────────────────────────────────
  console.log("\n== Public API Keys ==");
  const fetchKeys = async (app: App, label: string) => {
    const { data, error } = await listAppPublicApiKeys({
      client,
      path: { project_id: project.id, app_id: app.id },
    });
    if (error) throw new Error(`Failed to list public API keys for ${label}`);
    return data?.items?.map((k) => k.key) ?? [];
  };

  const testKeys = await fetchKeys(testStoreApp, "Test Store");
  const iosKeys = await fetchKeys(appStoreApp, "App Store");
  const androidKeys = await fetchKeys(playStoreApp, "Play Store");

  console.log("\n==========================================");
  console.log("RevenueCat seed complete!");
  console.log("==========================================");
  console.log("Project ID:         ", project.id);
  console.log("Test Store App ID:  ", testStoreApp.id);
  console.log("App Store App ID:   ", appStoreApp.id);
  console.log("Play Store App ID:  ", playStoreApp.id);
  console.log("Entitlement:        ", ENTITLEMENT_IDENTIFIER);
  console.log("\nSet these environment variables:");
  console.log(`REVENUECAT_PROJECT_ID=${project.id}`);
  console.log(`REVENUECAT_TEST_STORE_APP_ID=${testStoreApp.id}`);
  console.log(`REVENUECAT_APPLE_APP_STORE_APP_ID=${appStoreApp.id}`);
  console.log(`REVENUECAT_GOOGLE_PLAY_STORE_APP_ID=${playStoreApp.id}`);
  console.log(`EXPO_PUBLIC_REVENUECAT_TEST_API_KEY=${testKeys[0] ?? "N/A"}`);
  console.log(`EXPO_PUBLIC_REVENUECAT_IOS_API_KEY=${iosKeys[0] ?? "N/A"}`);
  console.log(`EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY=${androidKeys[0] ?? "N/A"}`);
  console.log("==========================================\n");
}

seed().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
