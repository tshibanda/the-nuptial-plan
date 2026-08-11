import {
  FlatList, View, Text, StyleSheet, TouchableOpacity,
  ActivityIndicator, Platform, Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useQueryClient } from '@tanstack/react-query';
import { useListWeddings, useDeleteWedding, getListWeddingsQueryKey } from '@workspace/api-client-react';
import { useWedding } from '@/context/WeddingContext';
import { useColors } from '@/hooks/useColors';
import { useTour } from '@/hooks/useTour';
import { SERIF, SANS, SANS_MEDIUM, SANS_SEMIBOLD } from '@/constants/fonts';
import { daysUntil } from '@/utils/format';
import { shadow, accentShadow } from '@/utils/shadow';
import { EmptyState } from '@/components/EmptyState';
import { TourSheet } from '@/components/TourSheet';

const TOUR_STEPS = [
  {
    icon: 'heart',
    title: 'Vos mariages',
    description: 'Retrouvez ici tous les mariages que vous gérez. Chaque carte affiche les noms des mariés, le lieu et le compte à rebours.',
  },
  {
    icon: 'check-circle',
    title: 'Mariage actif',
    description: "Appuyez sur une carte pour sélectionner le mariage actif. La carte en surbrillance plum indique le mariage actuellement affiché dans toute l'application.",
  },
  {
    icon: 'calendar',
    title: 'Compte à rebours',
    description: 'Le badge en bas à droite de chaque carte affiche le nombre de jours restants avant la cérémonie — un rappel visuel au quotidien.',
  },
  {
    icon: 'refresh-cw',
    title: 'Actualiser la liste',
    description: 'Tirez vers le bas pour synchroniser la liste avec les dernières modifications effectuées depuis l\'application web.',
  },
];

export default function MariagesScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { selectedWeddingId, selectWedding } = useWedding();
  const topPad = Platform.OS === 'web' ? 67 : 0;
  const { tourVisible, openTour, closeTour } = useTour('tour:mariages');

  const queryClient = useQueryClient();
  const { data: weddings, isLoading, refetch, isRefetching } = useListWeddings();
  const deleteWedding = useDeleteWedding();

  const handleSelect = (id: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    selectWedding(id);
  };

  const handleLongPress = (id: number, names: string) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    Alert.alert(
      'Supprimer ce dossier',
      `Toutes les données de "${names}" seront définitivement supprimées (invités, prestataires, budget, paiements…). Cette action est irréversible.`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: () => {
            deleteWedding.mutate(
              { id },
              {
                onSuccess: () => {
                  queryClient.invalidateQueries({ queryKey: getListWeddingsQueryKey() });
                  if (selectedWeddingId === id) {
                    const remaining = (weddings ?? []).filter((w) => w.id !== id);
                    selectWedding(remaining[0]?.id ?? 0);
                  }
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
      data={weddings ?? []}
      keyExtractor={(item) => String(item.id)}
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{ paddingBottom: 100, flexGrow: 1 }}
      refreshing={isRefetching}
      onRefresh={refetch}
      showsVerticalScrollIndicator={false}
      ListHeaderComponent={
        <View>
          {/* ── Vivid plum hero ── */}
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
            <Text style={[ss.title, { fontFamily: SERIF, color: '#FBF5FB' }]}>Vos mariages</Text>
          </LinearGradient>
          <View style={{ height: 16 }} />
        </View>
      }
      ListEmptyComponent={
        <View style={ss.emptyWrap}>
          <EmptyState icon="heart" title="Aucun mariage" subtitle="Ajoutez votre premier mariage depuis l'application web." />
        </View>
      }
      renderItem={({ item }) => {
        const isActive = item.id === selectedWeddingId;
        const days = Math.max(0, daysUntil(item.weddingDate));
        const rawNames = item.names ?? '';
        const nameParts = rawNames.includes('&')
          ? rawNames.split('&').map((s: string) => s.trim()).filter(Boolean)
          : rawNames.split(/\s+/).filter(Boolean);
        const av = nameParts.map((p: string) => p[0]).join('').toUpperCase().slice(0, 2);
        const cardShadow = isActive ? accentShadow('lg') : shadow('sm');

        return (
          <TouchableOpacity
            onPress={() => handleSelect(item.id)}
            onLongPress={() => handleLongPress(item.id, item.names)}
            delayLongPress={550}
            activeOpacity={0.85}
            style={[ss.wcard, { marginHorizontal: 16, marginBottom: 14 }, cardShadow]}
          >
            <LinearGradient
              colors={isActive
                ? [colors.plumDark, colors.plum, colors.plumLight]
                : [colors.muted, colors.card]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[ss.wcardInner, { borderColor: isActive ? colors.gold + 'BB' : colors.border }]}
            >
              {/* Rim highlight */}
              <View style={[ss.rim, { borderTopColor: isActive ? 'rgba(200,170,112,0.40)' : 'rgba(255,255,255,0.75)' }]} />

              {/* Active: subtle rose blob */}
              {isActive && (
                <View style={{ position: 'absolute', top: -20, right: -20, width: 100, height: 100, borderRadius: 50, backgroundColor: colors.rose + '18' }} pointerEvents="none" />
              )}

              <View style={ss.wcardTop}>
                <View style={[
                  ss.avatar,
                  { backgroundColor: isActive ? 'rgba(200,170,112,0.20)' : colors.muted },
                  shadow('xs'),
                ]}>
                  <Text style={[ss.avatarText, { fontFamily: SERIF, color: isActive ? colors.gold : colors.plumDark }]}>{av}</Text>
                </View>
                <View style={ss.wcardInfo}>
                  <Text style={[ss.wcardNames, { fontFamily: SERIF, color: isActive ? '#FBF5FB' : colors.foreground }]}>
                    {item.names}
                  </Text>
                  <Text style={[ss.wcardVenue, { fontFamily: SANS, color: isActive ? '#DEC0DE' : colors.mutedForeground }]} numberOfLines={1}>
                    {item.venue}
                  </Text>
                </View>
                {isActive && (
                  <LinearGradient
                    colors={[colors.gold, colors.goldDim]}
                    style={[ss.activeBadge, shadow('xs')]}
                  >
                    <Feather name="check" size={11} color="#3C1A3C" />
                  </LinearGradient>
                )}
              </View>

              <View style={[ss.wcardFooter, { borderTopColor: isActive ? 'rgba(255,255,255,0.12)' : colors.border }]}>
                <View style={ss.footerItem}>
                  <Feather name="calendar" size={12} color={isActive ? '#C8A96E' : colors.accent} />
                  <Text style={[ss.footerText, { fontFamily: SANS, color: isActive ? '#C8A96E' : colors.mutedForeground }]}>
                    {new Date(item.weddingDate).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </Text>
                </View>
                <View style={[
                  ss.daysBadge,
                  { backgroundColor: isActive ? 'rgba(200,170,112,0.22)' : colors.muted },
                  shadow('xs'),
                ]}>
                  <Text style={[ss.daysNum, { fontFamily: SERIF, color: isActive ? colors.gold : colors.plumDark }]}>{days}</Text>
                  <Text style={[ss.daysLabel, { fontFamily: SANS_SEMIBOLD, color: isActive ? '#bdc8c4' : colors.mutedForeground }]}>JOURS</Text>
                </View>
              </View>
            </LinearGradient>
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
  emptyWrap: { flex: 1, minHeight: 300 },
  wcard: { borderRadius: 12, overflow: 'hidden' },
  wcardInner: { borderRadius: 12, borderWidth: StyleSheet.hairlineWidth, padding: 16, overflow: 'hidden' },
  rim: { position: 'absolute', left: 0, right: 0, top: 0, height: 1, borderTopWidth: 1 },
  wcardTop: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 14 },
  avatar: { width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 18 },
  wcardInfo: { flex: 1 },
  wcardNames: { fontSize: 18, lineHeight: 20, marginBottom: 2 },
  wcardVenue: { fontSize: 11 },
  activeBadge: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  wcardFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 12 },
  footerItem: { flexDirection: 'row', alignItems: 'center', gap: 5, flex: 1 },
  footerText: { fontSize: 11 },
  daysBadge: { alignItems: 'center', paddingHorizontal: 12, paddingVertical: 5, borderRadius: 8 },
  daysNum: { fontSize: 22, lineHeight: 22 },
  daysLabel: { fontSize: 7, letterSpacing: 1 },
});
