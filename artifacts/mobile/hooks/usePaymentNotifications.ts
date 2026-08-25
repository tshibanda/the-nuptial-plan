import { useEffect } from 'react';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { getListPaymentsQueryKey, useListPayments } from '@workspace/api-client-react';
import type { Payment } from '@workspace/api-client-react';
import { useLocalization } from '@/context/LocalizationContext';

const ID_PREFIX = 'nuptial-payment-';

/** Parse ISO date string (YYYY-MM-DD) to midnight UTC */
function parseDueDate(s: string): Date {
  return new Date(s + 'T00:00:00');
}

function isOverdue(p: Payment): boolean {
  return p.status === 'overdue' || (p.status === 'pending' && parseDueDate(p.dueDate) < new Date());
}

function isDueSoon(p: Payment): boolean {
  if (p.status !== 'pending') return false;
  const due = parseDueDate(p.dueDate);
  const in48h = new Date(Date.now() + 48 * 60 * 60 * 1000);
  return due >= new Date() && due <= in48h;
}

function formatAmount(amountCents: number, currency = 'EUR', locale = 'en-US'): string {
  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amountCents / 100);
  } catch {
    return `${(amountCents / 100).toFixed(0)} ${currency}`;
  }
}

async function cancelExistingPaymentNotifications(): Promise<void> {
  const all = await Notifications.getAllScheduledNotificationsAsync();
  await Promise.all(
    all
      .filter(n => n.identifier.startsWith(ID_PREFIX))
      .map(n => Notifications.cancelScheduledNotificationAsync(n.identifier)),
  );
}

async function schedulePaymentAlert(payment: Payment, currency: string, locale: string, language: 'fr' | 'en'): Promise<void> {
  const overdue = isOverdue(payment);
  const dueStr = parseDueDate(payment.dueDate).toLocaleDateString(locale, {
    day: 'numeric', month: 'long',
  });

  await Notifications.scheduleNotificationAsync({
    identifier: `${ID_PREFIX}${payment.id}`,
    content: {
      title: overdue
        ? language === 'fr' ? '⚠️ Paiement en retard' : '⚠️ Overdue payment'
        : language === 'fr' ? '💳 Paiement à venir' : '💳 Upcoming payment',
      body: overdue
        ? language === 'fr'
          ? `${payment.vendorName} · ${formatAmount(payment.amountCents, currency, locale)} était dû le ${dueStr}`
          : `${payment.vendorName} · ${formatAmount(payment.amountCents, currency, locale)} was due on ${dueStr}`
        : language === 'fr'
          ? `${payment.vendorName} · ${formatAmount(payment.amountCents, currency, locale)} dû le ${dueStr}`
          : `${payment.vendorName} · ${formatAmount(payment.amountCents, currency, locale)} due on ${dueStr}`,
      data: { type: 'payment', paymentId: payment.id, weddingId: payment.weddingId },
      sound: 'default',
      ...(Platform.OS === 'android' && { channelId: 'payments' }),
    },
    trigger: overdue
      ? { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: 5, repeats: false }
      : { type: Notifications.SchedulableTriggerInputTypes.DATE, date: new Date(parseDueDate(payment.dueDate).getTime() - 48 * 60 * 60 * 1000) },
  });
}

/**
 * When payment data is available, schedules local notifications for:
 * - Overdue payments (fires ~5 s after the app opens)
 * - Payments due within the next 48 hours (fires 48 h before the due date)
 */
export function usePaymentNotifications(weddingId: number | null, currency = 'EUR'): void {
  // Pass 0 when weddingId is null — the query is disabled and returns no data.
  const { data: payments } = useListPayments(weddingId ?? 0, {
    query: { queryKey: getListPaymentsQueryKey(weddingId ?? 0), enabled: weddingId !== null },
  });
  const { language, locale } = useLocalization();

  useEffect(() => {
    if (!payments || !weddingId || Platform.OS === 'web') return;

    const alertable = payments.filter(p => isOverdue(p) || isDueSoon(p));
    if (alertable.length === 0) {
      // Still cancel any stale notifications from a previous state
      cancelExistingPaymentNotifications().catch(() => {});
      return;
    }

    cancelExistingPaymentNotifications()
      .then(() => Promise.all(alertable.map(p => schedulePaymentAlert(p, currency, locale, language))))
      .catch(() => {});
  }, [payments, weddingId, currency, language, locale]);
}
