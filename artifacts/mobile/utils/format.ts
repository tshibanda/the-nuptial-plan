export type FormatLanguage = 'fr' | 'en';

function localeFor(language?: FormatLanguage, locale?: string): string {
  if (locale) return locale;
  return language === 'en' ? 'en-US' : 'fr-FR';
}

/** Format amount in cents to a localized currency string. */
export function formatCents(cents: number, currency = 'EUR', language: FormatLanguage = 'fr', locale?: string): string {
  try {
    return new Intl.NumberFormat(localeFor(language, locale), {
      style: 'currency',
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(cents / 100);
  } catch {
    return `${(cents / 100).toFixed(0)} ${currency}`;
  }
}

/** Format ISO date string using the selected app language. */
export function formatDateShort(dateStr: string, language: FormatLanguage = 'fr', locale?: string): string {
  try {
    return new Date(dateStr).toLocaleDateString(localeFor(language, locale), {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

/** Format ISO date string to day + month blocks. */
export function formatDateParts(dateStr: string, language: FormatLanguage = 'fr', locale?: string): { day: string; month: string } {
  try {
    const d = new Date(dateStr);
    return {
      day: String(d.getDate()).padStart(2, '0'),
      month: d.toLocaleDateString(localeFor(language, locale), { month: 'short' }).toUpperCase().slice(0, 3),
    };
  } catch {
    return { day: '--', month: '---' };
  }
}

/** Get number of days until a date. */
export function daysUntil(dateStr: string): number {
  const diff = new Date(dateStr).getTime() - Date.now();
  return Math.ceil(diff / 86400000);
}

/**
 * Get two-letter initials from a wedding names string like "Marie & Jean".
 * Splits on "&" so each spouse contributes their first letter, regardless
 * of how many words their full name has.
 * Falls back to splitting on whitespace when no "&" is present.
 */
export function initials(name: string): string {
  const parts = name.includes('&')
    ? name.split('&').map((s) => s.trim()).filter(Boolean)
    : name.split(/\s+/).filter(Boolean);
  return parts
    .map((p) => p[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

/** Vendor status → localized label + color key. */
export function vendorStatusLabel(status: string, language: FormatLanguage = 'fr'): { label: string; tone: 'success' | 'warning' | 'error' | 'neutral' } {
  switch (status) {
    case 'confirmed':      return { label: language === 'en' ? 'Confirmed' : 'Confirmé', tone: 'success' };
    case 'deposit_paid':   return { label: language === 'en' ? 'Deposit paid' : 'Acompte versé', tone: 'neutral' };
    case 'awaiting_contract': return { label: language === 'en' ? 'Contract pending' : 'Contrat en attente', tone: 'warning' };
    case 'cancelled':      return { label: language === 'en' ? 'Cancelled' : 'Annulé', tone: 'error' };
    default:               return { label: status, tone: 'neutral' };
  }
}

/** RSVP status → localized label + color key. */
export function rsvpLabel(status: string, language: FormatLanguage = 'fr'): { label: string; tone: 'success' | 'warning' | 'neutral' } {
  switch (status) {
    case 'confirmed': return { label: language === 'en' ? 'Confirmed' : 'Confirmé', tone: 'success' };
    case 'pending':   return { label: language === 'en' ? 'Pending' : 'En attente', tone: 'warning' };
    case 'declined':  return { label: language === 'en' ? 'Declined' : 'Décliné', tone: 'neutral' };
    default:          return { label: status, tone: 'neutral' };
  }
}

/** Payment status → localized label + color key. */
export function paymentStatusLabel(status: string, language: FormatLanguage = 'fr'): { label: string; tone: 'success' | 'warning' | 'error' | 'neutral' } {
  switch (status) {
    case 'paid':      return { label: language === 'en' ? 'Paid' : 'Réglé', tone: 'success' };
    case 'pending':   return { label: language === 'en' ? 'Due' : 'À régler', tone: 'warning' };
    case 'overdue':   return { label: language === 'en' ? 'Overdue' : 'En retard', tone: 'error' };
    case 'scheduled': return { label: language === 'en' ? 'Scheduled' : 'Programmé', tone: 'neutral' };
    default:          return { label: status, tone: 'neutral' };
  }
}
