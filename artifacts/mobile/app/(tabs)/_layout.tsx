import React, { useEffect } from 'react';
import { Platform, StyleSheet, useColorScheme, View, Text } from 'react-native';
import { useColors } from '@/hooks/useColors';
import { Feather } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { isLiquidGlassAvailable } from 'expo-glass-effect';
import { Redirect, Tabs } from 'expo-router';
import { Icon, Label, NativeTabs } from 'expo-router/unstable-native-tabs';
import { SymbolView } from 'expo-symbols';
import type { SFSymbol } from 'expo-symbols';
import { useAuth } from '@clerk/expo';
import { setAuthTokenGetter } from '@workspace/api-client-react';
import { SANS_SEMIBOLD } from '@/constants/fonts';
import { NuptiaSheet } from '@/components/NuptiaSheet';

// NativeTabs: iOS 26+ with liquid glass.
// All 8 routes exposed so every section is reachable directly from the tab bar.
function NativeTabLayout() {
  return (
    <NativeTabs>
      <NativeTabs.Trigger name="index">
        <Icon sf={{ default: 'house', selected: 'house.fill' }} />
        <Label>Aperçu</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="mariages">
        <Icon sf={{ default: 'heart', selected: 'heart.fill' }} />
        <Label>Mariages</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="evenements">
        <Icon sf={{ default: 'calendar', selected: 'calendar.badge.checkmark' }} />
        <Label>Agenda</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="prestataires">
        <Icon sf={{ default: 'building.2', selected: 'building.2.fill' }} />
        <Label>Prestataires</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="invites">
        <Icon sf={{ default: 'person.2', selected: 'person.2.fill' }} />
        <Label>Invités</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="budget">
        <Icon sf={{ default: 'chart.pie', selected: 'chart.pie.fill' }} />
        <Label>Budget</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="paiements">
        <Icon sf={{ default: 'creditcard', selected: 'creditcard.fill' }} />
        <Label>Paiements</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="profil">
        <Icon sf={{ default: 'person.crop.circle', selected: 'person.crop.circle.fill' }} />
        <Label>Profil</Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}

// ── Per-tab icon/label data ───────────────────────────────────────────────────
interface TabPillProps {
  sfName: string;
  featherName: string;
  label: string;
  focused: boolean;
  colors: ReturnType<typeof useColors>;
}

/**
 * Active tab  → plum LinearGradient pill with icon + label
 * Inactive tab → icon only, muted colour, no pill
 *
 * Icon-only inactive tabs keep the bar narrow enough that all 6 tabs fit
 * comfortably on 390 px without triggering the "More" overflow.
 */
function TabPill({ sfName, featherName, label, focused, colors }: TabPillProps) {
  const isIOS = Platform.OS === 'ios';

  if (!focused) {
    return (
      <View style={tp.iconOnly}>
        {isIOS ? (
          <SymbolView
            name={sfName as SFSymbol}
            tintColor={colors.mutedForeground}
            size={20}
          />
        ) : (
          <Feather name={featherName as any} size={20} color={colors.mutedForeground} />
        )}
      </View>
    );
  }

  // Active pill — gradient + label
  return (
    <LinearGradient
      colors={[colors.plumDark, colors.plum]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={tp.pill}
    >
      {/* Rim highlight */}
      <View style={tp.rim} />
      {isIOS ? (
        <SymbolView name={sfName as SFSymbol} tintColor="#FBF5FB" size={16} />
      ) : (
        <Feather name={featherName as any} size={16} color="#FBF5FB" />
      )}
      <Text
        style={[tp.label, { fontFamily: SANS_SEMIBOLD }]}
        numberOfLines={1}
      >
        {label}
      </Text>
    </LinearGradient>
  );
}

const tp = StyleSheet.create({
  iconOnly: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 18,
    overflow: 'hidden',
    // subtle pill shadow on Android/web
    ...(Platform.OS === 'web'
      ? { boxShadow: '0 2px 10px rgba(93,45,93,0.30)' } as any
      : Platform.OS === 'android'
        ? { elevation: 3 }
        : {}),
  },
  rim: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
  },
  label: {
    fontSize: 10,
    letterSpacing: 0.2,
    color: '#FBF5FB',
  },
});

// ── Classic tab layout (Android / web / older iOS) ────────────────────────────
function ClassicTabLayout() {
  const colors = useColors();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const isWeb = Platform.OS === 'web';

  const makeTabIcon =
    (sfName: string, featherName: string, label: string) =>
    ({ focused }: { color: string; focused: boolean }) => (
      <TabPill
        sfName={sfName}
        featherName={featherName}
        label={label}
        focused={focused}
        colors={colors}
      />
    );

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
        tabBarActiveTintColor: colors.plum,
        tabBarInactiveTintColor: colors.mutedForeground,
        tabBarStyle: {
          position: 'absolute',
          backgroundColor: Platform.OS === 'ios' ? 'transparent' : colors.card,
          // Gold-tinted top border matching the hero gold bar
          borderTopWidth: StyleSheet.hairlineWidth,
          borderTopColor: 'rgba(200,170,112,0.40)',
          elevation: 0,
          height: isWeb ? 74 : 70,
        },
        tabBarItemStyle: {
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
        },
        tabBarBackground: () =>
          Platform.OS === 'ios' ? (
            // Frosted glass on iOS — consistent with frosted header
            <BlurView
              intensity={95}
              tint={isDark ? 'dark' : 'light'}
              style={StyleSheet.absoluteFill}
            />
          ) : (
            // Subtle card background on web/Android with a top gold rim
            <View style={[StyleSheet.absoluteFill, { backgroundColor: isDark ? colors.card : '#FDFAF7' }]}>
              <View style={cl.goldRim} />
            </View>
          ),
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ tabBarIcon: makeTabIcon('house', 'home', 'Aperçu') }}
      />
      <Tabs.Screen
        name="mariages"
        options={{ tabBarIcon: makeTabIcon('heart', 'heart', 'Mariages') }}
      />
      <Tabs.Screen
        name="evenements"
        options={{ tabBarIcon: makeTabIcon('calendar', 'calendar', 'Agenda') }}
      />
      <Tabs.Screen
        name="prestataires"
        options={{ tabBarIcon: makeTabIcon('building.2', 'briefcase', 'Prestataires') }}
      />
      <Tabs.Screen
        name="invites"
        options={{ tabBarIcon: makeTabIcon('person.2', 'users', 'Invités') }}
      />
      <Tabs.Screen
        name="budget"
        options={{ tabBarIcon: makeTabIcon('chart.pie', 'pie-chart', 'Budget') }}
      />
      <Tabs.Screen
        name="paiements"
        options={{ tabBarIcon: makeTabIcon('creditcard', 'credit-card', 'Paiements') }}
      />
      <Tabs.Screen
        name="profil"
        options={{ tabBarIcon: makeTabIcon('person.crop.circle', 'user', 'Profil') }}
      />
    </Tabs>
  );
}

const cl = StyleSheet.create({
  goldRim: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 1.5,
    backgroundColor: 'rgba(200,170,112,0.35)',
  },
});

// ── Root layout ───────────────────────────────────────────────────────────────
export default function TabLayout() {
  const { isSignedIn, getToken } = useAuth();

  useEffect(() => {
    setAuthTokenGetter(() => getToken());
  }, [getToken]);

  if (!isSignedIn) {
    return <Redirect href="/(auth)/sign-in" />;
  }

  return (
    <View style={{ flex: 1 }}>
      {isLiquidGlassAvailable() ? <NativeTabLayout /> : <ClassicTabLayout />}
      <NuptiaSheet />
    </View>
  );
}
