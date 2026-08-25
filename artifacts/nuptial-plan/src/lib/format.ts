import { format, parseISO } from 'date-fns';
import { enGB, fr } from 'date-fns/locale';
import { getStoredLanguage, detectLanguage, type AppLanguage } from '@/lib/i18n';

const CURRENCY_CONFIG: Record<string, { locale: string; divisor: number }> = {
  EUR: { locale: 'fr-FR', divisor: 100 },
  GBP: { locale: 'fr-FR', divisor: 100 },
  USD: { locale: 'fr-FR', divisor: 100 },
  CHF: { locale: 'fr-CH', divisor: 100 },
};

function activeLanguage(): AppLanguage {
  return getStoredLanguage() ?? detectLanguage();
}

export function formatCurrency(cents: number, currency = 'EUR', language = activeLanguage()): string {
  const config = CURRENCY_CONFIG[currency] ?? { locale: 'fr-FR', divisor: 100 };
  const amount = cents / config.divisor;
  return new Intl.NumberFormat(language === 'fr' ? config.locale : 'en-GB', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatDate(dateString: string, formatString: string = 'd MMMM yyyy', language = activeLanguage()): string {
  return format(parseISO(dateString), formatString, { locale: language === 'fr' ? fr : enGB });
}

export function formatDateShort(dateString: string, language = activeLanguage()): string {
  return format(parseISO(dateString), 'd MMM yyyy', { locale: language === 'fr' ? fr : enGB }).toUpperCase();
}

export function formatDateTime(dateString: string, timeString?: string | null, language = activeLanguage()): string {
  const date = formatDate(dateString, 'EEEE d MMMM yyyy', language);
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
