import { useState } from 'react';
import {
  FlatList, View, Text, StyleSheet, TextInput,
  ActivityIndicator, Platform, TouchableOpacity,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useListWeddings, useListVendors } from '@workspace/api-client-react';
import { useWedding } from '@/context/WeddingContext';
import { useColors } from '@/hooks/useColors';
import { SERIF, SANS, SANS_MEDIUM, SANS_SEMIBOLD } from '@/constants/fonts';
import { formatCents, vendorStatusLabel } from '@/utils/format';
import { StatusBadge } from '@/components/StatusBadge';
import { EmptyState } from '@/components/EmptyState';

const AVATAR_COLORS = ['#eadfcf', '#dce7df', '#eadfdf', '#e1dceb', '#e0e7dc', '#dce0e7'];

export default function PrestatairesScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { selectedWeddingId } = useWedding();
  const topPad = Platform.OS === 'web' ? 67 : insets.top;
  const [search, setSearch] = useState('');

  const { data: weddings } = useListWeddings();
  const activeWedding = weddings?.find((w) => w.id === selectedWeddingId) ?? weddings?.[0];
  const wId = activeWedding?.id ?? 0;

  const { data: vendors, isLoading, refetch, isRefetching } = useListVendors(wId);

  const filtered = (vendors ?? []).filter(
    (v) =>
      v.name.toLowerCase().includes(search.toLowerCase()) ||
      v.category.toLowerCase().includes(search.toLowerCase()),
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
        <View style={{ paddingTop: topPad + 20, paddingHorizontal: 16, paddingBottom: 8 }}>
          <Text style={[ss.eye, { fontFamily: SANS_SEMIBOLD, color: colors.goldDim }]}>L'ÉQUIPE CRÉATIVE</Text>
          <Text style={[ss.title, { fontFamily: SERIF, color: colors.foreground }]}>Prestataires</Text>
          {activeWedding && (
            <Text style={[ss.subtitle, { fontFamily: SANS, color: colors.mutedForeground }]}>{activeWedding.names}</Text>
          )}
          <View style={[ss.searchWrap, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Feather name="search" size={15} color={colors.mutedForeground} />
            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder="Rechercher..."
              placeholderTextColor={colors.mutedForeground}
              style={[ss.searchInput, { fontFamily: SANS, color: colors.foreground }]}
            />
            {search.length > 0 && (
              <TouchableOpacity onPress={() => setSearch('')}>
                <Feather name="x" size={14} color={colors.mutedForeground} />
              </TouchableOpacity>
            )}
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
            <EmptyState icon="briefcase" title="Aucun prestataire" subtitle="Ajoutez votre équipe depuis l'application web." />
          </View>
        )
      }
      renderItem={({ item, index }) => {
        const { label, tone } = vendorStatusLabel(item.status);
        const av = item.name.split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2);
        const avatarBg = AVATAR_COLORS[index % AVATAR_COLORS.length];
        return (
          <View style={[ss.card, { backgroundColor: colors.card, borderColor: colors.border, marginHorizontal: 16, marginBottom: 8 }]}>
            <View style={ss.cardTop}>
              <View style={[ss.av, { backgroundColor: avatarBg }]}>
                <Text style={[ss.avText, { fontFamily: SERIF, color: colors.navy }]}>{av}</Text>
              </View>
              <View style={ss.cardInfo}>
                <Text style={[ss.vendorName, { fontFamily: SANS_SEMIBOLD, color: colors.foreground }]} numberOfLines={1}>{item.name}</Text>
                <Text style={[ss.vendorCat, { fontFamily: SANS, color: colors.mutedForeground }]}>{item.category}</Text>
              </View>
              <StatusBadge label={label} tone={tone} />
            </View>
            <View style={[ss.cardFooter, { borderTopColor: colors.border }]}>
              {item.contactName ? (
                <View style={ss.footerItem}>
                  <Feather name="user" size={11} color={colors.mutedForeground} />
                  <Text style={[ss.footerText, { fontFamily: SANS, color: colors.mutedForeground }]}>{item.contactName}</Text>
                </View>
              ) : null}
              <Text style={[ss.amount, { fontFamily: SERIF, color: colors.foreground }]}>
                {formatCents(item.totalAmountCents, activeWedding?.currency)}
              </Text>
            </View>
          </View>
        );
      }}
    />
  );
}

const ss = StyleSheet.create({
  eye: { fontSize: 9, letterSpacing: 2, marginBottom: 4 },
  title: { fontSize: 34, lineHeight: 34, marginBottom: 2 },
  subtitle: { fontSize: 12, marginBottom: 14 },
  searchWrap: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 24, borderWidth: StyleSheet.hairlineWidth, paddingHorizontal: 14, height: 40, marginBottom: 4 },
  searchInput: { flex: 1, fontSize: 13, height: 40 },
  loading: { padding: 40, alignItems: 'center' },
  emptyWrap: { flex: 1, minHeight: 300 },
  card: { borderRadius: 8, borderWidth: StyleSheet.hairlineWidth, overflow: 'hidden' },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 },
  av: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  avText: { fontSize: 16 },
  cardInfo: { flex: 1 },
  vendorName: { fontSize: 13, marginBottom: 2 },
  vendorCat: { fontSize: 11 },
  cardFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderTopWidth: StyleSheet.hairlineWidth, paddingHorizontal: 14, paddingVertical: 10 },
  footerItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  footerText: { fontSize: 11 },
  amount: { fontSize: 22, lineHeight: 22 },
});
