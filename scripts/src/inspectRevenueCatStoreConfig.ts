import { getUncachableRevenueCatClient } from "./revenueCatClient";
import { listProjects, listApps, listAppPublicApiKeys, listOfferings, listPackages, getProductsFromPackage } from "@replit/revenuecat-sdk";

async function main() {
  const client = await getUncachableRevenueCatClient();
  const projects = await listProjects({ client, query: { limit: 20 } });
  const project = projects.data?.items?.find((item) => item.name === "The Nuptial Plan");
  if (!project) throw new Error("RevenueCat project not found.");

  const apps = await listApps({ client, path: { project_id: project.id }, query: { limit: 20 } });
  for (const app of apps.data?.items ?? []) {
    const keys = await listAppPublicApiKeys({
      client,
      path: { project_id: project.id, app_id: app.id },
    });
    console.log(JSON.stringify({
      appId: app.id,
      type: app.type,
      name: app.name,
      publicKeyAvailable: Boolean(keys.data?.items?.[0]?.key),
    }));
  }

  const offerings = await listOfferings({ client, path: { project_id: project.id }, query: { limit: 20 } });
  for (const offering of offerings.data?.items ?? []) {
    const packages = await listPackages({
      client,
      path: { project_id: project.id, offering_id: offering.id },
      query: { limit: 20 },
    });
    for (const pkg of packages.data?.items ?? []) {
      const attached = await getProductsFromPackage({
        client,
        path: { project_id: project.id, package_id: pkg.id },
      });
      console.log(JSON.stringify({
        package: pkg.lookup_key,
        products: attached.data?.items?.map((item) => ({
          productId: item.product?.id ?? item.product_id,
          storeIdentifier: item.product?.store_identifier,
          appId: item.product?.app_id,
        })) ?? [],
      }));
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});