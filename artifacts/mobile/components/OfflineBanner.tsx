import React, { useEffect, useRef, useState } from 'react';
import {
  Animated, StyleSheet, Text, View, Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useQueryClient } from '@tanstack/react-query';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { SANS, SANS_MEDIUM } from '@/constants/fonts';

const BANNER_HEIGHT = 32;

/**
 * Slides in from the top whenever there is no network connection.
 * Shows the timestamp of the most-recently cached query response.
 * Positioned absolutely so it overlays all screens without shifting layout.
 */
export function OfflineBanner() {
  const { isOffline } = useNetworkStatus();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const slideAnim = useRef(new Animated.Value(-BANNER_HEIGHT)).current;
  const [lastSync, setLastSync] = useState<string | null>(null);

  // Slide in / out when connectivity changes.
  useEffect(() => {
    if (isOffline) {
      // Compute the most-recent successful data timestamp across all queries.
      const queries = queryClient.getQueryCache().getAll();
      const maxTs = queries.reduce(
        (m, q) => Math.max(m, q.state.dataUpdatedAt ?? 0),
        0,
      );
      setLastSync(
        maxTs > 0
          ? new Date(maxTs).toLocaleTimeString('fr-FR', {
              hour: '2-digit',
              minute: '2-digit',
            })
          : null,
      );
    }

    Animated.spring(slideAnim, {
      toValue: isOffline ? 0 : -BANNER_HEIGHT,
      useNativeDriver: true,
      tension: 70,
      friction: 12,
    }).start();
  }, [isOffline, queryClient, slideAnim]);

  // Keep off-screen but mounted so the animation can play.
  const topOffset = Platform.OS === 'web' ? 0 : insets.top;

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        ss.wrapper,
        { top: topOffset, transform: [{ translateY: slideAnim }] },
      ]}
    >
      <View style={ss.pill}>
        <Feather name="wifi-off" size={11} color="#f5f1eb" />
        <Text style={[ss.text, { fontFamily: SANS_MEDIUM }]}>
          Mode hors-ligne
          {lastSync ? ` · Synchro ${lastSync}` : ''}
        </Text>
      </View>
    </Animated.View>
  );
}

const ss = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    left: 0,
    right: 0,
    zIndex: 9999,
    alignItems: 'center',
    pointerEvents: 'none',
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#1a2d38',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(200,170,112,0.35)',
    // Subtle gold glow on mobile
    ...(Platform.OS === 'ios'
      ? { shadowColor: '#c8aa70', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 6 }
      : Platform.OS === 'android'
        ? { elevation: 6 }
        : { boxShadow: '0 2px 12px rgba(200,170,112,0.20)' } as any),
  },
  text: {
    fontSize: 11,
    color: '#f5f1eb',
    letterSpacing: 0.2,
  },
});
