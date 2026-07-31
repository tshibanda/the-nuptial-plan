import { format, parseISO, differenceInDays } from 'date-fns';
import { fr } from 'date-fns/locale';

export function formatDate(dateString: string): string {
  return format(parseISO(dateString), 'd MMMM yyyy', { locale: fr });
}

export function formatShortDate(dateString: string): string {
  return format(parseISO(dateString), 'd MMM yyyy', { locale: fr });
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatNumber(num: number): string {
  return new Intl.NumberFormat('fr-FR').format(num);
}

export function getDaysUntil(dateString: string): number {
  return differenceInDays(parseISO(dateString), new Date());
}

export function getDaysUntilText(dateString: string): string {
  const days = getDaysUntil(dateString);
  if (days < 0) return `Il y a ${Math.abs(days)} jours`;
  if (days === 0) return "Aujourd'hui";
  if (days === 1) return 'Demain';
  return `Dans ${days} jours`;
}
