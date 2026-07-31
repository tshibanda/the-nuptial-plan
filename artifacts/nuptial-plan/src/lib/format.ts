import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';

const CURRENCY_CONFIG: Record<string, { locale: string; divisor: number }> = {
  EUR: { locale: 'fr-FR', divisor: 100 },
  GBP: { locale: 'fr-FR', divisor: 100 },
  USD: { locale: 'fr-FR', divisor: 100 },
  CHF: { locale: 'fr-CH', divisor: 100 },
};

export function formatCurrency(cents: number, currency = 'EUR'): string {
  const config = CURRENCY_CONFIG[currency] ?? { locale: 'fr-FR', divisor: 100 };
  const amount = cents / config.divisor;
  return new Intl.NumberFormat(config.locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatDate(dateString: string, formatString: string = 'd MMMM yyyy'): string {
  return format(parseISO(dateString), formatString, { locale: fr });
}

export function formatDateShort(dateString: string): string {
  return format(parseISO(dateString), 'd MMM yyyy', { locale: fr }).toUpperCase();
}

export function formatDateTime(dateString: string, timeString?: string | null): string {
  const date = formatDate(dateString, 'EEEE d MMMM yyyy');
  if (timeString) {
    return `${date} · ${timeString}`;
  }
  return date;
}

export function calculateDaysUntil(dateString: string): number {
  const target = parseISO(dateString);
  const now = new Date();
  const diffTime = target.getTime() - now.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}
