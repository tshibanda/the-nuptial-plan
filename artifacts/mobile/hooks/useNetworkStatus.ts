import { useEffect } from 'react';
import { AppState } from 'react-native';
import { refresh, useNetInfo } from '@react-native-community/netinfo';

/**
 * Returns the current network connectivity status.
 * isConnected === null means the status is not yet known — treat as online
 * to avoid a false-positive offline banner on first mount.
 */
export function useNetworkStatus() {
  const { isConnected } = useNetInfo();

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        // Native connectivity events may be missed while the app is suspended.
        void refresh().catch((error) => console.warn('Network status refresh failed', error));
      }
    });
    return () => subscription.remove();
  }, []);

  return {
    /** true while connected or status not yet known */
    isOnline: isConnected !== false,
    /** true only when we have confirmed there is no connection */
    isOffline: isConnected === false,
  };
}
