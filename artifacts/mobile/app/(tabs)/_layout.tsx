import React, { useEffect } from 'react';
import { Platform, StyleSheet, useColorScheme, View, Text } from 'react-native';
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
import { SANS_MEDIUM } from '@/constants/fonts';

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

interface TabPillProps {
  sfName: string;
  featherName: string;
  label: string;
  focused: boolean;
  color: string;
  colors: ReturnType<typeof useColors>;
}

function TabPill({ sfName, featherName, label, focused, color, colors }: TabPillProps) {
  const isIOS = Platform.OS === 'ios';
  const iconColor = focused ? '#FBF5FB' : color;

  return (
    <View
      style={[
        tp.pill,
        focused && { backgroundColor: colors.plum },
      ]}
    >
      {isIOS ? (
        <SymbolView name={sfName as SFSymbol} tintColor={iconColor} size={19} />
      ) : (
        <Feather name={featherName as any} size={18} color={iconColor} />
      )}
      <Text
        style={[
          tp.label,
          { fontFamily: SANS_MEDIUM, color: focused ? '#FBF5FB' : color },
        ]}
        numberOfLines={1}
      >
        {label}
      </Text>
    </View>
  );
}

const tp = StyleSheet.create({
  pill: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 18,
    gap: 3,
    minWidth: 58,
  },
  label: {
    fontSize: 10,
    letterSpacing: 0.1,
  },
});

// ClassicTabLayout: older iOS, Android, web.
function ClassicTabLayout() {
  const colors = useColors();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const isWeb = Platform.OS === 'web';

  const makeTabIcon =
    (sfName: string, featherName: string, label: string) =>
    ({ color, focused }: { color: string; focused: boolean }) => (
      <TabPill
        sfName={sfName}
        featherName={featherName}
        label={label}
        focused={focused}
        color={color}
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
          backgroundColor: Platform.OS === 'ios' ? 'transparent' : colors.background,
          borderTopWidth: isWeb ? 1 : StyleSheet.hairlineWidth,
          borderTopColor: colors.border,
          elevation: 0,
          height: isWeb ? 78 : 72,
        },
        tabBarItemStyle: {
          alignItems: 'center',
          justifyContent: 'center',
          paddingVertical: 8,
        },
        tabBarBackground: () =>
          Platform.OS === 'ios' ? (
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
        options={{ tabBarIcon: makeTabIcon('house', 'home', 'Aperçu') }}
      />
      <Tabs.Screen
        name="mariages"
        options={{ tabBarIcon: makeTabIcon('heart', 'heart', 'Mariages') }}
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
        name="profil"
        options={{ tabBarIcon: makeTabIcon('person.crop.circle', 'user', 'Profil') }}
      />
    </Tabs>
  );
}

export default function TabLayout() {
  const { isSignedIn, getToken } = useAuth();

  useEffect(() => {
    setAuthTokenGetter(() => getToken());
  }, [getToken]);

  if (!isSignedIn) {
    return <Redirect href="/(auth)/sign-in" />;
  }

  if (isLiquidGlassAvailable()) {
    return <NativeTabLayout />;
  }
  return <ClassicTabLayout />;
}
