import { useState } from 'react';
import {
  FlatList, View, Text, StyleSheet,
  ActivityIndicator, Platform, TouchableOpacity,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useListWeddings, useListGuests, useGetGuestStats } from '@workspace/api-client-react';
import { useWedding } from '@/context/WeddingContext';
import { useColors } from '@/hooks/useColors';
import { SERIF, SANS, SANS_MEDIUM, SANS_SEMIBOLD } from '@/constants/fonts';
import { rsvpLabel } from '@/utils/format';
import { StatusBadge } from '@/components/StatusBadge';
import { EmptyState } from '@/components/EmptyState';

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

  const { data: weddings } = useListWeddings();
  const activeWedding = weddings?.find((w) => w.id === selectedWeddingId) ?? weddings?.[0];
  const wId = activeWedding?.id ?? 0;
  const { data: guests, isLoading, refetch, isRefetching } = useListGuests(wId);
  const { data: stats } = useGetGuestStats(wId);

  const filtered = (guests ?? []).filter((g) => filter === 'all' || g.rsvpStatus === filter);

  const StatBlock = ({ value, label, color }: { value: number; label: string; color: string }) => (
    <View style={ss.statBlock}>
      <Text style={[ss.statValue, { fontFamily: SERIF, color }]}>{value}</Text>
      <Text style={[ss.statLabel, { fontFamily: SANS_MEDIUM, color: colors.mutedForeground }]}>{label}</Text>
    </View>
  );

  return (
    <FlatList
      data={filtered}
      keyExtractor={(item) => String(item.id)}
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{ paddingBottom: Platform.OS === 'web' ? 100 : 100, flexGrow: 1 }}
      refreshing={isRefetching}
      onRefresh={refetch}
      showsVerticalScrollIndicator={false}
      ListHeaderComponent={
        <View>
          <View style={{ paddingTop: topPad + 20, paddingHorizontal: 16, paddingBottom: 16 }}>
            <Text style={[ss.eye, { fontFamily: SANS_SEMIBOLD, color: colors.goldDim }]}>LA CÉLÉBRATION</Text>
            <Text style={[ss.title, { fontFamily: SERIF, color: colors.foreground }]}>Gestion des invités</Text>

            {/* Stats bar */}
            {stats && (
              <View style={[ss.statsBar, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <StatBlock value={stats.total} label="Total" color={colors.foreground} />
                <View style={[ss.statDivider, { backgroundColor: colors.border }]} />
                <StatBlock value={stats.confirmed} label="Confirmés" color={colors.success} />
                <View style={[ss.statDivider, { backgroundColor: colors.border }]} />
                <StatBlock value={stats.pending} label="En attente" color={colors.warning} />
                <View style={[ss.statDivider, { backgroundColor: colors.border }]} />
                <StatBlock value={stats.declined} label="Déclinés" color={colors.mutedForeground} />
              </View>
            )}

            {/* Filter pills */}
            <View style={ss.filterRow}>
              {FILTERS.map((f) => (
                <TouchableOpacity
                  key={f.key}
                  onPress={() => setFilter(f.key)}
                  style={[
                    ss.filterPill,
                    {
                      backgroundColor: filter === f.key ? colors.navy : colors.card,
                      borderColor: filter === f.key ? colors.navy : colors.border,
                    },
                  ]}
                >
                  <Text
                    style={[
                      ss.filterText,
                      {
                        fontFamily: SANS_MEDIUM,
                        color: filter === f.key ? colors.primaryForeground : colors.mutedForeground,
                      },
                    ]}
                  >
                    {f.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      }
      ListEmptyComponent={
        isLoading ? (
          <View style={ss.loading}>
            <ActivityIndicator color={colors.accent} />
          </View>
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
          <View style={[ss.guestRow, { backgroundColor: colors.card, borderColor: colors.border, marginHorizontal: 16, marginBottom: 8 }]}>
            <View style={[ss.av, { backgroundColor: avatarBg }]}>
              <Text style={[ss.avText, { fontFamily: SERIF, color: colors.navy }]}>{av}</Text>
            </View>
            <View style={ss.guestInfo}>
              <Text style={[ss.guestName, { fontFamily: SANS_SEMIBOLD, color: colors.foreground }]} numberOfLines={1}>{item.name}</Text>
              <Text style={[ss.guestMeta, { fontFamily: SANS, color: colors.mutedForeground }]}>
                {[item.tableNumber ? `Table ${item.tableNumber}` : null, item.dietaryRequirements].filter(Boolean).join(' · ') || '—'}
              </Text>
            </View>
            <StatusBadge label={label} tone={tone} />
          </View>
        );
      }}
    />
  );
}

const ss = StyleSheet.create({
  eye: { fontSize: 9, letterSpacing: 2, marginBottom: 4 },
  title: { fontSize: 34, lineHeight: 34, marginBottom: 14 },
  statsBar: { flexDirection: 'row', borderRadius: 8, borderWidth: StyleSheet.hairlineWidth, padding: 14, marginBottom: 14, alignItems: 'center' },
  statBlock: { flex: 1, alignItems: 'center', gap: 2 },
  statDivider: { width: StyleSheet.hairlineWidth, height: 32 },
  statValue: { fontSize: 26, lineHeight: 26 },
  statLabel: { fontSize: 9, letterSpacing: 0.5 },
  filterRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  filterPill: { borderRadius: 20, borderWidth: StyleSheet.hairlineWidth, paddingHorizontal: 12, paddingVertical: 6 },
  filterText: { fontSize: 11 },
  loading: { padding: 40, alignItems: 'center' },
  emptyWrap: { flex: 1, minHeight: 300 },
  guestRow: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 8, borderWidth: StyleSheet.hairlineWidth, padding: 12 },
  av: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  avText: { fontSize: 15 },
  guestInfo: { flex: 1 },
  guestName: { fontSize: 13, marginBottom: 2 },
  guestMeta: { fontSize: 10 },
});
