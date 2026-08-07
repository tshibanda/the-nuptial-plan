import { useState } from 'react';
import {
  FlatList, View, Text, StyleSheet, TextInput,
  ActivityIndicator, Platform, TouchableOpacity,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useListWeddings, useListVendors } from '@workspace/api-client-react';
import { useWedding } from '@/context/WeddingContext';
import { useColors } from '@/hooks/useColors';
import { useTour } from '@/hooks/useTour';
import { SERIF, SANS, SANS_MEDIUM, SANS_SEMIBOLD } from '@/constants/fonts';
import { formatCents, vendorStatusLabel } from '@/utils/format';
import { shadow } from '@/utils/shadow';
import { StatusBadge } from '@/components/StatusBadge';
import { EmptyState } from '@/components/EmptyState';
import { VendorDetailSheet } from '@/components/VendorDetailSheet';
import { TourSheet, TourHelpFab } from '@/components/TourSheet';

const TOUR_STEPS = [
  {
    icon: 'briefcase',
    title: 'Votre équipe créative',
    description: "Retrouvez ici tous vos prestataires : traiteur, photographe, fleuriste et bien d'autres.",
  },
  {
    icon: 'search',
    title: 'Recherche rapide',
    description: 'Utilisez la barre de recherche pour trouver un prestataire par nom ou par catégorie.',
  },
  {
    icon: 'user',
    title: 'Fiche prestataire',
    description: 'Appuyez sur un prestataire pour consulter ses coordonnées, ses contrats et ses paiements.',
  },
];

const AVATAR_COLORS = ['#eadfcf', '#dce7df', '#eadfdf', '#e1dceb', '#e0e7dc', '#dce0e7'];

export default function PrestatairesScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { selectedWeddingId } = useWedding();
  const topPad = Platform.OS === 'web' ? 67 : insets.top;
  const { tourVisible, openTour, closeTour } = useTour('tour:prestataires');
  const [search, setSearch] = useState('');
  const [selectedVendorId, setSelectedVendorId] = useState<number | null>(null);

  const { data: weddings } = useListWeddings();
  const activeWedding = weddings?.find((w) => w.id === selectedWeddingId) ?? weddings?.[0];
  const wId = activeWedding?.id ?? 0;

  const { data: vendors, isLoading, refetch, isRefetching } = useListVendors(wId);

  const filtered = (vendors ?? []).filter(
    (v) =>
      v.name.toLowerCase().includes(search.toLowerCase()) ||
      v.category.toLowerCase().includes(search.toLowerCase()),
  );

  const handleVendorPress = (id: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedVendorId(id);
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
              <View style={{ position: 'absolute', top: -24, right: -28, width: 110, height: 110, borderRadius: 55, backgroundColor: colors.gold + '1E' }} pointerEvents="none" />
              <View style={{ position: 'absolute', bottom: -16, left: -16, width: 80, height: 80, borderRadius: 40, backgroundColor: colors.sage + '20' }} pointerEvents="none" />
              <LinearGradient colors={['rgba(255,255,255,0.08)', 'transparent']} style={ss.heroSheen} pointerEvents="none" />
              <View style={ss.goldBar} />

              <Text style={[ss.eye, { fontFamily: SANS_MEDIUM, color: '#C8A96E' }]}>L'ÉQUIPE CRÉATIVE</Text>
              <Text style={[ss.title, { fontFamily: SERIF, color: '#FBF5FB' }]}>Prestataires</Text>
              {activeWedding && (
                <Text style={[ss.subtitle, { fontFamily: SANS, color: '#DEC0DE' }]}>{activeWedding.names}</Text>
              )}
            </LinearGradient>

            {/* Search bar */}
            <View style={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8 }}>
              <View style={[ss.searchWrap, shadow('sm'), { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={[ss.rim, { borderTopColor: 'rgba(255,255,255,0.85)' }]} />
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
          </View>
        }
        ListEmptyComponent={
          isLoading ? (
            <View style={ss.loading}><ActivityIndicator color={colors.accent} /></View>
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
            <TouchableOpacity
              onPress={() => handleVendorPress(item.id)}
              activeOpacity={0.75}
              style={[ss.card, shadow('md'), { backgroundColor: colors.card, borderColor: colors.border, marginHorizontal: 16, marginBottom: 10 }]}
            >
              {/* Rim highlight */}
              <View style={[ss.rim, { borderTopColor: 'rgba(255,255,255,0.65)' }]} />
              <View style={ss.cardTop}>
                <View style={[ss.av, { backgroundColor: avatarBg }, shadow('xs')]}>
                  <Text style={[ss.avText, { fontFamily: SERIF, color: colors.plumDark }]}>{av}</Text>
                </View>
                <View style={ss.cardInfo}>
                  <Text style={[ss.vendorName, { fontFamily: SANS_SEMIBOLD, color: colors.foreground }]} numberOfLines={1}>{item.name}</Text>
                  <Text style={[ss.vendorCat, { fontFamily: SANS, color: colors.mutedForeground }]}>{item.category}</Text>
                </View>
                <View style={ss.cardRight}>
                  <StatusBadge label={label} tone={tone} />
                  <Feather name="chevron-right" size={14} color={colors.goldDim} style={{ marginTop: 6 }} />
                </View>
              </View>
              <View style={[ss.cardFooter, { borderTopColor: colors.border }]}>
                {item.contactName ? (
                  <View style={ss.footerItem}>
                    <Feather name="user" size={11} color={colors.mutedForeground} />
                    <Text style={[ss.footerText, { fontFamily: SANS, color: colors.mutedForeground }]}>{item.contactName}</Text>
                  </View>
                ) : <View />}
                <Text style={[ss.amount, { fontFamily: SERIF, color: colors.plumDark }]}>
                  {formatCents(item.totalAmountCents, activeWedding?.currency)}
                </Text>
              </View>
            </TouchableOpacity>
          );
        }}
      />

      <VendorDetailSheet
        visible={selectedVendorId !== null}
        onClose={() => setSelectedVendorId(null)}
        weddingId={wId}
        vendorId={selectedVendorId}
        currency={activeWedding?.currency}
      />

      <TourHelpFab
        onPress={openTour}
        bottom={Platform.OS === 'web' ? 94 : insets.bottom + 84}
      />
      <TourSheet visible={tourVisible} onClose={closeTour} steps={TOUR_STEPS} />
    </>
  );
}

const ss = StyleSheet.create({
  hero: { paddingHorizontal: 20, paddingBottom: 22, overflow: 'hidden' },
  heroSheen: { ...StyleSheet.absoluteFillObject, height: 80 },
  goldBar: { position: 'absolute', top: 0, left: 0, right: 0, height: 1.5, backgroundColor: 'rgba(200,170,112,0.35)' },
  eye: { fontSize: 9, letterSpacing: 2, marginBottom: 4 },
  title: { fontSize: 34, lineHeight: 34, marginBottom: 2 },
  subtitle: { fontSize: 12, marginBottom: 4 },
  searchWrap: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 24, borderWidth: StyleSheet.hairlineWidth, paddingHorizontal: 14, height: 44, overflow: 'hidden' },
  rim: { position: 'absolute', left: 0, right: 0, top: 0, height: 1, borderTopWidth: 1 },
  searchInput: { flex: 1, fontSize: 13, height: 44 },
  loading: { padding: 40, alignItems: 'center' },
  emptyWrap: { flex: 1, minHeight: 300 },
  card: { borderRadius: 12, borderWidth: StyleSheet.hairlineWidth, overflow: 'hidden' },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 },
  av: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  avText: { fontSize: 16 },
  cardInfo: { flex: 1 },
  cardRight: { alignItems: 'flex-end' },
  vendorName: { fontSize: 13, marginBottom: 2 },
  vendorCat: { fontSize: 11 },
  cardFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderTopWidth: StyleSheet.hairlineWidth, paddingHorizontal: 14, paddingVertical: 10 },
  footerItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  footerText: { fontSize: 11 },
  amount: { fontSize: 22, lineHeight: 22 },
});
