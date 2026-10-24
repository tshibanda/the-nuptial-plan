import React, { useState, useEffect } from 'react';
import {
  AppState, InteractionManager, Platform, StyleSheet, useColorScheme,
  View, Text, Image, Pressable, Modal, TouchableOpacity, ScrollView,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import { SymbolView } from 'expo-symbols';
import type { SFSymbol } from 'expo-symbols';
import { Redirect, Tabs, usePathname } from 'expo-router';
import { useAuth, useUser } from '@clerk/expo';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';
import { SANS, SANS_MEDIUM, SANS_SEMIBOLD, SERIF } from '@/constants/fonts';
import { NuptiaSheet } from '@/components/NuptiaSheet';
import { GlobalTourHelp } from '@/components/TourSheet';
import { PremiumBadge } from '@/components/PremiumBadge';
import logoImage from '@/assets/images/tnp-gold-logo.png';
import { useLocalization, type TranslationKey } from '@/context/LocalizationContext';
import { useQueryClient } from '@tanstack/react-query';
import {
  getGetBudgetSummaryQueryOptions,
  getGetBudgetSummaryQueryKey,
  getListGuestsQueryOptions,
  getListGuestsQueryKey,
  getListPaymentsQueryOptions,
  getListPaymentsQueryKey,
  getListContractsQueryOptions,
  getListContractsQueryKey,
  getListAddressBookEntriesQueryOptions,
  getListAddressBookEntriesQueryKey,
} from '@workspace/api-client-react';
import { MOBILE_TAB_STALE_TIME, useActiveWedding } from '@/hooks/useActiveWedding';
import { useSubscription } from '@/lib/subscription';
import { getWeddingDocumentsQueryOptions } from '@/hooks/useWeddingDocuments';

// ── Tab metadata ───────────────────────────────────────────────────────────────
const TAB_META: Record<string, { sf: string; feather: string; labelKey: TranslationKey; descriptionKey: TranslationKey }> = {
  index:        { sf: 'house', feather: 'home', labelKey: 'tabs.dashboard', descriptionKey: 'tabs.description.dashboard' },
  mariages:     { sf: 'heart', feather: 'heart', labelKey: 'tabs.weddings', descriptionKey: 'tabs.description.weddings' },
  evenements:   { sf: 'calendar', feather: 'calendar', labelKey: 'tabs.calendar', descriptionKey: 'tabs.description.calendar' },
  prestataires: { sf: 'building.2', feather: 'briefcase', labelKey: 'tabs.vendors', descriptionKey: 'tabs.description.vendors' },
  invites:      { sf: 'person.2', feather: 'users', labelKey: 'tabs.guests', descriptionKey: 'tabs.description.guests' },
  budget:       { sf: 'chart.pie', feather: 'pie-chart', labelKey: 'tabs.budget', descriptionKey: 'tabs.description.budget' },
  paiements:    { sf: 'creditcard', feather: 'credit-card', labelKey: 'tabs.payments', descriptionKey: 'tabs.description.payments' },
  contrats:     { sf: 'doc.text', feather: 'file-text', labelKey: 'tabs.contracts', descriptionKey: 'tabs.description.contracts' },
  documents:    { sf: 'folder', feather: 'folder', labelKey: 'tabs.documents', descriptionKey: 'tabs.description.documents' },
  parametres:   { sf: 'gearshape', feather: 'settings', labelKey: 'tabs.settings', descriptionKey: 'tabs.description.settings' },
  profil:       { sf: 'person.crop.circle', feather: 'user', labelKey: 'tabs.profile', descriptionKey: 'tabs.description.profile' },
  moodboards:   { sf: 'square.grid.2x2', feather: 'image', labelKey: 'tabs.moodboards', descriptionKey: 'tabs.description.moodboards' },
  business:     { sf: 'briefcase', feather: 'briefcase', labelKey: 'tabs.business', descriptionKey: 'tabs.description.business' },
  'carnet-adresse': { sf: 'person.2', feather: 'book-open', labelKey: 'tabs.contacts', descriptionKey: 'tabs.description.contacts' },
  'mes-reseaux': { sf: 'network', feather: 'share-2', labelKey: 'tabs.networks', descriptionKey: 'tabs.description.networks' },
  'mes-reservations': { sf: 'checkmark.circle', feather: 'clipboard', labelKey: 'tabs.reservations', descriptionKey: 'tabs.description.reservations' },
  'mes-rendez-vous': { sf: 'calendar.badge.clock', feather: 'clock', labelKey: 'tabs.appointments', descriptionKey: 'tabs.description.appointments' },
  retroplanning: { sf: 'calendar.badge.clock', feather: 'clock', labelKey: 'tabs.timeline', descriptionKey: 'tabs.description.timeline' },
  'jour-j': { sf: 'sun.max', feather: 'sun', labelKey: 'tabs.weddingDay', descriptionKey: 'tabs.description.weddingDay' },
};

// Five primary tabs visible in the bar. The selection is persisted locally.
const DEFAULT_PRIMARY = ['index', 'evenements', 'budget', 'invites', 'profil'];
const PRIMARY_TABS_STORAGE_KEY = '@nuptial-plan/primary-tabs';
const SOCIALS_ACCESS_EMAIL = 'e.tshibanda78@gmail.com';

// All tabs shown in the burger sheet (full list for quick access)
const ALL_TABS = [
  'index', 'mariages', 'evenements', 'prestataires',
  'invites', 'budget', 'paiements', 'contrats', 'documents',
  'parametres', 'profil', 'moodboards', 'business', 'carnet-adresse', 'retroplanning', 'jour-j',
  'mes-reseaux', 'mes-reservations', 'mes-rendez-vous',
];

const PREMIUM_TABS = new Set([
  'prestataires', 'invites', 'contrats', 'paiements', 'documents',
  'moodboards', 'business', 'carnet-adresse', 'jour-j',
  'mes-reseaux', 'mes-reservations', 'mes-rendez-vous',
]);

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
  const { user } = useUser();
  const canUseSocials = user?.primaryEmailAddress?.emailAddress?.trim().toLowerCase() === SOCIALS_ACCESS_EMAIL;
  const [burgerOpen, setBurgerOpen] = useState(false);
  const [primaryTabs, setPrimaryTabs] = useState(DEFAULT_PRIMARY);
  const { t, language } = useLocalization();

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState) => {
      // Release the native modal window before the app is suspended.
      if (nextState === 'background') setBurgerOpen(false);
    });
    return () => subscription.remove();
  }, []);

  const BAR_H = 64;
  const bottomPad = insets?.bottom ?? 0;
  const bgColor = isDark ? colors.card : '#FDFAF7';

  // Current tab name
  const currentRoute = state.routes[state.index]?.name ?? '';
  const isSecondaryActive = !primaryTabs.includes(currentRoute);
  useEffect(() => {
    let mounted = true;
    AsyncStorage.getItem(PRIMARY_TABS_STORAGE_KEY).then((stored) => {
      if (!mounted || !stored) return;
      try {
        const parsed = JSON.parse(stored);
        if (
          Array.isArray(parsed) &&
          parsed.length === 5 &&
          parsed.every((name) => typeof name === 'string' && ALL_TABS.includes(name))
        ) {
          setPrimaryTabs(parsed);
        }
      } catch {
        // Keep the defaults if the saved preference is invalid.
      }
    });
    return () => { mounted = false; };
  }, []);

  const updatePrimaryTabs = (tabs: string[]) => {
    setPrimaryTabs(tabs);
    void AsyncStorage.setItem(PRIMARY_TABS_STORAGE_KEY, JSON.stringify(tabs));
  };

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
          <BlurView pointerEvents="none" intensity={100} tint={isDark ? 'dark' : 'light'} style={StyleSheet.absoluteFill} />
        ) : (
          <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: bgColor }]} />
        )}

        {/* Gold top rim */}
        <View pointerEvents="none" style={bar.goldRim} />

        {/* Tab buttons */}
        <View style={[bar.row, { height: BAR_H }]}>
          {primaryTabs.map((tabName) => {
            const meta = TAB_META[tabName]!;
            const focused = currentRoute === tabName;
            const socialsLocked = tabName === 'mes-reseaux' && !canUseSocials;
            return (
              <Pressable
                key={tabName}
                onPress={() => { if (!socialsLocked) navigateTo(tabName); }}
                style={({ pressed }) => [bar.tabBtn, { opacity: socialsLocked ? 0.38 : pressed ? 0.7 : 1 }]}
                accessibilityRole="tab"
                accessibilityLabel={t(meta.labelKey)}
                accessibilityState={{ selected: focused, disabled: socialsLocked }}
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
                    {t(meta.labelKey)}
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
            accessibilityLabel={t('navigation.fullMenu')}
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
                {t('common.more')}
              </Text>
            </View>
          </Pressable>
        </View>
      </View>

      {/* ── Burger full-menu sheet ── */}
      {burgerOpen && <BurgerSheet
        visible={burgerOpen}
        onClose={() => setBurgerOpen(false)}
        currentRoute={currentRoute}
        onNavigate={(name) => { setBurgerOpen(false); navigateTo(name); }}
        primaryTabs={primaryTabs}
        onPrimaryTabsChange={updatePrimaryTabs}
        colors={colors}
        isDark={isDark}
        canUseSocials={canUseSocials}
        language={language}
      />}
    </>
  );
}

const bar = StyleSheet.create({
  container: { position: 'absolute', bottom: 0, left: 0, right: 0 },
  goldRim: { position: 'absolute', top: 0, left: 0, right: 0, height: StyleSheet.hairlineWidth * 2, backgroundColor: 'rgba(200,170,112,0.45)', zIndex: 2 },
  row: { flexDirection: 'row', alignItems: 'center' },
  tabBtn: { flex: 1, height: '100%', alignItems: 'center', justifyContent: 'center' },
  tabInner: { alignItems: 'center', gap: 3, paddingTop: 6 },
  activeDot: { position: 'absolute', top: -1, width: 28, height: 3, borderRadius: 2 },
  label: { fontSize: 9, letterSpacing: 0.2, marginTop: 1 },
  burgerIconWrap: { width: 40, height: 24, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
});

// ── Burger sheet modal ─────────────────────────────────────────────────────────
function BurgerSheet({
  visible, onClose, currentRoute, onNavigate, primaryTabs, onPrimaryTabsChange, colors, isDark, canUseSocials, language,
}: {
  visible: boolean;
  onClose: () => void;
  currentRoute: string;
  onNavigate: (name: string) => void;
  primaryTabs: string[];
  onPrimaryTabsChange: (tabs: string[]) => void;
  colors: ReturnType<typeof useColors>;
  isDark: boolean;
  canUseSocials: boolean;
  language: 'fr' | 'en';
}) {
  const insets = useSafeAreaInsets();
  const [customizing, setCustomizing] = useState(false);
  const [draftTabs, setDraftTabs] = useState(primaryTabs);
  const { t } = useLocalization();
  const orderedMenuTabs = [
    ...primaryTabs,
    ...ALL_TABS
      .filter((tabName) => !primaryTabs.includes(tabName))
       .sort((a, b) => t(TAB_META[a]!.labelKey).localeCompare(t(TAB_META[b]!.labelKey), language)),
  ];

  useEffect(() => {
    if (visible) {
      setDraftTabs(primaryTabs);
      setCustomizing(false);
    }
  }, [visible, primaryTabs]);

  const togglePrimaryTab = (tabName: string) => {
    if (draftTabs.includes(tabName)) {
      if (draftTabs.length <= 1) return;
      setDraftTabs(draftTabs.filter((name) => name !== tabName));
    } else if (draftTabs.length < 5) {
      setDraftTabs([...draftTabs, tabName]);
    }
  };

  const saveCustomization = () => {
    if (draftTabs.length !== 5) return;
    onPrimaryTabsChange(draftTabs);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setCustomizing(false);
  };

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
            <Text style={[bs.headerEye, { fontFamily: SANS_MEDIUM }]}>{t('navigation.navigation')}</Text>
            <Text style={[bs.headerTitle, { fontFamily: SERIF }]}>The Nuptial Plan</Text>
            <Text style={[bs.headerHint, { fontFamily: SANS }]}>{t('navigation.menuIntro')}</Text>
          </LinearGradient>
          <TouchableOpacity onPress={onClose} style={bs.closeBtn} activeOpacity={0.7}>
            <Feather name="x" size={18} color={colors.mutedForeground} />
          </TouchableOpacity>
        </View>

        {!customizing ? (
          <TouchableOpacity
            onPress={() => setCustomizing(true)}
            activeOpacity={0.75}
            style={[bs.customizeButton, { backgroundColor: colors.plum + '12', borderColor: colors.plum + '30' }]}
          >
            <View style={[bs.customizeIcon, { backgroundColor: colors.plum + '18' }]}>
              <Feather name="sliders" size={17} color={colors.plum} />
            </View>
            <View style={bs.customizeText}>
              <Text style={[bs.customizeTitle, { color: colors.foreground, fontFamily: SANS_SEMIBOLD }]}>
                 {t('navigation.customizeBottomMenu')}
              </Text>
              <Text style={[bs.customizeHint, { color: colors.mutedForeground, fontFamily: SANS }]}>
                 {t('navigation.chooseFiveTabs')}
              </Text>
            </View>
            <Feather name="chevron-right" size={17} color={colors.plum} />
          </TouchableOpacity>
        ) : (
          <View style={[bs.customizePanel, { backgroundColor: colors.plum + '08', borderColor: colors.plum + '25' }]}>
            <View style={bs.customizePanelHeader}>
              <TouchableOpacity onPress={() => setCustomizing(false)} style={bs.backButton} activeOpacity={0.7}>
                <Feather name="arrow-left" size={16} color={colors.plum} />
              </TouchableOpacity>
              <View style={bs.customizeText}>
                <Text style={[bs.customizeTitle, { color: colors.foreground, fontFamily: SANS_SEMIBOLD }]}>
                   {t('navigation.bottomMenu')}
                </Text>
                <Text style={[bs.customizeHint, { color: colors.mutedForeground, fontFamily: SANS }]}>
                   {draftTabs.length}/5 {t('navigation.tabsSelected')}
                </Text>
              </View>
              <TouchableOpacity
                onPress={saveCustomization}
                disabled={draftTabs.length !== 5}
                style={[bs.saveButton, { backgroundColor: draftTabs.length === 5 ? colors.plum : colors.muted }]}
              >
                 <Text style={[bs.saveButtonText, { fontFamily: SANS_SEMIBOLD }]}>{t('common.save')}</Text>
              </TouchableOpacity>
            </View>
            <Text style={[bs.selectionHint, { color: colors.mutedForeground, fontFamily: SANS }]}>
               {t('navigation.chooseTabs')}
            </Text>
            <ScrollView
              style={bs.selectionScroll}
              contentContainerStyle={bs.selectionList}
              showsVerticalScrollIndicator
              nestedScrollEnabled
              keyboardShouldPersistTaps="handled"
            >
              {ALL_TABS.map((tabName) => {
                const selected = draftTabs.includes(tabName);
                return (
                  <TouchableOpacity
                    key={tabName}
                    onPress={() => togglePrimaryTab(tabName)}
                    activeOpacity={0.75}
                    accessibilityRole="checkbox"
                    accessibilityLabel={t(TAB_META[tabName]!.labelKey)}
                    accessibilityHint={t(TAB_META[tabName]!.descriptionKey)}
                    accessibilityState={{ checked: selected }}
                    style={[bs.selectionRow, { borderBottomColor: colors.border }]}
                  >
                    <View style={[bs.selectionIcon, { backgroundColor: selected ? colors.plum + '18' : colors.background }]}>
                      <TabIcon
                        name={TAB_META[tabName]!.sf}
                        feather={TAB_META[tabName]!.feather}
                        size={17}
                        color={selected ? colors.plum : colors.mutedForeground}
                      />
                    </View>
                    <View style={bs.selectionText}>
                      <Text style={[bs.selectionLabel, { color: colors.foreground, fontFamily: selected ? SANS_SEMIBOLD : SANS }]}>
                        {t(TAB_META[tabName]!.labelKey)}
                      </Text>
                      <Text style={[bs.selectionDescription, { color: colors.mutedForeground, fontFamily: SANS }]} numberOfLines={2}>
                        {t(TAB_META[tabName]!.descriptionKey)}
                      </Text>
                    </View>
                    {PREMIUM_TABS.has(tabName) && <PremiumBadge variant="icon" />}
                    <View style={[bs.checkbox, { borderColor: selected ? colors.plum : colors.border, backgroundColor: selected ? colors.plum : 'transparent' }]}>
                      {selected ? <Feather name="check" size={12} color="#fff" /> : null}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        )}

        {/* Grid of all tabs */}
        {!customizing && (
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={bs.grid}
          >
            {orderedMenuTabs.map((tabName) => {
            const meta = TAB_META[tabName]!;
            const isActive = currentRoute === tabName;
            const isPrimary = primaryTabs.includes(tabName);
            const socialsLocked = tabName === 'mes-reseaux' && !canUseSocials;

            return (
              <TouchableOpacity
                key={tabName}
                onPress={() => { if (!socialsLocked) onNavigate(tabName); }}
                activeOpacity={0.75}
                disabled={socialsLocked}
                accessibilityRole="button"
                accessibilityLabel={t(meta.labelKey)}
                accessibilityHint={t(meta.descriptionKey)}
                style={[
                  bs.gridItem,
                  {
                    opacity: socialsLocked ? 0.38 : 1,
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

                <View style={bs.gridTitleRow}>
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
                    {t(meta.labelKey)}
                  </Text>
                  {PREMIUM_TABS.has(tabName) && <PremiumBadge variant="icon" />}
                </View>
                <Text style={[bs.gridDescription, { color: colors.mutedForeground, fontFamily: SANS }]} numberOfLines={2}>
                  {t(meta.descriptionKey)}
                </Text>

                {/* "Principal" badge for primary tabs */}
                {isPrimary && (
                  <Text style={[bs.primaryBadge, { color: colors.goldDim, fontFamily: SANS }]}>
                     {t('navigation.primary')}
                  </Text>
                )}
              </TouchableOpacity>
            );
            })}
          </ScrollView>
        )}
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
  headerHint: { fontSize: 10, lineHeight: 14, color: 'rgba(251,245,251,0.78)', marginTop: 6, maxWidth: 260 },
  closeBtn: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.06)', marginTop: 4 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  gridItem: { width: '47%', borderRadius: 14, padding: 12, gap: 7, borderWidth: 1, overflow: 'hidden' },
  activeBar: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 3, borderRadius: 2 },
  iconWrap: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  gridTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  gridLabel: { flex: 1, fontSize: 13 },
  gridDescription: { minHeight: 26, fontSize: 9, lineHeight: 13 },
  primaryBadge: { fontSize: 9, letterSpacing: 0.3 },
  customizeButton: { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderRadius: 14, padding: 12, marginBottom: 12 },
  customizeIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  customizeText: { flex: 1, gap: 3 },
  customizeTitle: { fontSize: 12 },
  customizeHint: { fontSize: 10, lineHeight: 14 },
  customizePanel: { borderWidth: 1, borderRadius: 14, padding: 12, marginBottom: 12 },
  customizePanelHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  backButton: { width: 30, height: 30, borderRadius: 9, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(128,128,128,0.10)' },
  saveButton: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8 },
  saveButtonText: { color: '#fff', fontSize: 10 },
  selectionHint: { fontSize: 10, lineHeight: 14, marginTop: 10, marginBottom: 5 },
  selectionScroll: { maxHeight: 420, flexShrink: 1 },
  selectionList: { marginTop: 2, paddingBottom: 2 },
  selectionRow: { minHeight: 62, flexDirection: 'row', alignItems: 'center', gap: 10, borderBottomWidth: StyleSheet.hairlineWidth },
  selectionIcon: { width: 30, height: 30, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  selectionText: { flex: 1, gap: 2 },
  selectionLabel: { fontSize: 11 },
  selectionDescription: { fontSize: 9, lineHeight: 12 },
  checkbox: { width: 21, height: 21, borderRadius: 6, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
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
      <Tabs.Screen name="moodboards" />
      <Tabs.Screen name="business" />
      <Tabs.Screen name="carnet-adresse" />
      <Tabs.Screen name="retroplanning" />
      <Tabs.Screen name="jour-j" />
      <Tabs.Screen name="mes-reseaux" />
      <Tabs.Screen name="mes-reservations" />
      <Tabs.Screen name="mes-rendez-vous" />
    </Tabs>
  );
}

/**
 * Warm the first-visit data for the two most-used, data-heavy tabs after the
 * dashboard has rendered. React Query deduplicates these requests if a planner
 * opens either tab before the prefetch finishes.
 */
function TabDataWarmer() {
  const queryClient = useQueryClient();
  const { weddingId } = useActiveWedding();
  const { isActive } = useSubscription();
  const { getToken } = useAuth();

  useEffect(() => {
    if (!weddingId || weddingId <= 0) return;

    const task = InteractionManager.runAfterInteractions(() => {
      void queryClient.prefetchQuery(
        getGetBudgetSummaryQueryOptions(weddingId, {
          query: {
            queryKey: getGetBudgetSummaryQueryKey(weddingId),
            staleTime: MOBILE_TAB_STALE_TIME,
            gcTime: 30 * 60 * 1000,
          },
        }),
      );

      if (isActive) {
        void queryClient.prefetchQuery(
          getListGuestsQueryOptions(weddingId, {
            query: {
              queryKey: getListGuestsQueryKey(weddingId),
              staleTime: MOBILE_TAB_STALE_TIME,
              gcTime: 30 * 60 * 1000,
            },
          }),
        );
        void queryClient.prefetchQuery(
          getListPaymentsQueryOptions(weddingId, {
            query: {
              queryKey: getListPaymentsQueryKey(weddingId),
              staleTime: MOBILE_TAB_STALE_TIME,
              gcTime: 30 * 60 * 1000,
            },
          }),
        );
        void queryClient.prefetchQuery(
          getListContractsQueryOptions(weddingId, {
            query: {
              queryKey: getListContractsQueryKey(weddingId),
              staleTime: MOBILE_TAB_STALE_TIME,
              gcTime: 30 * 60 * 1000,
            },
          }),
        );
        void queryClient.prefetchQuery(
          getListAddressBookEntriesQueryOptions({
            query: {
              queryKey: getListAddressBookEntriesQueryKey(),
              staleTime: MOBILE_TAB_STALE_TIME,
              gcTime: 30 * 60 * 1000,
            },
          }),
        );
        void queryClient.prefetchQuery(
          getWeddingDocumentsQueryOptions(weddingId, getToken),
        );
      }
    });

    return () => task.cancel();
  }, [getToken, isActive, queryClient, weddingId]);

  return null;
}

// ── Root layout ────────────────────────────────────────────────────────────────
export default function TabLayout() {
  const colors = useColors();
  const { isSignedIn } = useAuth();
  const pathname = usePathname();
  const pathnameParts = pathname.split('/').filter(Boolean);
  const activeTab = pathnameParts[pathnameParts.length - 1] === '(tabs)'
    ? 'index'
    : pathnameParts[pathnameParts.length - 1] ?? 'index';

  if (!isSignedIn) {
    return <Redirect href="/(auth)/sign-in" />;
  }

  return (
    <SafeAreaView
      edges={['top']}
      style={{ flex: 1, backgroundColor: colors.plumDark }}
    >
      <TabDataWarmer />
      <ClassicTabLayout />
      {!pathname.includes('/parametres') && <NuptiaSheet />}
      {!pathname.includes('/parametres') && <GlobalTourHelp routeName={activeTab} />}
    </SafeAreaView>
  );
}
