import { useState } from 'react';
import {
  FlatList, View, Text, StyleSheet,
  ActivityIndicator, Platform, TouchableOpacity,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import { Feather } from '@expo/vector-icons';
import type { Guest } from '@workspace/api-client-react';
import { useListWeddings, useListGuests, useGetGuestStats } from '@workspace/api-client-react';
import { useWedding } from '@/context/WeddingContext';
import { useColors } from '@/hooks/useColors';
import { useTour } from '@/hooks/useTour';
import { SERIF, SANS, SANS_MEDIUM, SANS_SEMIBOLD } from '@/constants/fonts';
import { rsvpLabel } from '@/utils/format';
import { shadow, accentShadow } from '@/utils/shadow';
import { StatusBadge } from '@/components/StatusBadge';
import { EmptyState } from '@/components/EmptyState';
import { GuestDetailSheet } from '@/components/GuestDetailSheet';
import { TourSheet, TourHelpFab } from '@/components/TourSheet';

const TOUR_STEPS = [
  {
    icon: 'users',
    title: 'Gestion des invités',
    description: 'Gérez la liste complète de vos invités et suivez les réponses RSVP en temps réel.',
  },
  {
    icon: 'bar-chart-2',
    title: 'Statistiques RSVP',
    description: 'Les chiffres en haut affichent le récapitulatif : total, confirmés, en attente et déclinés.',
  },
  {
    icon: 'filter',
    title: 'Filtrer par statut',
    description: 'Appuyez sur un filtre — Confirmés, En attente ou Déclinés — pour afficher uniquement les invités correspondants.',
  },
  {
    icon: 'edit-2',
    title: 'Fiche invité',
    description: 'Appuyez sur un invité pour consulter ses informations, modifier son statut RSVP ou noter ses préférences alimentaires.',
  },
];

type Filter = 'all' | 'confirmed' | 'pending' | 'declined';

const FILTERS: { key: Filter; label: string }[] = [
  { key: 'all', label: 'Tous' },
  { key: 'confirmed', label: 'Confirmés' },
  { key: 'pending', label: 'En attente' },
  { key: 'declined', label: 'Déclinés' },
];

const AVATAR_COLORS = ['#ebe2d4', '#dce4e5', '#e2dceb', '#dce8df', '#f0e2cb'];

export default function InvitesScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { selectedWeddingId } = useWedding();
  const topPad = Platform.OS === 'web' ? 67 : insets.top;
  const { tourVisible, openTour, closeTour } = useTour('tour:invites');
  const [filter, setFilter] = useState<Filter>('all');
  const [selectedGuest, setSelectedGuest] = useState<Guest | null>(null);

  const { data: weddings } = useListWeddings();
  const activeWedding = weddings?.find((w) => w.id === selectedWeddingId) ?? weddings?.[0];
  const wId = activeWedding?.id ?? 0;
  const { data: guests, isLoading, refetch, isRefetching } = useListGuests(wId);
  const { data: stats } = useGetGuestStats(wId);

  const filtered = (guests ?? []).filter((g) => filter === 'all' || g.rsvpStatus === filter);

  const handleGuestPress = (guest: Guest) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedGuest(guest);
  };

  return (
    <>
      <FlatList
        data={filtered}
        keyExtractor={(item) => String(item.id)}
        style={{ flex: 1, backgroundColor: colors.background }}
        contentContainerStyle={{ paddingBottom: 100, flexGrow: 1 }}
        refreshing={isRefetching}
        onRefresh={refetch}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View>
            {/* ── Hero gradient header ── */}
            <LinearGradient
              colors={[colors.plumDark, colors.plum, colors.plumLight]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[ss.hero, { paddingTop: topPad + 20 }]}
            >
              {/* Ambient rose blob */}
              <View style={{ position: 'absolute', top: -20, right: -20, width: 100, height: 100, borderRadius: 50, backgroundColor: colors.rose + '22' }} pointerEvents="none" />
              <View style={{ position: 'absolute', bottom: 0, left: 20, width: 70, height: 70, borderRadius: 35, backgroundColor: colors.sage + '18' }} pointerEvents="none" />
              <LinearGradient colors={['rgba(255,255,255,0.08)', 'transparent']} style={ss.heroSheen} pointerEvents="none" />
              <View style={ss.goldBar} />

              <Text style={[ss.eye, { fontFamily: SANS_MEDIUM, color: '#C8A96E' }]}>LA CÉLÉBRATION</Text>
              <Text style={[ss.title, { fontFamily: SERIF, color: '#FBF5FB' }]}>Gestion des invités</Text>
            </LinearGradient>

            <View style={{ paddingHorizontal: 16, paddingTop: 16 }}>
              {/* Glassmorphic stats bar */}
              {stats && (
                <View style={[ss.statsWrap, shadow('md')]}>
                  <View style={[ss.statsBar, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    <View style={[ss.rim, { borderTopColor: 'rgba(255,255,255,0.80)' }]} />
                    <StatBlock value={stats.total} label="Total" color={colors.foreground} colors={colors} />
                    <View style={[ss.statDivider, { backgroundColor: colors.border }]} />
                    <StatBlock value={stats.confirmed} label="Confirmés" color={colors.success} colors={colors} />
                    <View style={[ss.statDivider, { backgroundColor: colors.border }]} />
                    <StatBlock value={stats.pending} label="En attente" color={colors.warning} colors={colors} />
                    <View style={[ss.statDivider, { backgroundColor: colors.border }]} />
                    <StatBlock value={stats.declined} label="Déclinés" color={colors.mutedForeground} colors={colors} />
                  </View>
                </View>
              )}

              {/* Filter pills */}
              <View style={ss.filterRow}>
                {FILTERS.map((f) => {
                  const isActive = filter === f.key;
                  return (
                    <TouchableOpacity
                      key={f.key}
                      onPress={() => setFilter(f.key)}
                      activeOpacity={0.75}
                      style={[
                        ss.filterPill,
                        isActive ? accentShadow('sm') : shadow('xs'),
                        { backgroundColor: isActive ? colors.plum : colors.muted, borderColor: isActive ? colors.plum : colors.border },
                      ]}
                    >
                      <Text style={[ss.filterText, { fontFamily: SANS_MEDIUM, color: isActive ? '#FBF5FB' : colors.mutedForeground }]}>
                        {f.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          </View>
        }
        ListEmptyComponent={
          isLoading ? (
            <View style={ss.loading}><ActivityIndicator color={colors.accent} /></View>
          ) : (
            <View style={ss.emptyWrap}>
              <EmptyState icon="users" title="Aucun invité" subtitle="Ajoutez des invités depuis l'application web." />
            </View>
          )
        }
        renderItem={({ item, index }) => {
          const { label, tone } = rsvpLabel(item.rsvpStatus);
          const av = item.name.split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2);
          const avatarBg = AVATAR_COLORS[index % AVATAR_COLORS.length];
          return (
            <TouchableOpacity
              onPress={() => handleGuestPress(item)}
              activeOpacity={0.75}
              style={[ss.guestRow, shadow('sm'), { backgroundColor: colors.card, borderColor: colors.border, marginHorizontal: 16, marginBottom: 8 }]}
            >
              <View style={[ss.rim, { borderTopColor: 'rgba(255,255,255,0.65)' }]} />
              <View style={[ss.av, { backgroundColor: avatarBg }, shadow('xs')]}>
                <Text style={[ss.avText, { fontFamily: SERIF, color: colors.plumDark }]}>{av}</Text>
              </View>
              <View style={ss.guestInfo}>
                <Text style={[ss.guestName, { fontFamily: SANS_SEMIBOLD, color: colors.foreground }]} numberOfLines={1}>{item.name}</Text>
                <Text style={[ss.guestMeta, { fontFamily: SANS, color: colors.mutedForeground }]}>
                  {[item.tableNumber ? `Table ${item.tableNumber}` : null, item.dietaryRequirements].filter(Boolean).join(' · ') || '—'}
                </Text>
              </View>
              <View style={ss.guestRight}>
                <StatusBadge label={label} tone={tone} />
                <View style={{ height: 4 }} />
                <Feather name="chevron-right" size={13} color={colors.goldDim} />
              </View>
            </TouchableOpacity>
          );
        }}
      />

      <GuestDetailSheet
        visible={selectedGuest !== null}
        onClose={() => setSelectedGuest(null)}
        guest={selectedGuest}
      />

      <TourHelpFab
        onPress={openTour}
        bottom={Platform.OS === 'web' ? 94 : insets.bottom + 84}
      />
      <TourSheet visible={tourVisible} onClose={closeTour} steps={TOUR_STEPS} />
    </>
  );
}

function StatBlock({ value, label, color, colors }: {
  value: number; label: string; color: string;
  colors: ReturnType<typeof useColors>;
}) {
  return (
    <View style={ss.statBlock}>
      <Text style={[ss.statValue, { fontFamily: SERIF, color }]}>{value}</Text>
      <Text style={[ss.statLabel, { fontFamily: SANS_MEDIUM, color: colors.mutedForeground }]}>{label}</Text>
    </View>
  );
}

const ss = StyleSheet.create({
  hero: { paddingHorizontal: 20, paddingBottom: 22, overflow: 'hidden' },
  heroSheen: { ...StyleSheet.absoluteFillObject, height: 80 },
  goldBar: { position: 'absolute', top: 0, left: 0, right: 0, height: 1.5, backgroundColor: 'rgba(200,170,112,0.35)' },
  eye: { fontSize: 9, letterSpacing: 2, marginBottom: 4 },
  title: { fontSize: 34, lineHeight: 34 },
  statsWrap: { borderRadius: 12, marginBottom: 14, overflow: 'hidden' },
  statsBar: { flexDirection: 'row', borderRadius: 12, borderWidth: StyleSheet.hairlineWidth, padding: 14, alignItems: 'center', overflow: 'hidden' },
  rim: { position: 'absolute', left: 0, right: 0, top: 0, height: 1, borderTopWidth: 1 },
  statBlock: { flex: 1, alignItems: 'center', gap: 2 },
  statDivider: { width: StyleSheet.hairlineWidth, height: 32 },
  statValue: { fontSize: 26, lineHeight: 26 },
  statLabel: { fontSize: 9, letterSpacing: 0.5 },
  filterRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap', marginBottom: 8 },
  filterPill: { borderRadius: 20, borderWidth: StyleSheet.hairlineWidth, paddingHorizontal: 14, paddingVertical: 7 },
  filterText: { fontSize: 11 },
  loading: { padding: 40, alignItems: 'center' },
  emptyWrap: { flex: 1, minHeight: 300 },
  guestRow: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 10, borderWidth: StyleSheet.hairlineWidth, padding: 12, overflow: 'hidden' },
  av: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  avText: { fontSize: 15 },
  guestInfo: { flex: 1 },
  guestName: { fontSize: 13, marginBottom: 2 },
  guestMeta: { fontSize: 10 },
  guestRight: { alignItems: 'center' },
});
