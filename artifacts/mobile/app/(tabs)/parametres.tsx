import React, { useState } from 'react';
import {
  ScrollView, View, Text, StyleSheet, Platform,
  TouchableOpacity, Alert, Switch, Linking,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import {
  useListWeddings,
  useDeleteWedding,
  getListWeddingsQueryKey,
} from '@workspace/api-client-react';
import { useWedding } from '@/context/WeddingContext';
import { useColors } from '@/hooks/useColors';
import { SERIF, SANS, SANS_MEDIUM, SANS_SEMIBOLD } from '@/constants/fonts';
import { shadow, accentShadow } from '@/utils/shadow';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSubscription } from '@/lib/subscription';

// ── Row item ─────────────────────────────────────────────────────────────────
function RowItem({ icon, label, value, iconBg, iconColor, onPress, rightElement, colors, destructive = false }: {
  icon: string;
  label: string;
  value?: string;
  iconBg: string;
  iconColor: string;
  onPress?: () => void;
  rightElement?: React.ReactNode;
  colors: ReturnType<typeof useColors>;
  destructive?: boolean;
}) {
  return (
    <TouchableOpacity
      activeOpacity={onPress ? 0.72 : 1}
      onPress={onPress}
      style={[ps.row, { borderBottomColor: colors.border }]}
    >
      <View style={[ps.rowIcon, { backgroundColor: iconBg }]}>
        <Feather name={icon as any} size={15} color={iconColor} />
      </View>
      <Text style={[ps.rowLabel, { fontFamily: SANS, color: destructive ? colors.roseDark : colors.foreground }]}>
        {label}
      </Text>
      {value ? (
        <Text style={[ps.rowValue, { fontFamily: SANS_MEDIUM, color: colors.mutedForeground }]}>{value}</Text>
      ) : null}
      {rightElement ?? (
        onPress ? <Feather name="chevron-right" size={14} color={destructive ? colors.roseDark + '88' : colors.goldDim} /> : null
      )}
    </TouchableOpacity>
  );
}

// ── Section header ────────────────────────────────────────────────────────────
function SectionHeader({ label, colors }: { label: string; colors: ReturnType<typeof useColors> }) {
  return (
    <Text style={[ps.section, { fontFamily: SANS_SEMIBOLD, color: colors.mutedForeground }]}>
      {label}
    </Text>
  );
}

// ── Group card ────────────────────────────────────────────────────────────────
function Group({ children, colors }: { children: React.ReactNode; colors: ReturnType<typeof useColors> }) {
  return (
    <View style={[ps.group, shadow('sm'), { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={[ps.rim, { borderTopColor: 'rgba(255,255,255,0.70)' }]} />
      {children}
    </View>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────
export default function ParametresScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const topPad = Platform.OS === 'web' ? 67 : 0;

  const { selectedWeddingId, selectWedding } = useWedding();
  const queryClient = useQueryClient();

  const { data: weddings } = useListWeddings();
  const activeWedding = weddings?.find((w) => w.id === selectedWeddingId) ?? weddings?.[0];
  const deleteWedding = useDeleteWedding();

  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const subscription = useSubscription();

  React.useEffect(() => {
    const key = '@nuptial-plan/first-opened-at';
    void AsyncStorage.getItem(key).then(async (value) => {
      const firstOpenedAt = value ? Number(value) : Date.now();
      if (!value) await AsyncStorage.setItem(key, String(firstOpenedAt));
      const days = Math.floor((Date.now() - firstOpenedAt) / 86_400_000);
      if (days < 5) return;

      const promptKey = '@nuptial-plan/review-prompt-shown';
      const promptShown = await AsyncStorage.getItem(promptKey);
      if (promptShown) return;

      // Persist before displaying the alert so it is only shown once,
      // including if the user chooses not to leave a review.
      await AsyncStorage.setItem(promptKey, 'true');
      Alert.alert(
        'Votre avis compte',
        'Après quelques jours avec The Nuptial Plan, souhaitez-vous nous laisser une note ou un avis sur l’App Store ?',
        [
          { text: 'Plus tard', style: 'cancel' },
          { text: 'Laisser un avis', onPress: openReview },
        ],
      );
    });
  }, []);

  const reportBug = () => router.push('/bug-report' as never);

  const openReview = () => {
    const url = Platform.OS === 'android'
      ? 'market://details?id=com.thenuptialplan.mobile'
      : 'https://apps.apple.com/fr/search?term=The%20Nuptial%20Plan';
    void Linking.openURL(url).catch(() => Linking.openURL('https://apps.apple.com/fr/search?term=The%20Nuptial%20Plan'));
  };

  const openLegal = (path: 'privacy' | 'policy') => {
    router.push(`/legal/${path}` as never);
  };

  const handleDeleteWedding = () => {
    if (!activeWedding) return;

    Alert.alert(
      'Supprimer ce dossier',
      `Toutes les données de "${activeWedding.names}" seront définitivement supprimées (invités, prestataires, budget, paiements…). Cette action est irréversible.`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer définitivement',
          style: 'destructive',
          onPress: () => {
            deleteWedding.mutate(
              { id: activeWedding.id },
              {
                onSuccess: () => {
                  queryClient.invalidateQueries({ queryKey: getListWeddingsQueryKey() });
                  // Select next available wedding or clear selection
                  const remaining = (weddings ?? []).filter((w) => w.id !== activeWedding.id);
                  selectWedding(remaining[0]?.id ?? 0);
                  Alert.alert('Dossier supprimé', `Le mariage "${activeWedding.names}" a été supprimé.`);
                },
                onError: () => {
                  Alert.alert('Erreur', 'Impossible de supprimer ce dossier. Réessayez.');
                },
              },
            );
          },
        },
      ],
    );
  };

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{ paddingBottom: 160 }}
      showsVerticalScrollIndicator={false}
    >
      {/* ── Hero ──────────────────────────────────────────────────────────── */}
      <LinearGradient
        colors={[colors.plumDark, colors.plum, colors.plumLight]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[ps.hero, { paddingTop: topPad + 24 }]}
      >
        <View style={{ position: 'absolute', top: -20, right: -20, width: 120, height: 120, borderRadius: 60, backgroundColor: colors.rose + '20' }} pointerEvents="none" />
        <View style={{ position: 'absolute', bottom: -10, left: -20, width: 90, height: 90, borderRadius: 45, backgroundColor: colors.gold + '18' }} pointerEvents="none" />
        <LinearGradient colors={['rgba(255,255,255,0.08)', 'transparent']} style={ps.heroSheen} pointerEvents="none" />
        <View style={ps.goldBar} />

        <View style={[ps.settingsIcon, accentShadow('md')]}>
          <LinearGradient colors={[colors.gold, colors.goldDim]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={ps.settingsIconGrad}>
            <Feather name="settings" size={22} color="#3C1A3C" />
          </LinearGradient>
        </View>
        <Text style={[ps.heroTitle, { fontFamily: SERIF }]}>Paramètres</Text>
        <Text style={[ps.heroSub, { fontFamily: SANS }]}>L'indispensable du Wedding Planner</Text>
      </LinearGradient>

      <View style={{ paddingHorizontal: 16 }}>

        {/* ── Dossier de mariage actif ────────────────────────────────────── */}
        {activeWedding && (
          <>
            <SectionHeader label="DOSSIER DE MARIAGE" colors={colors} />
            <View style={[ps.weddingCard, shadow('md'), { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={[ps.rim, { borderTopColor: 'rgba(255,255,255,0.70)' }]} />

              <View style={ps.weddingCardTop}>
                <View>
                  <Text style={[ps.weddingCardEye, { fontFamily: SANS_SEMIBOLD, color: colors.goldDim }]}>MARIAGE ACTIF</Text>
                  <Text style={[ps.weddingCardNames, { fontFamily: SERIF, color: colors.foreground }]}>{activeWedding.names}</Text>
                </View>
                <View style={[ps.activePill, { backgroundColor: colors.successBg }]}>
                  <Text style={[ps.activePillText, { fontFamily: SANS_SEMIBOLD, color: colors.success }]}>Actif</Text>
                </View>
              </View>

              <View style={[ps.weddingStats, { borderTopColor: colors.border }]}>
                {[
                  { icon: 'calendar', value: new Date(activeWedding.weddingDate).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }) },
                  { icon: 'map-pin', value: activeWedding.venue },
                  { icon: 'users', value: `${activeWedding.guestCount} invités` },
                ].map((item) => (
                  <View key={item.icon} style={ps.weddingStatRow}>
                    <Feather name={item.icon as any} size={13} color={colors.goldDim} />
                    <Text style={[ps.weddingStatText, { fontFamily: SANS, color: colors.mutedForeground }]} numberOfLines={1}>
                      {item.value}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          </>
        )}

        {/* ── Préférences application ─────────────────────────────────────── */}
        <SectionHeader label="APPLICATION" colors={colors} />
        <Group colors={colors}>
          <RowItem
            icon="bell"
            label="Notifications"
            iconBg={colors.goldLight}
            iconColor={colors.goldDim}
            colors={colors}
            rightElement={
              <Switch
                value={notificationsEnabled}
                onValueChange={setNotificationsEnabled}
                trackColor={{ false: colors.border, true: colors.plum + '88' }}
                thumbColor={notificationsEnabled ? colors.plum : colors.mutedForeground}
              />
            }
          />
          <RowItem
            icon="help-circle"
            label="Aide & support"
            iconBg={colors.sageBg}
            iconColor={colors.sageDark}
            colors={colors}
            onPress={() =>
              Alert.alert('Aide & support', 'Pour toute assistance, contactez-nous à contact@thenuptialplan.com', [{ text: 'OK' }])
            }
          />
          <RowItem
            icon="alert-circle"
            label="Signaler un bug"
            value="Envoyer un rapport"
            iconBg={colors.roseBg}
            iconColor={colors.roseDark}
            colors={colors}
            onPress={reportBug}
          />
          <RowItem
            icon="star"
            label="Laisser un avis"
            value="App Store"
            iconBg={colors.goldLight}
            iconColor={colors.goldDim}
            colors={colors}
            onPress={openReview}
          />
          <RowItem
            icon="info"
            label="Version"
            value="1.0.0"
            iconBg={colors.muted}
            iconColor={colors.mutedForeground}
            colors={colors}
          />
        </Group>

        <SectionHeader label="ABONNEMENT" colors={colors} />
        <Group colors={colors}>
          <View style={{ padding: 16, gap: 10 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <View style={[ps.rowIcon, { backgroundColor: colors.goldLight }]}>
                <Feather name="star" size={15} color={colors.goldDim} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[ps.rowLabel, { fontFamily: SANS_SEMIBOLD, color: colors.foreground }]}>The Nuptial Plan Premium</Text>
                <Text style={[{ fontSize: 11, lineHeight: 16 }, { fontFamily: SANS, color: colors.mutedForeground }]}>
                  {subscription.isActive ? (subscription.isTrialing ? 'Votre essai gratuit est actif.' : 'Votre abonnement est actif.') : 'Un mois d’essai gratuit inclus.'}
                </Text>
              </View>
            </View>
            {subscription.offerings?.current?.availablePackages?.map((pkg: any) => (
              <TouchableOpacity
                key={pkg.identifier}
                disabled={subscription.loading}
                onPress={() => void subscription.purchase(pkg)}
                style={[ps.subscriptionOption, { borderColor: colors.border, backgroundColor: colors.background }]}
              >
                <View style={{ flex: 1 }}>
                  <Text style={[ps.subscriptionPlan, { fontFamily: SANS_SEMIBOLD, color: colors.foreground }]}>
                    {pkg.packageType === 'ANNUAL' ? 'Annuel' : 'Mensuel'}
                  </Text>
                  <Text style={[ps.subscriptionPrice, { fontFamily: SANS, color: colors.mutedForeground }]}>
                    {pkg.product.priceString}
                  </Text>
                </View>
                <Feather name="chevron-right" size={14} color={colors.goldDim} />
              </TouchableOpacity>
            ))}
            {!subscription.available && (
              <Text style={[{ fontSize: 11, lineHeight: 16 }, { fontFamily: SANS, color: colors.mutedForeground }]}>
                Les achats intégrés seront disponibles après la configuration App Store et Google Play.
              </Text>
            )}
            {subscription.isActive && (
              <TouchableOpacity
                onPress={() => {
                  const url = Platform.OS === 'android'
                    ? `https://play.google.com/store/account/subscriptions?sku=${subscription.productIdentifier ?? 'tnp_premium_monthly'}&package=com.thenuptialplan.mobile`
                    : 'itms-apps://apps.apple.com/account/subscriptions';
                  void Linking.openURL(url);
                }}
                style={[ps.manageButton, { backgroundColor: colors.plum + '14', borderColor: colors.plum + '30' }]}
              >
                <Feather name="external-link" size={13} color={colors.plum} />
                <Text style={[ps.manageText, { fontFamily: SANS_SEMIBOLD, color: colors.plum }]}>Gérer mon abonnement</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity onPress={() => void subscription.restore()} disabled={subscription.loading} style={ps.restoreButton}>
              <Text style={[ps.restoreText, { fontFamily: SANS_SEMIBOLD, color: colors.plum }]}>Restaurer mes achats</Text>
            </TouchableOpacity>
          </View>
        </Group>

        <SectionHeader label="INFORMATIONS LÉGALES" colors={colors} />
        <Group colors={colors}>
          <RowItem icon="shield" label="Politique de confidentialité" iconBg={colors.sageBg} iconColor={colors.sageDark} colors={colors} onPress={() => openLegal('privacy')} />
          <RowItem icon="file-text" label="Conditions générales d’utilisation" iconBg={colors.muted} iconColor={colors.mutedForeground} colors={colors} onPress={() => openLegal('policy')} />
        </Group>

        {/* ── Zone danger ─────────────────────────────────────────────────── */}
        {activeWedding && (
          <>
            <SectionHeader label="ZONE DANGER" colors={colors} />
            <Group colors={colors}>
              <TouchableOpacity
                activeOpacity={0.72}
                onPress={handleDeleteWedding}
                style={[ps.row, { borderBottomColor: 'transparent' }]}
                disabled={deleteWedding.isPending}
              >
                <View style={[ps.rowIcon, { backgroundColor: colors.roseBg }]}>
                  <Feather name="trash-2" size={15} color={colors.roseDark} />
                </View>
                <Text style={[ps.rowLabel, { fontFamily: SANS, color: colors.roseDark }]}>
                  {deleteWedding.isPending ? 'Suppression…' : 'Supprimer ce dossier'}
                </Text>
                <Feather name="chevron-right" size={14} color={colors.roseDark + '88'} />
              </TouchableOpacity>
            </Group>
            <Text style={[ps.dangerHint, { fontFamily: SANS, color: colors.mutedForeground }]}>
              La suppression est définitive et irréversible. Toutes les données liées à ce mariage seront perdues.
            </Text>
          </>
        )}

      </View>
    </ScrollView>
  );
}

const ps = StyleSheet.create({
  hero: { paddingHorizontal: 20, paddingBottom: 32, alignItems: 'center', overflow: 'hidden' },
  heroSheen: { ...StyleSheet.absoluteFillObject, height: 100 },
  goldBar: { position: 'absolute', top: 0, left: 0, right: 0, height: 1.5, backgroundColor: 'rgba(200,170,112,0.35)' },
  settingsIcon: { marginBottom: 16 },
  settingsIconGrad: { width: 62, height: 62, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  heroTitle: { fontSize: 32, color: '#FBF5FB', marginBottom: 6 },
  heroSub: { fontSize: 11, color: '#8eacaa', letterSpacing: 0.3 },
  section: { fontSize: 9, letterSpacing: 1.5, marginTop: 24, marginBottom: 8 },
  group: { borderRadius: 12, borderWidth: StyleSheet.hairlineWidth, overflow: 'hidden' },
  rim: { position: 'absolute', left: 0, right: 0, top: 0, height: 1, borderTopWidth: 1 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth },
  rowIcon: { width: 32, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  rowLabel: { flex: 1, fontSize: 13 },
  rowValue: { fontSize: 12, marginRight: 4 },
  weddingCard: { borderRadius: 12, borderWidth: StyleSheet.hairlineWidth, overflow: 'hidden', marginTop: 8 },
  weddingCardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', padding: 14 },
  weddingCardEye: { fontSize: 8, letterSpacing: 1.4, marginBottom: 3 },
  weddingCardNames: { fontSize: 20, lineHeight: 22 },
  activePill: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  activePillText: { fontSize: 10 },
  weddingStats: { borderTopWidth: StyleSheet.hairlineWidth, paddingHorizontal: 14, paddingVertical: 12, gap: 8 },
  weddingStatRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  weddingStatText: { fontSize: 12, flex: 1 },
  dangerHint: { fontSize: 11, lineHeight: 15, marginTop: 8, paddingHorizontal: 4, opacity: 0.7 },
  subscriptionOption: { minHeight: 52, borderWidth: StyleSheet.hairlineWidth, borderRadius: 10, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center' },
  subscriptionPlan: { fontSize: 12 },
  subscriptionPrice: { fontSize: 11, marginTop: 2 },
  manageButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderWidth: StyleSheet.hairlineWidth, borderRadius: 10, paddingVertical: 10 },
  manageText: { fontSize: 12 },
  restoreButton: { alignItems: 'center', paddingVertical: 7 },
  restoreText: { fontSize: 11 },
});
