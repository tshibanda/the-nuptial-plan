import React, { useEffect, useRef, useCallback } from 'react';
import {
  Platform,
  StyleSheet,
  useColorScheme,
  View,
  Text,
  ScrollView,
  Pressable,
} from 'react-native';
import type { LayoutChangeEvent } from 'react-native';
/** Minimal subset of BottomTabBarProps we actually use. */
interface ScrollableTabBarProps {
  state: { index: number; routes: ReadonlyArray<{ key: string; name: string }> };
  navigation: {
    emit: (event: {
      type: string;
      target: string;
      canPreventDefault?: boolean;
    }) => { defaultPrevented: boolean };
    navigate: (name: string, params?: object) => void;
  };
  insets: { bottom: number; top: number; left: number; right: number };
}
import { useColors } from '@/hooks/useColors';
import { Feather } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { Redirect, Tabs } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import type { SFSymbol } from 'expo-symbols';
import { useAuth } from '@clerk/expo';
import { setAuthTokenGetter } from '@workspace/api-client-react';
import { SANS_SEMIBOLD } from '@/constants/fonts';
import { NuptiaSheet } from '@/components/NuptiaSheet';

// ── Tab metadata ──────────────────────────────────────────────────────────────
const TAB_META: Record<string, { sf: string; feather: string; label: string }> = {
  index:        { sf: 'house',              feather: 'home',         label: 'Aperçu' },
  mariages:     { sf: 'heart',              feather: 'heart',        label: 'Mariages' },
  evenements:   { sf: 'calendar',           feather: 'calendar',     label: 'Agenda' },
  prestataires: { sf: 'building.2',         feather: 'briefcase',    label: 'Prestataires' },
  invites:      { sf: 'person.2',           feather: 'users',        label: 'Invités' },
  budget:       { sf: 'chart.pie',          feather: 'pie-chart',    label: 'Budget' },
  paiements:    { sf: 'creditcard',         feather: 'credit-card',  label: 'Paiements' },
  profil:       { sf: 'person.crop.circle', feather: 'user',         label: 'Profil' },
};

// ── TabPill ───────────────────────────────────────────────────────────────────
interface TabPillProps {
  sfName: string;
  featherName: string;
  label: string;
  focused: boolean;
  colors: ReturnType<typeof useColors>;
}

function TabPill({ sfName, featherName, label, focused, colors }: TabPillProps) {
  const isIOS = Platform.OS === 'ios';

  if (!focused) {
    return (
      <View style={tp.iconOnly}>
        {isIOS ? (
          <SymbolView name={sfName as SFSymbol} tintColor={colors.mutedForeground} size={20} />
        ) : (
          <Feather name={featherName as any} size={20} color={colors.mutedForeground} />
        )}
      </View>
    );
  }

  return (
    <LinearGradient
      colors={[colors.plumDark, colors.plum]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={tp.pill}
    >
      <View style={tp.rim} />
      {isIOS ? (
        <SymbolView name={sfName as SFSymbol} tintColor="#FBF5FB" size={16} />
      ) : (
        <Feather name={featherName as any} size={16} color="#FBF5FB" />
      )}
      <Text style={[tp.label, { fontFamily: SANS_SEMIBOLD }]} numberOfLines={1}>
        {label}
      </Text>
    </LinearGradient>
  );
}

const tp = StyleSheet.create({
  iconOnly: {
    width: 52,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 18,
    overflow: 'hidden',
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

// ── Scrollable custom tab bar ─────────────────────────────────────────────────
/**
 * Replaces the native BottomTabBar with a horizontal ScrollView so all 8 tabs
 * are reachable without the system "More" overflow screen.
 *
 * Visual cues for discoverability:
 *   • Right-edge gradient fade — always visible on first render.
 *   • Left-edge gradient fade — appears once the user scrolls right.
 *   • "Peek" animation on mount — scrolls 90 px right then snaps back so the
 *     user sees the cut-off tabs and immediately understands the bar scrolls.
 */
function ScrollableTabBar({ state, navigation, insets }: ScrollableTabBarProps) {
  const colors = useColors();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const isIOS = Platform.OS === 'ios';

  const scrollRef = useRef<ScrollView>(null);
  // Track each tab's {x, width} so we can scroll it into view when focused
  const tabLayouts = useRef<{ [index: number]: { x: number; width: number } }>({});
  const hasPeeked = useRef(false);

  const BAR_H = 70;
  const bottomPad = insets?.bottom ?? 0;
  const bgColor = isDark ? colors.card : '#FDFAF7';

  // ── Peek animation: nudge right → snap back on first mount ───────────────
  useEffect(() => {
    if (hasPeeked.current) return;
    hasPeeked.current = true;
    const t1 = setTimeout(() => {
      scrollRef.current?.scrollTo({ x: 90, animated: true });
    }, 700);
    const t2 = setTimeout(() => {
      scrollRef.current?.scrollTo({ x: 0, animated: true });
    }, 1100);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  // ── Auto-scroll to keep the focused tab visible ───────────────────────────
  useEffect(() => {
    const info = tabLayouts.current[state.index];
    if (info) {
      // Target: center the focused tab, clamped to 0 so we never scroll past the start
      scrollRef.current?.scrollTo({ x: Math.max(0, info.x - 20), animated: true });
    }
  }, [state.index]);

  const onTabLayout = useCallback((index: number, e: LayoutChangeEvent) => {
    tabLayouts.current[index] = {
      x: e.nativeEvent.layout.x,
      width: e.nativeEvent.layout.width,
    };
  }, []);

  const gradientColor = isIOS
    ? (isDark ? 'rgba(10,4,10,0.92)' : 'rgba(253,250,247,0.92)')
    : (isDark ? bgColor : bgColor);

  return (
    <View style={[sb.container, { height: BAR_H + bottomPad }]}>
      {/* ── Background ─────────────────────────────────────────────────────── */}
      {isIOS ? (
        <BlurView
          intensity={95}
          tint={isDark ? 'dark' : 'light'}
          style={StyleSheet.absoluteFill}
        />
      ) : (
        <View style={[StyleSheet.absoluteFill, { backgroundColor: bgColor }]} />
      )}

      {/* ── Gold top rim ───────────────────────────────────────────────────── */}
      <View style={sb.goldRim} />

      {/* ── Scrollable tab row ─────────────────────────────────────────────── */}
      <ScrollView
        ref={scrollRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        decelerationRate="fast"
        contentContainerStyle={[sb.scrollContent, { paddingBottom: 0 }]}
        style={{ height: BAR_H }}
        // Preserve momentum-based feel
        scrollEventThrottle={16}
      >
        {state.routes.map((route: { key: string; name: string }, index: number) => {
          const meta = TAB_META[route.name];
          if (!meta) return null;
          const focused = state.index === index;

          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });
            if (!focused && !event.defaultPrevented) {
              navigation.navigate(route.name as any);
            }
          };

          const onLongPress = () => {
            navigation.emit({ type: 'tabLongPress', target: route.key });
          };

          return (
            <Pressable
              key={route.key}
              onPress={onPress}
              onLongPress={onLongPress}
              onLayout={(e) => onTabLayout(index, e)}
              style={({ pressed }) => [
                sb.tabItem,
                { height: BAR_H, opacity: pressed && !focused ? 0.7 : 1 },
              ]}
              accessibilityRole="tab"
              accessibilityState={{ selected: focused }}
              accessibilityLabel={meta.label}
            >
              <TabPill
                sfName={meta.sf}
                featherName={meta.feather}
                label={meta.label}
                focused={focused}
                colors={colors}
              />
            </Pressable>
          );
        })}
      </ScrollView>

      {/* ── Right-edge fade — shows there are more tabs to the right ───────── */}
      <LinearGradient
        colors={['transparent', gradientColor]}
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
        style={[sb.fadeRight, { height: BAR_H }]}
        pointerEvents="none"
      />

      {/* ── Left-edge fade — shows there are more tabs to the left ─────────── */}
      <LinearGradient
        colors={[gradientColor, 'transparent']}
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
        style={[sb.fadeLeft, { height: BAR_H }]}
        pointerEvents="none"
      />

      {/* ── Bottom safe-area fill ───────────────────────────────────────────── */}
      {bottomPad > 0 && (
        <View style={[sb.safeArea, { height: bottomPad, backgroundColor: bgColor }]} />
      )}
    </View>
  );
}

const sb = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    overflow: 'hidden',
  },
  goldRim: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: StyleSheet.hairlineWidth * 2,
    backgroundColor: 'rgba(200,170,112,0.40)',
    zIndex: 2,
  },
  scrollContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  tabItem: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  fadeRight: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 56,
    zIndex: 1,
    pointerEvents: 'none' as any,
  },
  fadeLeft: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: 32,
    zIndex: 1,
    pointerEvents: 'none' as any,
  },
  safeArea: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
});

// ── App layout with custom scrollable tab bar ─────────────────────────────────
function ClassicTabLayout() {
  return (
    <Tabs
      screenOptions={{ headerShown: false }}
      tabBar={(props) => <ScrollableTabBar {...(props as any)} />}
    >
      <Tabs.Screen name="index" />
      <Tabs.Screen name="mariages" />
      <Tabs.Screen name="evenements" />
      <Tabs.Screen name="prestataires" />
      <Tabs.Screen name="invites" />
      <Tabs.Screen name="budget" />
      <Tabs.Screen name="paiements" />
      <Tabs.Screen name="profil" />
    </Tabs>
  );
}

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
      <ClassicTabLayout />
      <NuptiaSheet />
    </View>
  );
}
