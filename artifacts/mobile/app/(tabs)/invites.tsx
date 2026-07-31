import { useState } from 'react';
import {
  FlatList, View, Text, StyleSheet,
  ActivityIndicator, Platform, TouchableOpacity,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import { Feather } from '@expo/vector-icons';
import type { Guest } from '@workspace/api-client-react';
import { useListWeddings, useListGuests, useGetGuestStats } from '@workspace/api-client-react';
import { useWedding } from '@/context/WeddingContext';
import { useColors } from '@/hooks/useColors';
import { SERIF, SANS, SANS_MEDIUM, SANS_SEMIBOLD } from '@/constants/fonts';
import { rsvpLabel } from '@/utils/format';
import { shadow, accentShadow } from '@/utils/shadow';
import { StatusBadge } from '@/components/StatusBadge';
import { EmptyState } from '@/components/EmptyState';
import { GuestDetailSheet } from '@/components/GuestDetailSheet';

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
            <View style={{ paddingTop: topPad + 20, paddingHorizontal: 16, paddingBottom: 16 }}>
              <Text style={[ss.eye, { fontFamily: SANS_SEMIBOLD, color: colors.goldDim }]}>LA CÉLÉBRATION</Text>
              <Text style={[ss.title, { fontFamily: SERIF, color: colors.foreground }]}>Gestion des invités</Text>

              {/* Glassmorphic stats bar */}
              {stats && (
                <View style={[ss.statsWrap, shadow('md')]}>
                  <BlurView
                    intensity={Platform.OS === 'web' ? 0 : 85}
                    tint="light"
                    style={[ss.statsBar, { backgroundColor: Platform.OS === 'web' ? colors.card + 'ee' : 'rgba(248,245,239,0.75)', borderColor: 'rgba(255,255,255,0.60)' }]}
                  >
                    {/* Rim */}
                    <View style={[ss.rim, { borderTopColor: 'rgba(255,255,255,0.75)' }]} />
                    <StatBlock value={stats.total} label="Total" color={colors.foreground} colors={colors} />
                    <View style={[ss.statDivider, { backgroundColor: colors.border }]} />
                    <StatBlock value={stats.confirmed} label="Confirmés" color={colors.success} colors={colors} />
                    <View style={[ss.statDivider, { backgroundColor: colors.border }]} />
                    <StatBlock value={stats.pending} label="En attente" color={colors.warning} colors={colors} />
                    <View style={[ss.statDivider, { backgroundColor: colors.border }]} />
                    <StatBlock value={stats.declined} label="Déclinés" color={colors.mutedForeground} colors={colors} />
                  </BlurView>
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
                      style={[
                        ss.filterPill,
                        isActive ? accentShadow('sm') : shadow('xs'),
                        {
                          backgroundColor: isActive ? colors.navy : 'rgba(255,255,255,0.70)',
                          borderColor: isActive ? colors.navy : colors.border,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          ss.filterText,
                          { fontFamily: SANS_MEDIUM, color: isActive ? colors.primaryForeground : colors.mutedForeground },
                        ]}
                      >
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
              style={[ss.guestRow, shadow('xs'), { backgroundColor: colors.card, borderColor: colors.border, marginHorizontal: 16, marginBottom: 8 }]}
            >
              <View style={[ss.rim, { borderTopColor: 'rgba(255,255,255,0.60)' }]} />
              <View style={[ss.av, { backgroundColor: avatarBg }, shadow('xs')]}>
                <Text style={[ss.avText, { fontFamily: SERIF, color: colors.navy }]}>{av}</Text>
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
                <Feather name="chevron-right" size={13} color={colors.border} />
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
  eye: { fontSize: 9, letterSpacing: 2, marginBottom: 4 },
  title: { fontSize: 34, lineHeight: 34, marginBottom: 14 },
  statsWrap: { borderRadius: 10, marginBottom: 14, overflow: 'hidden' },
  statsBar: { flexDirection: 'row', borderRadius: 10, borderWidth: StyleSheet.hairlineWidth, padding: 14, alignItems: 'center', overflow: 'hidden' },
  rim: { position: 'absolute', left: 0, right: 0, top: 0, height: 1, borderTopWidth: 1 },
  statBlock: { flex: 1, alignItems: 'center', gap: 2 },
  statDivider: { width: StyleSheet.hairlineWidth, height: 32 },
  statValue: { fontSize: 26, lineHeight: 26 },
  statLabel: { fontSize: 9, letterSpacing: 0.5 },
  filterRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  filterPill: { borderRadius: 20, borderWidth: StyleSheet.hairlineWidth, paddingHorizontal: 12, paddingVertical: 6 },
  filterText: { fontSize: 11 },
  loading: { padding: 40, alignItems: 'center' },
  emptyWrap: { flex: 1, minHeight: 300 },
  guestRow: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 8, borderWidth: StyleSheet.hairlineWidth, padding: 12, overflow: 'hidden' },
  av: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  avText: { fontSize: 15 },
  guestInfo: { flex: 1 },
  guestName: { fontSize: 13, marginBottom: 2 },
  guestMeta: { fontSize: 10 },
  guestRight: { alignItems: 'center' },
});
