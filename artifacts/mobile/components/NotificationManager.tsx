import { useEffect } from 'react';
import { useRouter } from 'expo-router';
import * as Notifications from 'expo-notifications';
import { useLastNotificationResponse } from 'expo-notifications';
import { useAuth } from '@clerk/expo';
import { useNotificationSetup } from '@/hooks/useNotificationSetup';
import { useExpoPushTokenRegistration } from '@/hooks/useExpoPushTokenRegistration';
import { usePaymentNotifications } from '@/hooks/usePaymentNotifications';
import { useEventNotifications } from '@/hooks/useEventNotifications';
import { useActiveWedding } from '@/hooks/useActiveWedding';
import { usePreferredCurrency } from '@/hooks/usePreferredCurrency';

/**
 * Invisible manager component that:
 * 1. Requests notification permissions and creates Android channels
 * 2. Schedules local alerts for overdue payments and upcoming events
 * 3. Routes the planner to the correct tab when they tap a notification
 *
 * Rendered inside the root layout so it has access to WeddingContext and
 * the Expo Router instance.
 */
export function NotificationManager() {
  const router = useRouter();
  const { isSignedIn } = useAuth();

  const { activeWedding, weddingId } = useActiveWedding();
  const preferredCurrency = usePreferredCurrency();
  const currency = activeWedding?.currency ?? preferredCurrency;

  // Permissions + Android channel setup (runs once on mount)
  const notificationPermissionGranted = useNotificationSetup(Boolean(isSignedIn));
  useExpoPushTokenRegistration(Boolean(isSignedIn) && notificationPermissionGranted);

  // Schedule / cancel payment & event alerts whenever the data changes
  usePaymentNotifications(weddingId, currency);
  useEventNotifications(weddingId);

  // Deep-link to the relevant tab when the planner taps a notification
  const lastResponse = useLastNotificationResponse();
  useEffect(() => {
    if (!lastResponse) return;
    const data = lastResponse.notification.request.content.data as {
      type?: string;
      route?: string;
    };
    if (data?.route) {
      router.push(data.route as never);
    } else if (data?.type === 'payment') {
      // Payments live in the Prestataires (vendors) tab
      router.push('/(tabs)/prestataires');
    } else if (data?.type === 'event') {
      // Events appear on the dashboard / Aperçu tab (index route)
      router.push('/(tabs)');
    }
  }, [lastResponse, router]);

  return null; // renders nothing — side-effects only
}
