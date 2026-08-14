import { useState } from 'react';
import {
  FlatList, View, Text, StyleSheet, TouchableOpacity,
  ActivityIndicator, Platform, Alert, Modal, TextInput,
  KeyboardAvoidingView, ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useQueryClient } from '@tanstack/react-query';
import {
  useListWeddings,
  useDeleteWedding,
  useCreateWedding,
  getListWeddingsQueryKey,
} from '@workspace/api-client-react';
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

const CURRENCIES = [
  { code: 'EUR', label: 'Euro (€)' },
  { code: 'GBP', label: 'Livre (£)' },
  { code: 'USD', label: 'Dollar ($)' },
  { code: 'CHF', label: 'Franc suisse' },
] as const;

export default function MariagesScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { selectedWeddingId, selectWedding } = useWedding();
  const topPad = Platform.OS === 'web' ? 67 : 0;
  const { tourVisible, openTour, closeTour } = useTour('tour:mariages');

  const queryClient = useQueryClient();
  const { data: weddings, isLoading, refetch, isRefetching } = useListWeddings();
  const deleteWedding = useDeleteWedding();
  const createWedding = useCreateWedding();
  const [createOpen, setCreateOpen] = useState(false);
  const [partner1, setPartner1] = useState('');
  const [partner2, setPartner2] = useState('');
  const [weddingDate, setWeddingDate] = useState('');
  const [venue, setVenue] = useState('');
  const [currency, setCurrency] = useState('EUR');
  const [totalBudget, setTotalBudget] = useState('');
  const [guestCount, setGuestCount] = useState('');

  const resetCreateForm = () => {
    setPartner1('');
    setPartner2('');
    setWeddingDate('');
    setVenue('');
    setCurrency('EUR');
    setTotalBudget('');
    setGuestCount('');
  };

  const handleCreate = () => {
    const first = partner1.trim();
    const second = partner2.trim();
    const place = venue.trim();
    const date = weddingDate.trim();
    const budget = Number(totalBudget.replace(',', '.') || 0);
    const guests = Number(guestCount || 0);
    const validDate = /^\d{4}-\d{2}-\d{2}$/.test(date)
      && !Number.isNaN(new Date(`${date}T12:00:00`).getTime());

    if (!first || !second || !place || !validDate) {
      Alert.alert('Informations manquantes', 'Renseignez les deux prénoms, la date au format AAAA-MM-JJ et le lieu du mariage.');
      return;
    }
    if (!Number.isFinite(budget) || budget < 0 || !Number.isFinite(guests) || guests < 0 || !Number.isInteger(guests)) {
      Alert.alert('Valeurs invalides', 'Le budget et le nombre d’invités doivent être des nombres positifs.');
      return;
    }

    createWedding.mutate(
      {
        data: {
          names: `${first} & ${second}`,
          partner1: first,
          partner2: second,
          currency,
          weddingDate: date,
          venue: place,
          totalBudget: Math.round(budget * 100),
          guestCount: guests,
          notes: '',
        },
      },
      {
        onSuccess: (wedding) => {
          queryClient.invalidateQueries({ queryKey: getListWeddingsQueryKey() });
          selectWedding(wedding.id);
          setCreateOpen(false);
          resetCreateForm();
          Alert.alert('Mariage créé', `${wedding.names} est maintenant votre mariage actif.`);
        },
        onError: () => Alert.alert('Erreur', 'Impossible de créer le mariage. Réessayez dans quelques instants.'),
      },
    );
  };

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
      contentContainerStyle={{ paddingBottom: 160, flexGrow: 1 }}
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
            <TouchableOpacity
              onPress={() => setCreateOpen(true)}
              activeOpacity={0.8}
              style={ss.createButton}
            >
              <Feather name="plus" size={14} color="#3C1A3C" />
              <Text style={[ss.createButtonText, { fontFamily: SANS_SEMIBOLD }]}>Nouveau mariage</Text>
            </TouchableOpacity>
          </LinearGradient>
          <View style={{ height: 16 }} />
        </View>
      }
      ListEmptyComponent={
        <View style={ss.emptyWrap}>
          <EmptyState
            icon="heart"
            title="Aucun mariage pour le moment"
            subtitle="Vous pouvez créer votre premier dossier directement ici, dans l’onglet « Vos mariages »."
          />
          <TouchableOpacity
            onPress={() => setCreateOpen(true)}
            activeOpacity={0.8}
            style={[ss.emptyCreateButton, { backgroundColor: colors.plum }]}
          >
            <Feather name="plus" size={16} color="#FBF5FB" />
            <Text style={[ss.emptyCreateButtonText, { fontFamily: SANS_SEMIBOLD }]}>Créer mon premier mariage</Text>
          </TouchableOpacity>
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

    <Modal
      visible={createOpen}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={() => setCreateOpen(false)}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={[ss.modalRoot, { backgroundColor: colors.background }]}
      >
        <ScrollView
          contentContainerStyle={[ss.modalContent, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 28 }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={ss.modalHeader}>
            <View>
              <Text style={[ss.modalEyebrow, { fontFamily: SANS_SEMIBOLD, color: colors.goldDim }]}>NOUVEAU DOSSIER</Text>
              <Text style={[ss.modalTitle, { fontFamily: SERIF, color: colors.foreground }]}>Créer un mariage</Text>
            </View>
            <TouchableOpacity onPress={() => setCreateOpen(false)} style={ss.closeButton} accessibilityLabel="Fermer">
              <Feather name="x" size={19} color={colors.mutedForeground} />
            </TouchableOpacity>
          </View>

          <Text style={[ss.modalDescription, { fontFamily: SANS, color: colors.mutedForeground }]}>
            Ajoutez les informations principales pour commencer à organiser ce mariage.
          </Text>

          <Text style={[ss.fieldLabel, { fontFamily: SANS_SEMIBOLD, color: colors.foreground }]}>Prénom du premier marié</Text>
          <TextInput
            value={partner1}
            onChangeText={setPartner1}
            placeholder="Sophie"
            placeholderTextColor={colors.mutedForeground}
            style={[ss.input, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.card }]}
          />

          <Text style={[ss.fieldLabel, { fontFamily: SANS_SEMIBOLD, color: colors.foreground }]}>Prénom du second marié</Text>
          <TextInput
            value={partner2}
            onChangeText={setPartner2}
            placeholder="James"
            placeholderTextColor={colors.mutedForeground}
            style={[ss.input, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.card }]}
          />

          <Text style={[ss.fieldLabel, { fontFamily: SANS_SEMIBOLD, color: colors.foreground }]}>Date du mariage</Text>
          <TextInput
            value={weddingDate}
            onChangeText={setWeddingDate}
            placeholder="AAAA-MM-JJ"
            placeholderTextColor={colors.mutedForeground}
            keyboardType="numbers-and-punctuation"
            style={[ss.input, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.card }]}
          />

          <Text style={[ss.fieldLabel, { fontFamily: SANS_SEMIBOLD, color: colors.foreground }]}>Lieu</Text>
          <TextInput
            value={venue}
            onChangeText={setVenue}
            placeholder="Lieu de réception"
            placeholderTextColor={colors.mutedForeground}
            style={[ss.input, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.card }]}
          />

          <Text style={[ss.fieldLabel, { fontFamily: SANS_SEMIBOLD, color: colors.foreground }]}>Devise</Text>
          <View style={ss.currencyRow}>
            {CURRENCIES.map((item) => (
              <TouchableOpacity
                key={item.code}
                onPress={() => setCurrency(item.code)}
                style={[
                  ss.currencyButton,
                  {
                    borderColor: currency === item.code ? colors.plum : colors.border,
                    backgroundColor: currency === item.code ? colors.plumBg : colors.card,
                  },
                ]}
              >
                <Text style={[ss.currencyText, { fontFamily: SANS_SEMIBOLD, color: currency === item.code ? colors.plum : colors.mutedForeground }]}>
                  {item.code}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={ss.twoColumns}>
            <View style={ss.column}>
              <Text style={[ss.fieldLabel, { fontFamily: SANS_SEMIBOLD, color: colors.foreground }]}>Budget total</Text>
              <TextInput
                value={totalBudget}
                onChangeText={setTotalBudget}
                placeholder="0"
                placeholderTextColor={colors.mutedForeground}
                keyboardType="decimal-pad"
                style={[ss.input, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.card }]}
              />
            </View>
            <View style={ss.column}>
              <Text style={[ss.fieldLabel, { fontFamily: SANS_SEMIBOLD, color: colors.foreground }]}>Nombre d’invités</Text>
              <TextInput
                value={guestCount}
                onChangeText={setGuestCount}
                placeholder="0"
                placeholderTextColor={colors.mutedForeground}
                keyboardType="number-pad"
                style={[ss.input, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.card }]}
              />
            </View>
          </View>

          <TouchableOpacity
            onPress={handleCreate}
            disabled={createWedding.isPending}
            activeOpacity={0.82}
            style={[ss.submitButton, { backgroundColor: colors.plum, opacity: createWedding.isPending ? 0.65 : 1 }]}
          >
            {createWedding.isPending ? (
              <ActivityIndicator color="#FBF5FB" />
            ) : (
              <>
                <Feather name="heart" size={16} color="#FBF5FB" />
                <Text style={[ss.submitButtonText, { fontFamily: SANS_SEMIBOLD }]}>Créer le mariage</Text>
              </>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>

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
  createButton: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', gap: 7, marginTop: 16, borderRadius: 10, paddingHorizontal: 13, paddingVertical: 10, backgroundColor: '#C8A96E' },
  createButtonText: { fontSize: 12, color: '#3C1A3C' },
  emptyWrap: { flex: 1, minHeight: 300, alignItems: 'center', paddingHorizontal: 24 },
  emptyCreateButton: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 14, borderRadius: 10, paddingHorizontal: 16, paddingVertical: 12 },
  emptyCreateButtonText: { fontSize: 12, color: '#FBF5FB' },
  modalRoot: { flex: 1 },
  modalContent: { paddingHorizontal: 20 },
  modalHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  modalEyebrow: { fontSize: 9, letterSpacing: 1.5, marginBottom: 5 },
  modalTitle: { fontSize: 30, lineHeight: 32 },
  closeButton: { padding: 7, borderRadius: 20 },
  modalDescription: { fontSize: 13, lineHeight: 19, marginTop: 8, marginBottom: 20 },
  fieldLabel: { fontSize: 11, marginBottom: 6, marginTop: 12 },
  input: { minHeight: 44, borderWidth: StyleSheet.hairlineWidth, borderRadius: 10, paddingHorizontal: 12, fontSize: 14 },
  currencyRow: { flexDirection: 'row', gap: 8 },
  currencyButton: { flex: 1, alignItems: 'center', borderWidth: StyleSheet.hairlineWidth, borderRadius: 9, paddingVertical: 11 },
  currencyText: { fontSize: 11 },
  twoColumns: { flexDirection: 'row', gap: 10 },
  column: { flex: 1 },
  submitButton: { minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 12, marginTop: 26 },
  submitButtonText: { fontSize: 13, color: '#FBF5FB' },
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
