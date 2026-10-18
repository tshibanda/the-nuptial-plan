/**
 * useTour — AsyncStorage-backed first-visit tour state
 *
 * Usage:
 *   const { tourVisible, openTour, closeTour } = useTour('tour:accueil');
 *
 * On mount, if the key hasn't been seen, the tour opens automatically.
 * Dismissing the tour marks it as seen in AsyncStorage.
 */
import { useCallback, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface UseTourOptions {
  autoStart?: boolean;
  delayMs?: number;
}

export function useTour(
  storageKey: string,
  { autoStart = false, delayMs = 600 }: UseTourOptions = {},
) {
  const [tourVisible, setTourVisible] = useState(false);

  useEffect(() => {
    let mounted = true;
    let timer: ReturnType<typeof setTimeout> | undefined;

    if (autoStart) {
      void AsyncStorage.getItem(storageKey)
        .then((val) => {
          if (mounted && !val) {
            timer = setTimeout(() => setTourVisible(true), delayMs);
          }
        })
        .catch(() => {});
    }

    return () => {
      mounted = false;
      if (timer) clearTimeout(timer);
    };
  }, [autoStart, delayMs, storageKey]);

  const openTour = useCallback(() => {
    setTourVisible(true);
  }, []);

  const closeTour = useCallback(() => {
    setTourVisible(false);
    // Mark as seen so it won't auto-open again
    AsyncStorage.setItem(storageKey, '1').catch(() => {});
  }, [storageKey]);

  return { tourVisible, openTour, closeTour };
}
