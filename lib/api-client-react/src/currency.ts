export const SUPPORTED_CURRENCY_CODES = ['EUR', 'GBP', 'USD', 'CHF'] as const;

export type SupportedCurrency = (typeof SUPPORTED_CURRENCY_CODES)[number];

export const DEFAULT_CURRENCY: SupportedCurrency = 'EUR';

export const CURRENCIES = [
  { code: 'EUR', symbol: '€', label: { fr: 'Euro (€)', en: 'Euro (€)' } },
  { code: 'GBP', symbol: '£', label: { fr: 'Livre sterling (£)', en: 'Pound sterling (£)' } },
  { code: 'USD', symbol: '$', label: { fr: 'Dollar américain ($)', en: 'US dollar ($)' } },
  { code: 'CHF', symbol: 'CHF', label: { fr: 'Franc suisse (CHF)', en: 'Swiss franc (CHF)' } },
] as const satisfies ReadonlyArray<{
  code: SupportedCurrency;
  symbol: string;
  label: { fr: string; en: string };
}>;

export function isSupportedCurrency(value: unknown): value is SupportedCurrency {
  return typeof value === 'string' && SUPPORTED_CURRENCY_CODES.includes(value as SupportedCurrency);
}

export function getPreferredCurrency(metadata: unknown): SupportedCurrency {
  if (!metadata || typeof metadata !== 'object') return DEFAULT_CURRENCY;
  const value = (metadata as Record<string, unknown>).preferredCurrency;
  return isSupportedCurrency(value) ? value : DEFAULT_CURRENCY;
}

/** Resolve the currency used when a new wedding form is opened. */
export function getNewWeddingCurrency(metadata: unknown): SupportedCurrency {
  return getPreferredCurrency(metadata);
}

/** Keep existing Clerk metadata while persisting the planner's currency choice. */
export function withPreferredCurrency(metadata: unknown, currency: SupportedCurrency): Record<string, unknown> {
  const existingMetadata =
    metadata && typeof metadata === 'object' && !Array.isArray(metadata)
      ? metadata as Record<string, unknown>
      : {};

  return { ...existingMetadata, preferredCurrency: currency };
}

export function currencySymbol(currency: string): string {
  return CURRENCIES.find((item) => item.code === currency)?.symbol ?? currency;
}