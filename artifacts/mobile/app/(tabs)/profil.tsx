import React, { useState } from 'react';
import {
  ScrollView, View, Text, StyleSheet, Platform, TouchableOpacity, Alert, Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useClerk, useUser } from '@clerk/expo';
import { useListWeddings, useGetWeddingSummary } from '@workspace/api-client-react';
import { useWedding } from '@/context/WeddingContext';
import { useColors } from '@/hooks/useColors';
import { useTour } from '@/hooks/useTour';
import { SERIF, SANS, SANS_MEDIUM, SANS_SEMIBOLD } from '@/constants/fonts';
import { formatCents } from '@/utils/format';
import { shadow, accentShadow } from '@/utils/shadow';
import { TourSheet, TourHelpFab } from '@/components/TourSheet';
import { ProfileEditSheet } from '@/components/ProfileEditSheet';

const TOUR_STEPS = [
  {
    icon: 'user',
    title: 'Votre profil',
    description: 'Cet écran regroupe vos informations de planificatrice, le mariage actif et les raccourcis vers les principales sections de l\'application.',
  },
  {
    icon: 'heart',
    title: 'Mariage actif',
    description: 'La carte en haut résume le mariage sélectionné : nombre d\'invités, prestataires et budget total. Appuyez dessus pour changer de mariage.',
  },
  {
    icon: 'grid',
    title: 'Accès rapide',
    description: 'La section Gestion vous permet d\'accéder directement aux invités, prestataires et contrats sans passer par les onglets.',
  },
  {
    icon: 'settings',
    title: 'Paramètres & aide',
    description: 'Gérez vos préférences de notifications et accédez au support depuis la section Application en bas de cet écran.',
  },
];

function RowItem({ icon, label, value, variant = 'default', colors, onPress }: {
  icon: string; label: string; value?: string;
  variant?: 'default' | 'gold' | 'sage' | 'rose';
  colors: ReturnType<typeof useColors>;
  onPress?: () => void;
}) {
  const iconBg = variant === 'gold' ? colors.goldLight
    : variant === 'sage' ? colors.sageBg
    : variant === 'rose' ? colors.roseBg
    : colors.background;
  const iconColor = variant === 'gold' ? colors.goldDim
    : variant === 'sage' ? colors.sageDark
    : variant === 'rose' ? colors.roseDark
    : colors.mutedForeground;

  return (
    <TouchableOpacity
      activeOpacity={onPress ? 0.7 : 1}
      onPress={onPress}
      style={[ss.row, { borderBottomColor: colors.border }]}
    >
      <View style={[ss.rowIcon, { backgroundColor: iconBg }]}>
        <Feather name={icon as any} size={15} color={iconColor} />
      </View>
      <Text style={[ss.rowLabel, { fontFamily: SANS, color: colors.foreground }]}>{label}</Text>
      {value ? <Text style={[ss.rowValue, { fontFamily: SANS_MEDIUM, color: colors.mutedForeground }]}>{value}</Text> : null}
      <Feather name="chevron-right" size={14} color={onPress ? colors.goldDim : colors.border} />
    </TouchableOpacity>
  );
}

export default function ProfilScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { signOut } = useClerk();
  const { user } = useUser();
  const { selectedWeddingId } = useWedding();
  const topPad = Platform.OS === 'web' ? 67 : insets.top;
  const { tourVisible, openTour, closeTour } = useTour('tour:profil');

  // Derive display values from Clerk user
  const displayName = user?.fullName
    || (user?.firstName ? user.firstName : null)
    || user?.primaryEmailAddress?.emailAddress?.split('@')[0]
    || 'Planificatrice';

  const initials = (() => {
    if (user?.firstName && user?.lastName) {
      return `${user.firstName[0]}${user.lastName[0]}`.toUpperCase();
    }
    if (user?.firstName) {
      return user.firstName.slice(0, 2).toUpperCase();
    }
    const email = user?.primaryEmailAddress?.emailAddress;
    if (email) return email.slice(0, 2).toUpperCase();
    return 'NP';
  })();

  const userEmail = user?.primaryEmailAddress?.emailAddress ?? null;
  // user.imageUrl is kept fresh by ProfileEditSheet calling user.reload() after
  // every save. Any new avatar display site should read from useUser() directly
  // rather than caching the URL locally, so it benefits from the same reload.
  const avatarUrl = user?.imageUrl ?? null;

  const [editVisible, setEditVisible] = useState(false);

  const handleSignOut = () => {
    Alert.alert(
      'Se déconnecter',
      'Êtes-vous sûre de vouloir vous déconnecter\u00a0?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Se déconnecter',
          style: 'destructive',
          onPress: () => signOut(),
        },
      ],
    );
  };

  const { data: weddings } = useListWeddings();
  const activeWedding = weddings?.find((w) => w.id === selectedWeddingId) ?? weddings?.[0];
  const wId = activeWedding?.id ?? 0;

  const { data: summary } = useGetWeddingSummary(wId);

  const showComingSoon = (feature: string) =>
    Alert.alert(feature, 'Cette fonctionnalité sera disponible dans une prochaine version.', [{ text: 'OK' }]);

  const showWebOnly = (feature: string) =>
    Alert.alert(feature, 'Gérez vos ' + feature.toLowerCase() + ' depuis l\'application web.', [{ text: 'OK' }]);

  const fabBottom = Platform.OS === 'web' ? 94 : insets.bottom + 84;

  return (
    <>
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{ paddingBottom: 100 }}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      {/* Profile hero */}
      <LinearGradient
        colors={[colors.plumDark, colors.plum, colors.plumLight]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[ss.hero, { paddingTop: topPad + 24 }]}
      >
        {/* Ambient botanical blobs */}
        <View style={{ position: 'absolute', top: -20, right: -20, width: 120, height: 120, borderRadius: 60, backgroundColor: colors.rose + '20' }} pointerEvents="none" />
        <View style={{ position: 'absolute', bottom: -10, left: -20, width: 90, height: 90, borderRadius: 45, backgroundColor: colors.gold + '18' }} pointerEvents="none" />
        <LinearGradient colors={['rgba(255,255,255,0.08)', 'transparent']} style={ss.heroSheen} pointerEvents="none" />
        <View style={ss.goldBar} />

        {/* Avatar — tappable to edit */}
        <TouchableOpacity
          onPress={() => setEditVisible(true)}
          activeOpacity={0.82}
          style={ss.avatarTouchable}
          accessibilityLabel="Modifier le profil"
        >
          <LinearGradient
            colors={[colors.gold + 'AA', colors.rose + '88', colors.plumLight + '66']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[ss.avatarRing, accentShadow('lg')]}
          >
            {avatarUrl ? (
              <Image source={{ uri: avatarUrl }} style={ss.avatarImage} />
            ) : (
              <View style={ss.avatarInner}>
                <Text style={[ss.avatarText, { fontFamily: SERIF }]}>{initials}</Text>
              </View>
            )}
          </LinearGradient>
          {/* Camera badge */}
          <View style={ss.cameraBadge}>
            <Feather name="camera" size={11} color="#FBF5FB" />
          </View>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => setEditVisible(true)} activeOpacity={0.75}>
          <Text style={[ss.name, { fontFamily: SERIF }]}>{displayName}</Text>
        </TouchableOpacity>
        {userEmail ? (
          <Text style={[ss.role, { fontFamily: SANS_MEDIUM }]}>{userEmail}</Text>
        ) : null}
        <Text style={[ss.brand, { fontFamily: SANS }]}>Pour que rien ne manque à votre bonheur</Text>
      </LinearGradient>

      <View style={{ paddingHorizontal: 16 }}>
        {/* Active wedding summary */}
        {activeWedding && (
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => router.push('/(tabs)/mariages')}
            style={[ss.summaryCard, shadow('md'), { backgroundColor: colors.card, borderColor: colors.border }]}
          >
            <View style={[ss.rim, { borderTopColor: 'rgba(255,255,255,0.65)' }]} />
            <View style={ss.summaryTop}>
              <View>
                <Text style={[ss.summaryEye, { fontFamily: SANS_SEMIBOLD, color: colors.goldDim }]}>MARIAGE ACTIF</Text>
                <Text style={[ss.summaryNames, { fontFamily: SERIF, color: colors.foreground }]}>{activeWedding.names}</Text>
              </View>
              <View style={[ss.summaryBadge, { backgroundColor: colors.successBg, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.success + '44' }]}>
                <Text style={[ss.summaryBadgeText, { fontFamily: SANS_SEMIBOLD, color: colors.success }]}>Actif</Text>
              </View>
            </View>
            {summary && (
              <View style={[ss.summaryStats, { borderTopColor: colors.border }]}>
                {[
                  { label: 'Invités', value: `${summary.confirmedGuests}/${summary.totalGuests}` },
                  { label: 'Prestataires', value: String(summary.vendorCount) },
                  { label: 'Budget', value: formatCents(summary.budgetTotal, activeWedding.currency) },
                ].map((s, i) => (
                  <View key={s.label} style={ss.summaryStat}>
                    {i > 0 && <View style={[ss.statDivider, { backgroundColor: colors.border }]} />}
                    <Text style={[ss.summaryStatVal, { fontFamily: SERIF, color: colors.foreground }]}>{s.value}</Text>
                    <Text style={[ss.summaryStatLabel, { fontFamily: SANS, color: colors.mutedForeground }]}>{s.label}</Text>
                  </View>
                ))}
              </View>
            )}
          </TouchableOpacity>
        )}

        {/* Quick actions — Gestion */}
        <Text style={[ss.section, { fontFamily: SANS_SEMIBOLD, color: colors.mutedForeground }]}>GESTION</Text>
        <View style={[ss.group, shadow('sm'), { backgroundColor: Platform.OS !== 'web' ? 'rgba(248,245,239,0.90)' : colors.card, borderColor: colors.border }]}>
          <View style={[ss.rim, { borderTopColor: 'rgba(255,255,255,0.70)' }]} />
          <RowItem
            icon="heart" label="Mes mariages" value={String(weddings?.length ?? 0)}
            variant="rose" colors={colors}
            onPress={() => router.push('/(tabs)/mariages')}
          />
          <RowItem
            icon="users" label="Invités" value={summary ? `${summary.totalGuests} invités` : undefined}
            variant="gold" colors={colors}
            onPress={() => router.push('/(tabs)/invites')}
          />
          <RowItem
            icon="briefcase" label="Prestataires" value={summary ? `${summary.vendorCount}` : undefined}
            variant="sage" colors={colors}
            onPress={() => router.push('/(tabs)/prestataires')}
          />
          <RowItem
            icon="credit-card" label="Paiements" colors={colors}
            onPress={() => router.push('/(tabs)/paiements')}
          />
          <RowItem
            icon="file-text" label="Contrats" colors={colors}
            onPress={() => showWebOnly('Contrats')}
          />
        </View>

        {/* Application */}
        <Text style={[ss.section, { fontFamily: SANS_SEMIBOLD, color: colors.mutedForeground }]}>APPLICATION</Text>
        <View style={[ss.group, shadow('sm'), { backgroundColor: Platform.OS !== 'web' ? 'rgba(248,245,239,0.90)' : colors.card, borderColor: colors.border }]}>
          <View style={[ss.rim, { borderTopColor: 'rgba(255,255,255,0.70)' }]} />
          <RowItem
            icon="settings" label="Paramètres" colors={colors}
            onPress={() => showComingSoon('Paramètres')}
          />
          <RowItem
            icon="bell" label="Notifications" colors={colors}
            onPress={() => showComingSoon('Notifications')}
          />
          <RowItem
            icon="help-circle" label="Aide & support" colors={colors}
            onPress={() =>
              Alert.alert('Aide & support', 'Pour toute assistance, contactez-nous à support@thenuptialplan.com', [{ text: 'OK' }])
            }
          />
        </View>

        {/* Compte */}
        <Text style={[ss.section, { fontFamily: SANS_SEMIBOLD, color: colors.mutedForeground }]}>COMPTE</Text>
        <View style={[ss.group, shadow('sm'), { backgroundColor: Platform.OS !== 'web' ? 'rgba(248,245,239,0.90)' : colors.card, borderColor: colors.border }]}>
          <View style={[ss.rim, { borderTopColor: 'rgba(255,255,255,0.70)' }]} />
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={handleSignOut}
            style={[ss.row, { borderBottomColor: 'transparent' }]}
          >
            <View style={[ss.rowIcon, { backgroundColor: colors.roseBg }]}>
              <Feather name="log-out" size={15} color={colors.roseDark} />
            </View>
            <Text style={[ss.rowLabel, { fontFamily: SANS, color: colors.roseDark }]}>Se déconnecter</Text>
            <Feather name="chevron-right" size={14} color={colors.roseDark + '88'} />
          </TouchableOpacity>
        </View>

        {/* App identity card */}
        <View style={ss.appInfo}>
          <View style={[ss.logoWrap, shadow('sm'), { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[ss.rim, { borderTopColor: 'rgba(255,255,255,0.75)' }]} />
            <LinearGradient
              colors={[colors.plumDark, colors.plum]}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
              style={ss.logoNGrad}
            >
              <Text style={[ss.logoNText, { fontFamily: SERIF }]}>N</Text>
            </LinearGradient>
            <Text style={[ss.logoLabel, { fontFamily: SERIF, color: colors.foreground }]}>The Nuptial Plan</Text>
            <Text style={[ss.version, { fontFamily: SANS, color: colors.tertiaryText }]}>Version 1.0.0 · Pour que rien ne manque à votre bonheur</Text>
          </View>
        </View>
      </View>
    </ScrollView>

    <TourHelpFab onPress={openTour} bottom={fabBottom} />
    <TourSheet visible={tourVisible} onClose={closeTour} steps={TOUR_STEPS} />
    <ProfileEditSheet visible={editVisible} onClose={() => setEditVisible(false)} />
    </>
  );
}

const ss = StyleSheet.create({
  hero: { paddingHorizontal: 20, paddingBottom: 28, alignItems: 'center', overflow: 'hidden' },
  heroSheen: { ...StyleSheet.absoluteFillObject, height: 100 },
  goldBar: { position: 'absolute', top: 0, left: 0, right: 0, height: 1.5, backgroundColor: 'rgba(200,170,112,0.35)' },
  avatarTouchable: { position: 'relative', marginBottom: 14 },
  cameraBadge: {
    position: 'absolute', bottom: 0, right: 0,
    width: 24, height: 24, borderRadius: 12,
    backgroundColor: '#5D2D5D', borderWidth: 2, borderColor: 'rgba(60,26,60,0.80)',
    alignItems: 'center', justifyContent: 'center',
  },
  avatarRing: { width: 84, height: 84, borderRadius: 42, alignItems: 'center', justifyContent: 'center', padding: 2 },
  avatarInner: { width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(60,26,60,0.55)', alignItems: 'center', justifyContent: 'center' },
  avatarImage: { width: 80, height: 80, borderRadius: 40 },
  avatarText: { fontSize: 34, color: '#C8A96E', lineHeight: 36 },
  name: { fontSize: 30, color: '#f8f3ea', marginBottom: 4 },
  role: { fontSize: 12, color: '#C8A96E', letterSpacing: 0.5, marginBottom: 2 },
  brand: { fontSize: 10, color: '#8eacaa', letterSpacing: 0.3 },
  rim: { position: 'absolute', left: 0, right: 0, top: 0, height: 1, borderTopWidth: 1 },
  summaryCard: { borderRadius: 12, borderWidth: StyleSheet.hairlineWidth, marginTop: 16, overflow: 'hidden' },
  summaryTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', padding: 14 },
  summaryEye: { fontSize: 8, letterSpacing: 1.4, marginBottom: 3 },
  summaryNames: { fontSize: 20, lineHeight: 22 },
  summaryBadge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  summaryBadgeText: { fontSize: 10 },
  summaryStats: { flexDirection: 'row', borderTopWidth: StyleSheet.hairlineWidth, paddingVertical: 12 },
  summaryStat: { flex: 1, alignItems: 'center', gap: 2, flexDirection: 'row', justifyContent: 'center' },
  statDivider: { width: StyleSheet.hairlineWidth, height: 32, marginRight: 0 },
  summaryStatVal: { fontSize: 20, lineHeight: 20 },
  summaryStatLabel: { fontSize: 9, marginLeft: 4 },
  section: { fontSize: 9, letterSpacing: 1.5, marginTop: 24, marginBottom: 8 },
  group: { borderRadius: 12, borderWidth: StyleSheet.hairlineWidth, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth },
  rowIcon: { width: 32, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  rowLabel: { flex: 1, fontSize: 13 },
  rowValue: { fontSize: 12, marginRight: 4 },
  appInfo: { alignItems: 'center', paddingTop: 24, paddingBottom: 8 },
  logoWrap: { borderRadius: 12, borderWidth: StyleSheet.hairlineWidth, padding: 18, alignItems: 'center', gap: 8, overflow: 'hidden', minWidth: 220 },
  logoNGrad: { width: 36, height: 36, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  logoNText: { fontSize: 22, lineHeight: 24, color: '#C8A96E' },
  logoLabel: { fontSize: 20 },
  version: { fontSize: 11 },
});
