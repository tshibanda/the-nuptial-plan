import {
  attachProductsToPackage,
  getProductsFromPackage,
  listApps,
  listOfferings,
  listPackages,
  listProducts,
  listProjects,
} from "@replit/revenuecat-sdk";
import { getUncachableRevenueCatClient } from "./revenueCatClient";

async function main() {
  const client = await getUncachableRevenueCatClient();
  const projects = await listProjects({ client, query: { limit: 20 } });
  const project = projects.data?.items?.find((item) => item.name === "The Nuptial Plan");
  if (!project) throw new Error("RevenueCat project not found.");

  const apps = await listApps({ client, path: { project_id: project.id }, query: { limit: 20 } });
  const playStoreApp = apps.data?.items?.find((app) => app.type === "play_store");
  if (!playStoreApp) throw new Error("RevenueCat Play Store app not found.");

  const products = await listProducts({ client, path: { project_id: project.id }, query: { limit: 100 } });
  const playProducts = new Map(
    (products.data?.items ?? [])
      .filter((product) => product.app_id === playStoreApp.id)
      .map((product) => [product.store_identifier.split(":")[0], product]),
  );

  const offerings = await listOfferings({ client, path: { project_id: project.id }, query: { limit: 20 } });
  const offering = offerings.data?.items?.find((item) => item.lookup_key === "default");
  if (!offering) throw new Error("RevenueCat default offering not found.");

  const packages = await listPackages({
    client,
    path: { project_id: project.id, offering_id: offering.id },
    query: { limit: 20 },
  });

  for (const pkg of packages.data?.items ?? []) {
    const plan = pkg.lookup_key === "$rc_annual" ? "annual" : "monthly";
    const playProduct = playProducts.get(`tnp_premium_${plan}`);
    if (!playProduct) throw new Error(`Play Store ${plan} product not found.`);

    const attached = await getProductsFromPackage({
      client,
      path: { project_id: project.id, package_id: pkg.id },
    });
    const alreadyAttached = attached.data?.items?.some(
      (item) => (item.product?.id ?? item.product_id) === playProduct.id,
    );
    if (alreadyAttached) {
      console.log(`Play Store ${plan} product already attached.`);
      continue;
    }

    const result = await attachProductsToPackage({
      client,
      path: { project_id: project.id, package_id: pkg.id },
      body: { products: [{ product_id: playProduct.id, eligibility_criteria: "all" }] },
    });
    if (result.error) {
      throw new Error(`Failed to attach Play Store ${plan} product: ${JSON.stringify(result.error)}`);
    }
    console.log(`Attached Play Store ${plan} product.`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});