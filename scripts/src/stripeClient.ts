import Stripe from "stripe";

export async function getUncachableStripeClient(): Promise<Stripe> {
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const token = process.env.REPL_IDENTITY
    ? `repl ${process.env.REPL_IDENTITY}`
    : process.env.WEB_REPL_RENEWAL
      ? `depl ${process.env.WEB_REPL_RENEWAL}`
      : null;
  if (!hostname || !token) throw new Error("Stripe connector environment is unavailable.");
  const response = await fetch(
    `https://${hostname}/api/v2/connection?include_secrets=true&connector_names=stripe`,
    { headers: { Accept: "application/json", X_REPLIT_TOKEN: token } },
  );
  if (!response.ok) throw new Error(`Unable to load Stripe credentials (${response.status}).`);
  const data = await response.json() as { items?: Array<{ settings?: { secret?: string } }> };
  const secretKey = data.items?.[0]?.settings?.secret;
  if (!secretKey) throw new Error("Stripe secret key is missing.");
  return new Stripe(secretKey);
}