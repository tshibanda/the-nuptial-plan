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

export function useTour(storageKey: string) {
  const [tourVisible, setTourVisible] = useState(false);

  // Check on mount whether this tour has already been seen
  useEffect(() => {
    AsyncStorage.getItem(storageKey).then((val) => {
      if (!val) {
        // Not yet seen — show on a short delay so the screen can render first
        const t = setTimeout(() => setTourVisible(true), 600);
        return () => clearTimeout(t);
      }
    });
  }, [storageKey]);

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
