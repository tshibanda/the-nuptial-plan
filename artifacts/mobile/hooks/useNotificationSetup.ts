import { useEffect } from 'react';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

/**
 * Set the global notification presentation behaviour once at module load.
 * Alerts show even when the app is in the foreground.
 */
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

/** Request push-notification permissions and set up Android channels. */
export function useNotificationSetup() {
  useEffect(() => {
    if (Platform.OS === 'web') return;

    // Request permission (no-ops if already granted / denied)
    Notifications.requestPermissionsAsync().catch(() => {});

    // Android requires named channels for notifications to appear
    if (Platform.OS === 'android') {
      Notifications.setNotificationChannelAsync('payments', {
        name: 'Paiements',
        description: 'Rappels de paiements fournisseurs en retard ou à venir',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#c8aa70',
        sound: 'default',
      }).catch(() => {});

      Notifications.setNotificationChannelAsync('events', {
        name: 'Événements',
        description: 'Rappels d\'événements du planning dans les 48 heures',
        importance: Notifications.AndroidImportance.DEFAULT,
        sound: 'default',
      }).catch(() => {});
    }
  }, []);
}
