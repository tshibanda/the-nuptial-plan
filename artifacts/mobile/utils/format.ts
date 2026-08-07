/** Format amount in cents to a localized currency string. */
export function formatCents(cents: number, currency = 'EUR'): string {
  try {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(cents / 100);
  } catch {
    return `${(cents / 100).toFixed(0)} ${currency}`;
  }
}

/** Format ISO date string to a short French date. */
export function formatDateShort(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

/** Format ISO date string to day + month blocks. */
export function formatDateParts(dateStr: string): { day: string; month: string } {
  try {
    const d = new Date(dateStr);
    return {
      day: String(d.getDate()).padStart(2, '0'),
      month: d.toLocaleDateString('fr-FR', { month: 'short' }).toUpperCase().slice(0, 3),
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

/** Vendor status → French label + color key. */
export function vendorStatusLabel(status: string): { label: string; tone: 'success' | 'warning' | 'error' | 'neutral' } {
  switch (status) {
    case 'confirmed':      return { label: 'Confirmé', tone: 'success' };
    case 'deposit_paid':   return { label: 'Acompte versé', tone: 'neutral' };
    case 'awaiting_contract': return { label: 'Contrat en attente', tone: 'warning' };
    case 'cancelled':      return { label: 'Annulé', tone: 'error' };
    default:               return { label: status, tone: 'neutral' };
  }
}

/** RSVP status → French label + color key. */
export function rsvpLabel(status: string): { label: string; tone: 'success' | 'warning' | 'neutral' } {
  switch (status) {
    case 'confirmed': return { label: 'Confirmé', tone: 'success' };
    case 'pending':   return { label: 'En attente', tone: 'warning' };
    case 'declined':  return { label: 'Décliné', tone: 'neutral' };
    default:          return { label: status, tone: 'neutral' };
  }
}

/** Payment status → French label + color key. */
export function paymentStatusLabel(status: string): { label: string; tone: 'success' | 'warning' | 'error' | 'neutral' } {
  switch (status) {
    case 'paid':      return { label: 'Réglé', tone: 'success' };
    case 'pending':   return { label: 'À régler', tone: 'warning' };
    case 'overdue':   return { label: 'En retard', tone: 'error' };
    case 'scheduled': return { label: 'Programmé', tone: 'neutral' };
    default:          return { label: status, tone: 'neutral' };
  }
}
