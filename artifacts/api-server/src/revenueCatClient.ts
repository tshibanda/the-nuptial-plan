import { createClient } from "@replit/revenuecat-sdk/client";
import { ReplitConnectors } from "@replit/connectors-sdk";

/**
 * Returns a fresh RevenueCat SDK client authenticated through the Replit
 * connectors integration. Uses integration-managed credentials — never exposes
 * public SDK keys.
 *
 * Never cache the returned value; access tokens expire.
 */
export async function getUncachableRevenueCatClient() {
  const connectors = new ReplitConnectors();
  const proxyFetch = connectors.createProxyFetch("revenuecat");

  return createClient({
    baseUrl: "https://api.revenuecat.com/v2",
    fetch: proxyFetch,
  });
}
