import React, { useState, useEffect } from 'react';
import {
  Platform, StyleSheet, useColorScheme,
  View, Text, Image, Pressable, Modal, TouchableOpacity, ScrollView,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import { SymbolView } from 'expo-symbols';
import type { SFSymbol } from 'expo-symbols';
import { Redirect, Tabs } from 'expo-router';
import { useAuth } from '@clerk/expo';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';
import { SANS, SANS_MEDIUM, SANS_SEMIBOLD, SERIF } from '@/constants/fonts';
import { setAuthTokenGetter } from '@workspace/api-client-react';
import { NuptiaSheet } from '@/components/NuptiaSheet';
import logoImage from '@/assets/images/tnp-gold-logo.png';

// ── Tab metadata ───────────────────────────────────────────────────────────────
const TAB_META: Record<string, { sf: string; feather: string; label: string }> = {
  index:        { sf: 'house',              feather: 'home',         label: 'Aperçu' },
  mariages:     { sf: 'heart',              feather: 'heart',        label: 'Mariages' },
  evenements:   { sf: 'calendar',           feather: 'calendar',     label: 'Agenda' },
  prestataires: { sf: 'building.2',         feather: 'briefcase',    label: 'Prestataires' },
  invites:      { sf: 'person.2',           feather: 'users',        label: 'Invités' },
  budget:       { sf: 'chart.pie',          feather: 'pie-chart',    label: 'Budget' },
  paiements:    { sf: 'creditcard',         feather: 'credit-card',  label: 'Paiements' },
  contrats:     { sf: 'doc.text',           feather: 'file-text',    label: 'Contrats' },
  parametres:   { sf: 'gearshape',          feather: 'settings',     label: 'Paramètres' },
  profil:       { sf: 'person.crop.circle', feather: 'user',         label: 'Profil' },
};

// 5 primary tabs always visible in the bar
const PRIMARY = ['index', 'evenements', 'invites', 'budget', 'prestataires'];

// All tabs shown in the burger sheet (full list for quick access)
const ALL_TABS = [
  'index', 'mariages', 'evenements', 'prestataires',
  'invites', 'budget', 'paiements', 'contrats',
  'parametres', 'profil',
];

// ── Icon helper ────────────────────────────────────────────────────────────────
function TabIcon({ name, feather, size, color }: { name: string; feather: string; size: number; color: string }) {
  const isIOS = Platform.OS === 'ios';
  if (isIOS) return <SymbolView name={name as SFSymbol} tintColor={color} size={size} />;
  return <Feather name={feather as any} size={size} color={color} />;
}

// ── Fixed bottom tab bar ───────────────────────────────────────────────────────
interface TabBarProps {
  state: { index: number; routes: ReadonlyArray<{ key: string; name: string }> };
  navigation: {
    emit: (e: { type: string; target: string; canPreventDefault?: boolean }) => { defaultPrevented: boolean };
    navigate: (name: string) => void;
  };
  insets: { bottom: number };
}

function FixedTabBar({ state, navigation, insets }: TabBarProps) {
  const colors = useColors();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const isIOS = Platform.OS === 'ios';
  const [burgerOpen, setBurgerOpen] = useState(false);

  const BAR_H = 64;
  const bottomPad = insets?.bottom ?? 0;
  const bgColor = isDark ? colors.card : '#FDFAF7';

  // Current tab name
  const currentRoute = state.routes[state.index]?.name ?? '';
  const isSecondaryActive = !PRIMARY.includes(currentRoute);

  const navigateTo = (routeName: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const route = state.routes.find((r) => r.name === routeName);
    if (!route) return;
    const isFocused = state.routes[state.index]?.name === routeName;
    const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
    if (!isFocused && !event.defaultPrevented) navigation.navigate(routeName);
  };

  const openBurger = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setBurgerOpen(true);
  };

  return (
    <>
      {/* ── Fixed bar ── */}
      <View style={[bar.container, { height: BAR_H + bottomPad }]}>
        {/* Background */}
        {isIOS ? (
          <BlurView intensity={100} tint={isDark ? 'dark' : 'light'} style={StyleSheet.absoluteFill} />
        ) : (
          <View style={[StyleSheet.absoluteFill, { backgroundColor: bgColor }]} />
        )}

        {/* Gold top rim */}
        <View style={bar.goldRim} />

        {/* Tab buttons */}
        <View style={[bar.row, { height: BAR_H }]}>
          {PRIMARY.map((tabName) => {
            const meta = TAB_META[tabName]!;
            const focused = currentRoute === tabName;
            return (
              <Pressable
                key={tabName}
                onPress={() => navigateTo(tabName)}
                style={({ pressed }) => [bar.tabBtn, { opacity: pressed ? 0.7 : 1 }]}
                accessibilityRole="tab"
                accessibilityLabel={meta.label}
                accessibilityState={{ selected: focused }}
              >
                <View style={bar.tabInner}>
                  {/* Active dot / pill */}
                  {focused && (
                    <View style={[bar.activeDot, { backgroundColor: colors.plum }]} />
                  )}
                  <TabIcon
                    name={meta.sf}
                    feather={meta.feather}
                    size={24}
                    color={focused ? colors.plum : colors.mutedForeground}
                  />
                  <Text
                    style={[
                      bar.label,
                      {
                        fontFamily: focused ? SANS_SEMIBOLD : SANS,
                        color: focused ? colors.plum : colors.mutedForeground,
                      },
                    ]}
                    numberOfLines={1}
                  >
                    {meta.label}
                  </Text>
                </View>
              </Pressable>
            );
          })}

          {/* Burger button */}
          <Pressable
            onPress={openBurger}
            style={({ pressed }) => [bar.tabBtn, { opacity: pressed ? 0.7 : 1 }]}
            accessibilityRole="button"
            accessibilityLabel="Menu complet"
          >
            <View style={bar.tabInner}>
              {isSecondaryActive && (
                <View style={[bar.activeDot, { backgroundColor: colors.plum }]} />
              )}
              <View style={[bar.burgerIconWrap, isSecondaryActive && { backgroundColor: colors.plum + '18' }]}>
                <Feather
                  name="grid"
                  size={22}
                  color={isSecondaryActive ? colors.plum : colors.mutedForeground}
                />
              </View>
              <Text
                style={[
                  bar.label,
                  {
                    fontFamily: isSecondaryActive ? SANS_SEMIBOLD : SANS,
                    color: isSecondaryActive ? colors.plum : colors.mutedForeground,
                  },
                ]}
                numberOfLines={1}
              >
                Plus
              </Text>
            </View>
          </Pressable>
        </View>
      </View>

      {/* ── Burger full-menu sheet ── */}
      <BurgerSheet
        visible={burgerOpen}
        onClose={() => setBurgerOpen(false)}
        currentRoute={currentRoute}
        onNavigate={(name) => { setBurgerOpen(false); setTimeout(() => navigateTo(name), 50); }}
        colors={colors}
        isDark={isDark}
      />
    </>
  );
}

const bar = StyleSheet.create({
  container: { position: 'absolute', bottom: 0, left: 0, right: 0 },
  goldRim: { position: 'absolute', top: 0, left: 0, right: 0, height: StyleSheet.hairlineWidth * 2, backgroundColor: 'rgba(200,170,112,0.45)', zIndex: 2 },
  row: { flexDirection: 'row', alignItems: 'center' },
  tabBtn: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  tabInner: { alignItems: 'center', gap: 3, paddingTop: 6 },
  activeDot: { position: 'absolute', top: -1, width: 28, height: 3, borderRadius: 2 },
  label: { fontSize: 9, letterSpacing: 0.2, marginTop: 1 },
  burgerIconWrap: { width: 40, height: 24, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
});

// ── Burger sheet modal ─────────────────────────────────────────────────────────
function BurgerSheet({
  visible, onClose, currentRoute, onNavigate, colors, isDark,
}: {
  visible: boolean;
  onClose: () => void;
  currentRoute: string;
  onNavigate: (name: string) => void;
  colors: ReturnType<typeof useColors>;
  isDark: boolean;
}) {
  const insets = useSafeAreaInsets();
  const isIOS = Platform.OS === 'ios';

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      {/* Backdrop */}
      <Pressable style={bs.backdrop} onPress={onClose} />

      {/* Sheet */}
      <View
        style={[
          bs.sheet,
          {
            backgroundColor: isDark ? colors.card : '#FDFAF7',
            paddingBottom: Math.max(insets.bottom, 8),
          },
        ]}
      >
        {/* Handle */}
        <View style={[bs.handle, { backgroundColor: colors.border }]} />

        {/* Header */}
        <View style={bs.header}>
          <LinearGradient
            colors={[colors.plumDark, colors.plum]}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
            style={bs.headerGrad}
          >
            <View style={[StyleSheet.absoluteFill, { borderRadius: 16 }]}>
              <View style={{ position: 'absolute', top: -12, right: -12, width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(255,255,255,0.08)' }} />
              <View style={{ position: 'absolute', bottom: -8, left: 20, width: 50, height: 50, borderRadius: 25, backgroundColor: 'rgba(200,170,112,0.12)' }} />
            </View>
            <Image source={logoImage} style={bs.logoImage} resizeMode="contain" />
            <Text style={[bs.headerEye, { fontFamily: SANS_MEDIUM }]}>NAVIGATION</Text>
            <Text style={[bs.headerTitle, { fontFamily: SERIF }]}>The Nuptial Plan</Text>
          </LinearGradient>
          <TouchableOpacity onPress={onClose} style={bs.closeBtn} activeOpacity={0.7}>
            <Feather name="x" size={18} color={colors.mutedForeground} />
          </TouchableOpacity>
        </View>

        {/* Grid of all tabs */}
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={bs.grid}
        >
          {ALL_TABS.map((tabName) => {
            const meta = TAB_META[tabName]!;
            const isActive = currentRoute === tabName;
            const isPrimary = PRIMARY.includes(tabName);

            return (
              <TouchableOpacity
                key={tabName}
                onPress={() => onNavigate(tabName)}
                activeOpacity={0.75}
                style={[
                  bs.gridItem,
                  {
                    backgroundColor: isActive
                      ? colors.plum + '15'
                      : isDark ? colors.background : '#F5F0F5',
                    borderColor: isActive ? colors.plum + '40' : 'transparent',
                  },
                ]}
              >
                {/* Active indicator bar */}
                {isActive && (
                  <View style={[bs.activeBar, { backgroundColor: colors.plum }]} />
                )}

                {/* Icon container */}
                <View
                  style={[
                    bs.iconWrap,
                    {
                      backgroundColor: isActive
                        ? colors.plum + '20'
                        : isDark ? colors.card : '#EDE6ED',
                    },
                  ]}
                >
                  <TabIcon
                    name={meta.sf}
                    feather={meta.feather}
                    size={22}
                    color={isActive ? colors.plum : colors.mutedForeground}
                  />
                </View>

                <Text
                  style={[
                    bs.gridLabel,
                    {
                      fontFamily: isActive ? SANS_SEMIBOLD : SANS_MEDIUM,
                      color: isActive ? colors.plum : colors.foreground,
                    },
                  ]}
                  numberOfLines={1}
                >
                  {meta.label}
                </Text>

                {/* "Principal" badge for primary tabs */}
                {isPrimary && (
                  <Text style={[bs.primaryBadge, { color: colors.goldDim, fontFamily: SANS }]}>
                    ↓ barre
                  </Text>
                )}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>
    </Modal>
  );
}

const bs = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)' },
  sheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 16, paddingTop: 10, maxHeight: '88%' },
  handle: { width: 36, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 16 },
  header: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 18, gap: 10 },
  headerGrad: { flex: 1, borderRadius: 16, padding: 16, overflow: 'hidden' },
  logoImage: { width: 34, height: 34, marginBottom: 4 },
  headerEye: { fontSize: 8, letterSpacing: 2, color: 'rgba(200,170,112,0.80)', marginBottom: 4 },
  headerTitle: { fontSize: 22, color: '#FBF5FB', lineHeight: 22 },
  closeBtn: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.06)', marginTop: 4 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  gridItem: { width: '47%', borderRadius: 14, padding: 14, gap: 8, borderWidth: 1, overflow: 'hidden' },
  activeBar: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 3, borderRadius: 2 },
  iconWrap: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  gridLabel: { fontSize: 13 },
  primaryBadge: { fontSize: 9, letterSpacing: 0.3 },
});

// ── App layout ─────────────────────────────────────────────────────────────────
function ClassicTabLayout() {
  return (
    <Tabs
      screenOptions={{ headerShown: false }}
      tabBar={(props) => <FixedTabBar {...(props as any)} />}
    >
      <Tabs.Screen name="index" />
      <Tabs.Screen name="mariages" />
      <Tabs.Screen name="evenements" />
      <Tabs.Screen name="prestataires" />
      <Tabs.Screen name="invites" />
      <Tabs.Screen name="budget" />
      <Tabs.Screen name="paiements" />
      <Tabs.Screen name="contrats" />
      <Tabs.Screen name="parametres" />
      <Tabs.Screen name="profil" />
    </Tabs>
  );
}

// ── Root layout ────────────────────────────────────────────────────────────────
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
      <ClassicTabLayout />
      <NuptiaSheet />
    </View>
  );
}
