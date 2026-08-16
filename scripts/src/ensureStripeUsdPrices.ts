import { getUncachableStripeClient } from "./stripeClient";

const PRODUCT_NAME = "The Nuptial Plan Premium";
const MONTHLY_LOOKUP_KEY = "tnp_monthly_usd";
const ANNUAL_LOOKUP_KEY = "tnp_annual_usd";

async function ensurePrice(
  stripe: Awaited<ReturnType<typeof getUncachableStripeClient>>,
  productId: string,
  lookupKey: string,
  unitAmount: number,
  interval: "month" | "year",
) {
  const existing = await stripe.prices.list({
    lookup_keys: [lookupKey],
    active: true,
    limit: 1,
  });
  if (existing.data[0]) {
    console.log(`Stripe price already exists for ${lookupKey}: ${existing.data[0].id}`);
    return existing.data[0];
  }

  const price = await stripe.prices.create({
    product: productId,
    currency: "usd",
    unit_amount: unitAmount,
    recurring: { interval },
    lookup_key: lookupKey,
    metadata: {
      plan: interval === "month" ? "monthly" : "annual",
      storefront: "US App Store reference",
      source: "RevenueCat US price",
    },
  });
  console.log(`Created Stripe USD price for ${lookupKey}: ${price.id}`);
  return price;
}

async function main() {
  const stripe = await getUncachableStripeClient();
  const products = await stripe.products.search({
    query: `name:'${PRODUCT_NAME}'`,
    limit: 10,
  });
  const product = products.data.find((item) => item.name === PRODUCT_NAME);
  if (!product) throw new Error(`Stripe product not found: ${PRODUCT_NAME}`);

  await ensurePrice(stripe, product.id, MONTHLY_LOOKUP_KEY, 1499, "month");
  await ensurePrice(stripe, product.id, ANNUAL_LOOKUP_KEY, 9999, "year");
  console.log("Stripe USD prices are ready.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});