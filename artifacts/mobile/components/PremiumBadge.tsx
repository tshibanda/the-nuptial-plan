import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { SANS_SEMIBOLD } from '@/constants/fonts';
import { useColors } from '@/hooks/useColors';

interface PremiumBadgeProps {
  /** When true (subscriber), renders nothing. */
  hidden?: boolean;
  /** 'badge' shows a pill with star + "Premium" text. 'icon' shows just the star icon. Default: 'badge'. */
  variant?: 'badge' | 'icon';
}

/**
 * PremiumBadge — shown on gated entry points when the planner is not subscribed.
 * Renders nothing for active subscribers so the UI stays clean.
 */
export function PremiumBadge({ hidden = false, variant = 'badge' }: PremiumBadgeProps) {
  const colors = useColors();

  if (hidden) return null;

  if (variant === 'icon') {
    return (
      <View style={[b.iconWrap, { backgroundColor: colors.gold + 'CC' }]}>
        <Feather name="star" size={9} color="#3C1A3C" />
      </View>
    );
  }

  return (
    <View style={[b.pill, { backgroundColor: colors.gold }]}>
      <Feather name="star" size={8} color="#3C1A3C" />
      <Text style={[b.label, { fontFamily: SANS_SEMIBOLD }]}>Premium</Text>
    </View>
  );
}

const b = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 5,
  },
  label: {
    fontSize: 8,
    letterSpacing: 0.5,
    color: '#3C1A3C',
  },
  iconWrap: {
    width: 16,
    height: 16,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
