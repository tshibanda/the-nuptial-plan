import Constants from 'expo-constants';

type SubscriptionProduct = {
  identifier?: string;
  productIdentifier?: string;
  price?: number;
  priceString?: string;
};

function getDeviceLocale(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().locale || 'en-US';
  } catch {
    return 'en-US';
  }
}

function getPreferredCurrency(locale: string): string {
  const normalized = locale.toLowerCase();
  if (normalized.includes('-ch')) return 'CHF';
  if (normalized.includes('-gb')) return 'GBP';
  if (normalized.includes('-ca')) return 'CAD';
  if (normalized.includes('-au')) return 'AUD';
  if (normalized.includes('-nz')) return 'NZD';
  if (normalized.includes('-jp') || normalized.startsWith('ja')) return 'JPY';
  if (
    normalized.startsWith('fr') ||
    normalized.startsWith('de') ||
    normalized.startsWith('es') ||
    normalized.startsWith('it') ||
    normalized.startsWith('pt') ||
    normalized.startsWith('nl') ||
    normalized.startsWith('be') ||
    normalized.startsWith('at') ||
    normalized.startsWith('ie')
  ) {
    return 'EUR';
  }
  return 'USD';
}

/**
 * Test Store products can return USD even when the device is configured for
 * another locale. Native App Store products already contain the storefront's
 * authoritative localized price and must not be converted client-side.
 */
export function formatSubscriptionPrice(product: SubscriptionProduct): string {
  const fallback = product.priceString ?? '—';
  const identifier = product.identifier ?? product.productIdentifier ?? '';
  const isTestStoreProduct =
    Constants.appOwnership === 'expo' ||
    identifier === 'monthly' ||
    identifier === 'yearly';

  if (!isTestStoreProduct || typeof product.price !== 'number' || !Number.isFinite(product.price)) {
    return fallback;
  }

  try {
    const locale = getDeviceLocale();
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: getPreferredCurrency(locale),
    }).format(product.price);
  } catch {
    return fallback;
  }
}