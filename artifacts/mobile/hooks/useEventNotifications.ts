import { useEffect } from 'react';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { useListEvents } from '@workspace/api-client-react';
import type { CalendarEvent } from '@workspace/api-client-react';
import { useLocalization } from '@/context/LocalizationContext';

const ID_PREFIX = 'nuptial-event-';

const MS_48H = 48 * 60 * 60 * 1000;

/** Parse an ISO date (and optional HH:MM time) to a JS Date in local time. */
function parseEventDate(event: CalendarEvent): Date {
  const datePart = event.eventDate; // YYYY-MM-DD
  const timePart = event.eventTime ?? '09:00'; // default 9 AM
  return new Date(`${datePart}T${timePart}:00`);
}

async function cancelExistingEventNotifications(): Promise<void> {
  const all = await Notifications.getAllScheduledNotificationsAsync();
  await Promise.all(
    all
      .filter(n => n.identifier.startsWith(ID_PREFIX))
      .map(n => Notifications.cancelScheduledNotificationAsync(n.identifier)),
  );
}

async function scheduleEventAlert(event: CalendarEvent, locale: string, language: 'fr' | 'en'): Promise<void> {
  const eventDate = parseEventDate(event);
  const notifyAt = new Date(eventDate.getTime() - MS_48H);
  const now = new Date();

  // If the 48h-before window has already passed, fire soon (5 s) instead.
  const fireAt: Date = notifyAt <= now ? new Date(now.getTime() + 5_000) : notifyAt;

  const dateStr = eventDate.toLocaleDateString(locale, {
    weekday: 'long', day: 'numeric', month: 'long',
  });

  await Notifications.scheduleNotificationAsync({
    identifier: `${ID_PREFIX}${event.id}`,
    content: {
      title: language === 'fr' ? '📅 Événement dans 48 h' : '📅 Event in 48 hours',
      body: `${event.title} · ${dateStr}`,
      data: { type: 'event', eventId: event.id, weddingId: event.weddingId },
      sound: 'default',
      ...(Platform.OS === 'android' && { channelId: 'events' }),
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: fireAt,
    },
  });
}

/**
 * Schedules local notifications for calendar events within the next 48 hours.
 * Fires 48 h before the event; if already inside the window, fires in 5 s.
 */
export function useEventNotifications(weddingId: number | null): void {
  const { data: events } = useListEvents(weddingId ?? 0);
  const { language, locale } = useLocalization();

  useEffect(() => {
    if (!events || !weddingId || Platform.OS === 'web') return;

    const now = new Date();
    const in48h = new Date(now.getTime() + MS_48H);

    // Only alert for events in the future that are ≤ 48 h away
    const upcoming = events.filter(e => {
      const d = parseEventDate(e);
      return d > now && d <= in48h;
    });

    if (upcoming.length === 0) {
      cancelExistingEventNotifications().catch(() => {});
      return;
    }

    cancelExistingEventNotifications()
      .then(() => Promise.all(upcoming.map((event) => scheduleEventAlert(event, locale, language))))
      .catch(() => {});
  }, [events, weddingId, language, locale]);
}
