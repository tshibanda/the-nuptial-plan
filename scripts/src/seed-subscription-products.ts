import { getUncachableStripeClient } from "./stripeClient";

const PRODUCT_NAME = "The Nuptial Plan Premium";
const plans = [
  { lookup_key: "tnp_monthly_eur", amount: 1499, interval: "month" as const, label: "Premium mensuel" },
  { lookup_key: "tnp_annual_eur", amount: 9999, interval: "year" as const, label: "Premium annuel" },
];

async function main() {
  const stripe = await getUncachableStripeClient();
  const existing = await stripe.products.search({ query: `name:'${PRODUCT_NAME}' AND active:'true'` });
  const product = existing.data[0] ?? await stripe.products.create({
    name: PRODUCT_NAME,
    description: "Planification de mariage complète avec un mois d’essai gratuit.",
    metadata: { entitlement: "premium", trial_months: "1" },
  });

  for (const plan of plans) {
    const prices = await stripe.prices.list({ lookup_keys: [plan.lookup_key], limit: 1 });
    if (prices.data[0]) {
      console.log(`${plan.lookup_key}: ${prices.data[0].id} already exists`);
      continue;
    }
    const price = await stripe.prices.create({
      product: product.id,
      unit_amount: plan.amount,
      currency: "eur",
      recurring: { interval: plan.interval },
      lookup_key: plan.lookup_key,
      metadata: { plan: plan.interval === "year" ? "annual" : "monthly", trial_months: "1" },
    });
    console.log(`${plan.label}: ${price.id}`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});