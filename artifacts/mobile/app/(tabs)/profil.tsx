import React, { useState } from 'react';
import {
  ScrollView, View, Text, StyleSheet, Platform, TouchableOpacity, Alert, Image, Linking,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth, useClerk, useUser } from '@clerk/expo';
import { useListWeddings, useGetWeddingSummary } from '@workspace/api-client-react';
import { useWedding } from '@/context/WeddingContext';
import { useColors } from '@/hooks/useColors';
import { useTour } from '@/hooks/useTour';
import { SERIF, SANS, SANS_MEDIUM, SANS_SEMIBOLD } from '@/constants/fonts';
import { formatCents } from '@/utils/format';
import { shadow, accentShadow } from '@/utils/shadow';
import { TourSheet } from '@/components/TourSheet';
import { ProfileEditSheet } from '@/components/ProfileEditSheet';
import { PaywallModal } from '@/components/PaywallModal';
import { getLocalizedPackagePrice, isNativeStorePricingAvailable, useSubscription } from '@/lib/subscription';
import { getApiUrl } from '@/lib/apiUrl';
import logoImage from '@/assets/images/tnp-gold-logo.png';

const SOCIALS_ACCESS_EMAIL = 'e.tshibanda78@gmail.com';

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

function RowItem({ icon, label, value, variant = 'default', colors, onPress, disabled = false }: {
  icon: string; label: string; value?: string;
  variant?: 'default' | 'gold' | 'sage' | 'rose';
  colors: ReturnType<typeof useColors>;
  onPress?: () => void;
  disabled?: boolean;
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
      activeOpacity={disabled ? 1 : onPress ? 0.7 : 1}
      onPress={disabled ? undefined : onPress}
      disabled={disabled}
      style={[ss.row, { borderBottomColor: colors.border, opacity: disabled ? 0.38 : 1 }]}
    >
      <View style={[ss.rowIcon, { backgroundColor: iconBg }]}>
        <Feather name={icon as any} size={15} color={iconColor} />
      </View>
      <Text style={[ss.rowLabel, { fontFamily: SANS, color: colors.foreground }]}>{label}</Text>
      {value ? <Text style={[ss.rowValue, { fontFamily: SANS_MEDIUM, color: colors.mutedForeground }]}>{value}</Text> : null}
      <Feather name="chevron-right" size={14} color={disabled ? colors.border : onPress ? colors.goldDim : colors.border} />
    </TouchableOpacity>
  );
}

export default function ProfilScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { signOut } = useClerk();
  const { getToken } = useAuth();
  const { user } = useUser();
  const canUseSocials = user?.primaryEmailAddress?.emailAddress?.trim().toLowerCase() === SOCIALS_ACCESS_EMAIL;
  const { selectedWeddingId } = useWedding();
  const topPad = Platform.OS === 'web' ? 67 : 0;
  const { tourVisible, openTour, closeTour } = useTour('tour:profil');
  const subscription = useSubscription();
  const [paywallVisible, setPaywallVisible] = useState(false);

  const deleteAccount = () => {
    Alert.alert(
      'Supprimer le compte',
      'Cette action efface définitivement vos données et résilie les abonnements web actifs. Pour un achat Apple ou Google, pensez à le résilier dans votre boutique avant de continuer.',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer définitivement',
          style: 'destructive',
          onPress: async () => {
            try {
              const token = await getToken();
              const response = await fetch(getApiUrl('account'), { method: 'DELETE', headers: token ? { Authorization: `Bearer ${token}` } : {} });
              if (!response.ok) throw new Error();
              await signOut();
              router.replace('/(auth)/sign-in');
            } catch {
              Alert.alert('Suppression impossible', 'Nous n’avons pas pu supprimer le compte. Réessayez dans quelques instants.');
            }
          },
        },
      ],
    );
  };

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

  const openSubscription = () => {
    setPaywallVisible(true);
  };

  const fabBottom = Platform.OS === 'web' ? 94 : insets.bottom + 84;

  return (
    <>
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{ paddingBottom: 160 }}
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

        <TouchableOpacity
          onPress={() => setEditVisible(true)}
          activeOpacity={0.75}
          style={ss.nameEdit}
          accessibilityLabel="Modifier le nom"
        >
          <Text style={[ss.name, { fontFamily: SERIF }]}>{displayName}</Text>
          <Feather name="edit-2" size={14} color={colors.gold} />
        </TouchableOpacity>
        {userEmail ? (
          <Text style={[ss.role, { fontFamily: SANS_MEDIUM }]}>{userEmail}</Text>
        ) : null}
        <Text style={[ss.brand, { fontFamily: SANS }]}>L'indispensable du Wedding Planner</Text>
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
        <View style={[ss.group, shadow('sm'), { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={[ss.rim, { borderTopColor: 'rgba(255,255,255,0.70)' }]} />
          <RowItem
            icon="heart" label="Mes mariages" value={String(weddings?.length ?? 0)}
            variant="rose" colors={colors}
            onPress={() => router.push('/(tabs)/mariages')}
          />
          <RowItem
             icon="book-open" label="Mon carnet d'adresses"
            variant="sage" colors={colors}
            onPress={() => router.push('/(tabs)/carnet-adresse')}
          />
          <RowItem
             icon="trending-up" label="Mon business" colors={colors}
             onPress={() => router.push('/(tabs)/business')}
          />
          <RowItem
            icon="share-2" label="Mes réseaux" colors={colors}
            disabled={!canUseSocials}
            onPress={() => router.push('/(tabs)/mes-reseaux')}
          />
          <RowItem
            icon="clipboard" label="Mes réservations" colors={colors}
            onPress={() => router.push('/(tabs)/mes-reservations')}
          />
          <RowItem
            icon="clock" label="Mes rendez-vous" colors={colors}
            onPress={() => router.push('/(tabs)/mes-rendez-vous')}
          />
        </View>

        {/* Application */}
        <Text style={[ss.section, { fontFamily: SANS_SEMIBOLD, color: colors.mutedForeground }]}>APPLICATION</Text>
        <View style={[ss.group, shadow('sm'), { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={[ss.rim, { borderTopColor: 'rgba(255,255,255,0.70)' }]} />
          <RowItem
            icon="settings" label="Paramètres" colors={colors}
            onPress={() => router.push('/(tabs)/parametres')}
          />
          <RowItem
            icon="bell" label="Notifications" colors={colors}
            onPress={() => showComingSoon('Notifications')}
          />
          <RowItem
            icon="help-circle" label="Aide & support" colors={colors}
            onPress={() =>
              Alert.alert('Aide & support', 'Pour toute assistance, contactez-nous à contact@thenuptialplan.com', [{ text: 'OK' }])
            }
          />
        </View>

        {/* Abonnement */}
        <Text style={[ss.section, { fontFamily: SANS_SEMIBOLD, color: colors.mutedForeground }]}>ABONNEMENT</Text>
        <View style={[ss.group, shadow('sm'), { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={[ss.rim, { borderTopColor: 'rgba(255,255,255,0.70)' }]} />
          <View style={{ padding: 16, gap: 10 }}>
            <TouchableOpacity onPress={openSubscription} activeOpacity={0.75} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <View style={[ss.rowIcon, { backgroundColor: colors.goldLight }]}>
                <Feather name="star" size={15} color={colors.goldDim} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[ss.rowLabel, { fontFamily: SANS_SEMIBOLD, color: colors.foreground }]}>The Nuptial Plan Premium</Text>
                <Text style={[{ fontSize: 11, lineHeight: 16 }, { fontFamily: SANS, color: colors.mutedForeground }]}>
                  {subscription.isActive ? (subscription.isTrialing ? 'Votre essai gratuit est actif.' : 'Votre abonnement est actif.') : 'Un mois d’essai gratuit inclus.'}
                </Text>
              </View>
              <Feather name="chevron-right" size={14} color={colors.goldDim} />
            </TouchableOpacity>
            {subscription.offerings?.current?.availablePackages?.map((pkg: any) => (
              <TouchableOpacity key={pkg.identifier} disabled={subscription.loading} onPress={() => void subscription.purchase(pkg)}
                style={{ minHeight: 52, borderWidth: StyleSheet.hairlineWidth, borderRadius: 10, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', borderColor: colors.border, backgroundColor: colors.background }}>
                <View style={{ flex: 1 }}>
                  <Text style={[{ fontSize: 12 }, { fontFamily: SANS_SEMIBOLD, color: colors.foreground }]}>{pkg.packageType === 'ANNUAL' ? 'Annuel' : 'Mensuel'}</Text>
                  <Text style={[{ fontSize: 11, marginTop: 2 }, { fontFamily: SANS, color: colors.mutedForeground }]}>{getLocalizedPackagePrice(pkg) ?? 'Prix selon votre boutique'}</Text>
                </View>
                <Feather name="chevron-right" size={14} color={colors.goldDim} />
              </TouchableOpacity>
            ))}
            {!subscription.available && <Text style={[{ fontSize: 11, lineHeight: 16 }, { fontFamily: SANS, color: colors.mutedForeground }]}>Les achats intégrés seront disponibles après la configuration App Store et Google Play.</Text>}
            {!isNativeStorePricingAvailable && subscription.available && <Text style={[{ fontSize: 11, lineHeight: 16 }, { fontFamily: SANS, color: colors.mutedForeground }]}>Le prix final sera affiché selon la devise de votre App Store dans la version iOS native.</Text>}
            {subscription.isActive && (
              <TouchableOpacity onPress={() => {
                const url = Platform.OS === 'android'
                  ? `https://play.google.com/store/account/subscriptions?sku=${subscription.productIdentifier ?? 'tnp_premium_monthly'}&package=app.thenuptialplan.com`
                  : 'itms-apps://apps.apple.com/account/subscriptions';
                void Linking.openURL(url);
              }} style={{ minHeight: 44, borderRadius: 10, borderWidth: StyleSheet.hairlineWidth, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 7, backgroundColor: colors.plum + '14', borderColor: colors.plum + '30' }}>
                <Feather name="external-link" size={13} color={colors.plum} />
                <Text style={[{ fontSize: 11 }, { fontFamily: SANS_SEMIBOLD, color: colors.plum }]}>Gérer mon abonnement</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity onPress={() => void subscription.restore()} disabled={subscription.loading} style={{ alignItems: 'center', paddingVertical: 4 }}>
              <Text style={[{ fontSize: 12 }, { fontFamily: SANS_SEMIBOLD, color: colors.plum }]}>Restaurer mes achats</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Compte */}
        <Text style={[ss.section, { fontFamily: SANS_SEMIBOLD, color: colors.mutedForeground }]}>COMPTE</Text>
        <View style={[ss.group, shadow('sm'), { backgroundColor: colors.card, borderColor: colors.border }]}>
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
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={deleteAccount}
            style={[ss.row, { borderBottomColor: 'transparent' }]}
          >
            <View style={[ss.rowIcon, { backgroundColor: colors.roseBg }]}>
              <Feather name="trash-2" size={15} color={colors.roseDark} />
            </View>
            <Text style={[ss.rowLabel, { fontFamily: SANS, color: colors.roseDark }]}>Supprimer le compte</Text>
            <Feather name="chevron-right" size={14} color={colors.roseDark + '88'} />
          </TouchableOpacity>
        </View>

        {/* App identity card */}
        <View style={ss.appInfo}>
          <View style={[ss.logoWrap, shadow('sm'), { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[ss.rim, { borderTopColor: 'rgba(255,255,255,0.75)' }]} />
            <Image source={logoImage} style={ss.logoImage} resizeMode="contain" />
            <Text style={[ss.logoLabel, { fontFamily: SERIF, color: colors.foreground }]}>The Nuptial Plan</Text>
            <Text style={[ss.version, { fontFamily: SANS, color: colors.tertiaryText }]}>Version 1.0.0 · L'indispensable du Wedding Planner</Text>
          </View>
        </View>
      </View>
    </ScrollView>

    <TourSheet visible={tourVisible} onClose={closeTour} steps={TOUR_STEPS} />
    <ProfileEditSheet visible={editVisible} onClose={() => setEditVisible(false)} />
    <PaywallModal
      visible={paywallVisible}
      onClose={() => setPaywallVisible(false)}
      featureLabel="l'abonnement Premium"
    />
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
  nameEdit: { flexDirection: 'row', alignItems: 'center', gap: 8 },
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
  logoImage: { width: 58, height: 58 },
  logoNGrad: { width: 36, height: 36, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  logoNText: { fontSize: 22, lineHeight: 24, color: '#C8A96E' },
  logoLabel: { fontSize: 20 },
  version: { fontSize: 11 },
});
