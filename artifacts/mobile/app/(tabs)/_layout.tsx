import React, { useEffect } from 'react';
import { Platform, StyleSheet, useColorScheme, View } from 'react-native';
import { useColors } from '@/hooks/useColors';
import { Feather } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { isLiquidGlassAvailable } from 'expo-glass-effect';
import { Redirect, Tabs } from 'expo-router';
import { Icon, Label, NativeTabs } from 'expo-router/unstable-native-tabs';
import { SymbolView } from 'expo-symbols';
import type { SFSymbol } from 'expo-symbols';
import { useAuth } from '@clerk/expo';
import { setAuthTokenGetter } from '@workspace/api-client-react';

// NativeTabs: iOS 26+ with liquid glass.
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
      <NativeTabs.Trigger name="prestataires">
        <Icon sf={{ default: 'building.2', selected: 'building.2.fill' }} />
        <Label>Prestataires</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="invites">
        <Icon sf={{ default: 'person.2', selected: 'person.2.fill' }} />
        <Label>Invités</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="profil">
        <Icon sf={{ default: 'person.crop.circle', selected: 'person.crop.circle.fill' }} />
        <Label>Profil</Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}

// ClassicTabLayout: older iOS, Android, web.
function ClassicTabLayout() {
  const colors = useColors();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const isIOS = Platform.OS === 'ios';
  const isWeb = Platform.OS === 'web';

  const tabIcon =
    (sfName: string, featherName: string) =>
    ({ color }: { color: string }) =>
      isIOS ? (
        <SymbolView name={sfName as SFSymbol} tintColor={color} size={22} />
      ) : (
        <Feather name={featherName as any} size={20} color={color} />
      );

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.mutedForeground,
        tabBarStyle: {
          position: 'absolute',
          backgroundColor: isIOS ? 'transparent' : colors.background,
          borderTopWidth: isWeb ? 1 : StyleSheet.hairlineWidth,
          borderTopColor: colors.border,
          elevation: 0,
          ...(isWeb ? { height: 84 } : {}),
        },
        tabBarLabelStyle: {
          fontSize: 10,
          letterSpacing: 0.2,
        },
        tabBarBackground: () =>
          isIOS ? (
            <BlurView
              intensity={100}
              tint={isDark ? 'dark' : 'light'}
              style={StyleSheet.absoluteFill}
            />
          ) : isWeb ? (
            <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.background }]} />
          ) : null,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Aperçu',
          tabBarIcon: tabIcon('house', 'home'),
        }}
      />
      <Tabs.Screen
        name="mariages"
        options={{
          title: 'Mariages',
          tabBarIcon: tabIcon('heart', 'heart'),
        }}
      />
      <Tabs.Screen
        name="prestataires"
        options={{
          title: 'Prestataires',
          tabBarIcon: tabIcon('building.2', 'briefcase'),
        }}
      />
      <Tabs.Screen
        name="invites"
        options={{
          title: 'Invités',
          tabBarIcon: tabIcon('person.2', 'users'),
        }}
      />
      <Tabs.Screen
        name="profil"
        options={{
          title: 'Profil',
          tabBarIcon: tabIcon('person.crop.circle', 'user'),
        }}
      />
    </Tabs>
  );
}

export default function TabLayout() {
  const { isSignedIn, getToken } = useAuth();

  // Wire the bearer token into every API request made by the generated client.
  useEffect(() => {
    setAuthTokenGetter(() => getToken());
  }, [getToken]);

  // Guard: send unauthenticated users to the sign-in screen.
  if (!isSignedIn) {
    return <Redirect href="/(auth)/sign-in" />;
  }

  if (isLiquidGlassAvailable()) {
    return <NativeTabLayout />;
  }
  return <ClassicTabLayout />;
}
