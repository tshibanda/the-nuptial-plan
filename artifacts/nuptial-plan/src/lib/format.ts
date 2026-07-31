import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';

export function formatCurrency(cents: number): string {
  const pounds = cents / 100;
  return `£${pounds.toLocaleString('fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).replace(/\s/g, ' ')}`;
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
