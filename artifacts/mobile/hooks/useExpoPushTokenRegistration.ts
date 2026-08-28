import { useEffect, useRef } from 'react';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { registerPushToken, unregisterPushToken } from '@workspace/api-client-react';

const PUSH_TOKEN_STORAGE_KEY = '@nuptial-plan/expo-push-token';

function isExpoPushToken(token: string): boolean {
  return /^(Exponent|Expo)PushToken\[[A-Za-z0-9_-]+\]$/.test(token);
}

/** Removes this device from the authenticated planner before signing out. */
export async function unregisterCurrentExpoPushToken(): Promise<void> {
  const token = await AsyncStorage.getItem(PUSH_TOKEN_STORAGE_KEY);
  if (!token) return;
  try {
    await unregisterPushToken({ token });
  } catch {
    // Continue with sign-out if a temporary network failure prevents cleanup.
  } finally {
    await AsyncStorage.removeItem(PUSH_TOKEN_STORAGE_KEY);
  }
}

/**
 * Registers this physical device with the API after notification permission is
 * granted. The server uses that token to deliver notifications while the app is
 * closed. The token is never logged or shown to the planner.
 */
export function useExpoPushTokenRegistration(enabled: boolean): void {
  const registeredToken = useRef<string | null>(null);

  useEffect(() => {
    if (!enabled || Platform.OS === 'web') {
      const token = registeredToken.current;
      registeredToken.current = null;
      if (token) void unregisterCurrentExpoPushToken();
      return;
    }

    let active = true;
    const timeout = setTimeout(() => {
      const register = async () => {
        try {
          const configProjectId = Constants.expoConfig?.extra?.eas?.projectId;
          const projectId = Constants.easConfig?.projectId
            ?? (typeof configProjectId === 'string' ? configProjectId : undefined);
          const response = await Notifications.getExpoPushTokenAsync(
            projectId ? { projectId } : undefined,
          );
          const token = response.data;
          if (!active || !isExpoPushToken(token) || registeredToken.current === token) return;

          await registerPushToken({
            token,
            platform: Platform.OS === 'ios' ? 'ios' : 'android',
          });
          if (active) {
            registeredToken.current = token;
            await AsyncStorage.setItem(PUSH_TOKEN_STORAGE_KEY, token);
          }
        } catch {
          // Expo Go, simulators, or an unavailable network can temporarily
          // prevent registration. The next signed-in app launch retries.
        }
      };
      void register();
    }, 800);

    return () => {
      active = false;
      clearTimeout(timeout);
    };
  }, [enabled]);
}