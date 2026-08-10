import { useState } from 'react';
import {
  FlatList, View, Text, StyleSheet, TextInput,
  ActivityIndicator, Platform, TouchableOpacity,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useListContracts, useListWeddings } from '@workspace/api-client-react';
import { useWedding } from '@/context/WeddingContext';
import { useColors } from '@/hooks/useColors';
import { useTour } from '@/hooks/useTour';
import { SERIF, SANS, SANS_MEDIUM, SANS_SEMIBOLD } from '@/constants/fonts';
import { formatCents } from '@/utils/format';
import { shadow } from '@/utils/shadow';
import { EmptyState } from '@/components/EmptyState';
import { TourSheet } from '@/components/TourSheet';

const TOUR_STEPS = [
  {
    icon: 'file-text',
    title: 'Vos contrats',
    description: "Retrouvez ici tous vos contrats prestataires : traiteur, photographe, fleuriste et bien d'autres.",
  },
  {
    icon: 'search',
    title: 'Recherche rapide',
    description: 'Utilisez la barre de recherche pour trouver un contrat par nom de prestataire.',
  },
  {
    icon: 'check-circle',
    title: 'Statut du contrat',
    description: 'Chaque contrat affiche son statut (Signé, En attente…) et le montant total engagé.',
  },
];

const STATUS_LABELS: Record<string, string> = {
  signed: 'Signé',
  pending: 'En attente',
  partial: 'Partiel',
  cancelled: 'Annulé',
};

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  signed:    { bg: '#e8f5e9', text: '#388e3c' },
  pending:   { bg: '#fff3e0', text: '#e65100' },
  partial:   { bg: '#e8eaf6', text: '#3949ab' },
  cancelled: { bg: '#fce4ec', text: '#c62828' },
};

export default function ContratsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { selectedWeddingId } = useWedding();
  const topPad = Platform.OS === 'web' ? 67 : insets.top;
  const { tourVisible, openTour, closeTour } = useTour('tour:contrats');
  const [search, setSearch] = useState('');

  const { data: weddings } = useListWeddings();
  const activeWedding = weddings?.find((w) => w.id === selectedWeddingId) ?? weddings?.[0];
  const wId = activeWedding?.id ?? 0;

  const { data: contracts, isLoading, refetch, isRefetching } = useListContracts(wId);

  const filtered = (contracts ?? []).filter((c) =>
    c.vendorName.toLowerCase().includes(search.toLowerCase()),
  );

  const fabBottom = Platform.OS === 'web' ? 94 : insets.bottom + 84;

  if (isLoading) {
    return (
      <View style={[ss.center, { backgroundColor: colors.background, paddingTop: topPad }]}>
        <ActivityIndicator color={colors.accent} size="large" />
      </View>
    );
  }

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
            {/* Hero gradient header */}
            <LinearGradient
              colors={[colors.plumDark, colors.plum, colors.plumLight]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[ss.heroHeader, { paddingTop: topPad + 20 }]}
            >
              <View style={{ position: 'absolute', top: -24, right: -24, width: 110, height: 110, borderRadius: 55, backgroundColor: colors.rose + '20' }} pointerEvents="none" />
              <View style={{ position: 'absolute', bottom: -12, left: 10, width: 70, height: 70, borderRadius: 35, backgroundColor: colors.gold + '18' }} pointerEvents="none" />
              <LinearGradient colors={['rgba(255,255,255,0.08)', 'transparent']} style={ss.heroSheen} pointerEvents="none" />
              <View style={ss.goldBar} />
              <Text style={[ss.eye, { fontFamily: SANS_MEDIUM, color: '#C8A96E' }]}>THE NUPTIAL PLAN</Text>
              <Text style={[ss.title, { fontFamily: SERIF, color: '#FBF5FB' }]}>Contrats</Text>
              {activeWedding && (
                <Text style={[ss.subtitle, { fontFamily: SANS, color: '#DEC0DE' }]} numberOfLines={1}>
                  {activeWedding.names}
                </Text>
              )}
            </LinearGradient>

            {/* Search bar */}
            <View style={[ss.searchWrap, { backgroundColor: colors.card, borderColor: colors.border }, shadow('sm')]}>
              <Feather name="search" size={16} color={colors.mutedForeground} />
              <TextInput
                style={[ss.searchInput, { fontFamily: SANS, color: colors.foreground }]}
                placeholder="Rechercher un prestataire…"
                placeholderTextColor={colors.mutedForeground}
                value={search}
                onChangeText={setSearch}
                clearButtonMode="while-editing"
              />
            </View>
          </View>
        }
        ListEmptyComponent={
          <View style={ss.emptyWrap}>
            <EmptyState
              icon="file-text"
              title={search ? 'Aucun résultat' : 'Aucun contrat'}
              subtitle={search ? 'Modifiez votre recherche.' : 'Ajoutez vos contrats depuis l\'application web.'}
            />
          </View>
        }
        renderItem={({ item }) => {
          const statusInfo = STATUS_COLORS[item.status] ?? STATUS_COLORS.pending;
          const label = STATUS_LABELS[item.status] ?? item.status;

          return (
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}
              style={[ss.card, { marginHorizontal: 16, marginBottom: 10 }, shadow('sm')]}
            >
              <View style={[ss.cardInner, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={[ss.rim, { borderTopColor: 'rgba(255,255,255,0.70)' }]} />

                <View style={ss.cardTop}>
                  {/* Icon */}
                  <View style={[ss.iconWrap, { backgroundColor: colors.plum + '18' }]}>
                    <Feather name="file-text" size={18} color={colors.plum} />
                  </View>

                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={[ss.vendorName, { fontFamily: SANS_SEMIBOLD, color: colors.foreground }]} numberOfLines={1}>
                      {item.vendorName}
                    </Text>
                    {item.signedDate ? (
                      <Text style={[ss.dateText, { fontFamily: SANS, color: colors.mutedForeground }]}>
                        Signé le {new Date(item.signedDate).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
                      </Text>
                    ) : (
                      <Text style={[ss.dateText, { fontFamily: SANS, color: colors.mutedForeground }]}>Date non renseignée</Text>
                    )}
                  </View>

                  {/* Status badge */}
                  <View style={[ss.badge, { backgroundColor: statusInfo.bg }]}>
                    <Text style={[ss.badgeText, { fontFamily: SANS_SEMIBOLD, color: statusInfo.text }]}>{label}</Text>
                  </View>
                </View>

                {/* Footer */}
                <View style={[ss.cardFooter, { borderTopColor: colors.border }]}>
                  <View style={ss.footerItem}>
                    <Feather name="credit-card" size={12} color={colors.goldDim} />
                    <Text style={[ss.footerText, { fontFamily: SANS_MEDIUM, color: colors.mutedForeground }]}>
                      {formatCents(item.totalAmountCents, activeWedding?.currency ?? 'EUR')}
                    </Text>
                  </View>
                  <Feather name="chevron-right" size={14} color={colors.border} />
                </View>
              </View>
            </TouchableOpacity>
          );
        }}
      />

      <TourSheet visible={tourVisible} onClose={closeTour} steps={TOUR_STEPS} />
    </>
  );
}

const ss = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  heroHeader: { paddingHorizontal: 20, paddingBottom: 22, overflow: 'hidden' },
  heroSheen: { ...StyleSheet.absoluteFillObject, height: 80 },
  goldBar: { position: 'absolute', top: 0, left: 0, right: 0, height: 1.5, backgroundColor: 'rgba(200,170,112,0.35)' },
  eye: { fontSize: 9, letterSpacing: 2, marginBottom: 4 },
  title: { fontSize: 34, lineHeight: 34 },
  subtitle: { fontSize: 12, marginTop: 4 },
  searchWrap: { flexDirection: 'row', alignItems: 'center', gap: 10, marginHorizontal: 16, marginTop: 16, marginBottom: 6, borderRadius: 10, borderWidth: StyleSheet.hairlineWidth, paddingHorizontal: 12, paddingVertical: 10 },
  searchInput: { flex: 1, fontSize: 14 },
  emptyWrap: { flex: 1, minHeight: 300 },
  card: { borderRadius: 12 },
  cardInner: { borderRadius: 12, borderWidth: StyleSheet.hairlineWidth, overflow: 'hidden' },
  rim: { position: 'absolute', left: 0, right: 0, top: 0, height: 1, borderTopWidth: 1 },
  cardTop: { flexDirection: 'row', alignItems: 'center', padding: 14 },
  iconWrap: { width: 44, height: 44, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  vendorName: { fontSize: 14, lineHeight: 18, marginBottom: 2 },
  dateText: { fontSize: 11 },
  badge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  badgeText: { fontSize: 10 },
  cardFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderTopWidth: StyleSheet.hairlineWidth, paddingHorizontal: 14, paddingVertical: 10 },
  footerItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  footerText: { fontSize: 12 },
});
