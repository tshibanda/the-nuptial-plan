import { useRef, useState } from 'react';
import {
  FlatList, View, Text, StyleSheet, TouchableOpacity,
  ActivityIndicator, Platform, Alert, Modal, TextInput,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import { DateField } from '@/components/DateField';
import { KeyboardAwareScrollViewCompat } from '@/components/KeyboardAwareScrollViewCompat';
import { parsePickerDate } from '@/utils/datePicker';
import * as Haptics from 'expo-haptics';
import { useQueryClient } from '@tanstack/react-query';
import {
  useListWeddings,
  useDeleteWedding,
  useCreateWedding,
  getListWeddingsQueryKey,
  CURRENCIES,
  getNewWeddingCurrency,
  type SupportedCurrency,
} from '@workspace/api-client-react';
import { useWedding } from '@/context/WeddingContext';
import { useLocalization } from '@/context/LocalizationContext';
import { useColors } from '@/hooks/useColors';
import { MOBILE_TAB_STALE_TIME } from '@/hooks/useActiveWedding';
import { useTour } from '@/hooks/useTour';
import { SERIF, SANS, SANS_MEDIUM, SANS_SEMIBOLD } from '@/constants/fonts';
import { daysUntil, initials } from '@/utils/format';
import { shadow, accentShadow } from '@/utils/shadow';
import { EmptyState } from '@/components/EmptyState';
import { TourSheet } from '@/components/TourSheet';
import { usePreferredCurrency } from '@/hooks/usePreferredCurrency';
import { createWeddingDeletionLifecycle, type WeddingDeletionContext } from '@/utils/wedding-deletion';

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
const TOUR_STEPS_EN = [
  { icon: 'heart', title: 'Your weddings', description: 'Find all the weddings you manage here. Each card shows the couple’s names, venue, and countdown.' },
  { icon: 'check-circle', title: 'Active wedding', description: 'Tap a card to select the active wedding. The highlighted plum card is displayed throughout the app.' },
  { icon: 'calendar', title: 'Countdown', description: 'The badge at the bottom right of each card shows the number of days until the ceremony.' },
  { icon: 'refresh-cw', title: 'Refresh the list', description: 'Pull down to sync the list with the latest changes made in the web app.' },
];

export default function MariagesScreen() {
  const colors = useColors();
  const { language, locale, t } = useLocalization();
  const insets = useSafeAreaInsets();
  const { selectedWeddingId, selectWedding } = useWedding();
  const preferredCurrency = usePreferredCurrency();
  const topPad = Platform.OS === 'web' ? 67 : 0;
  const { tourVisible, openTour, closeTour } = useTour('tour:mariages');

  const queryClient = useQueryClient();
  const { data: weddings, isLoading, refetch, isRefetching } = useListWeddings({
    query: { queryKey: getListWeddingsQueryKey(), staleTime: MOBILE_TAB_STALE_TIME },
  });
  const selectionRef = useRef(selectedWeddingId);
  selectionRef.current = selectedWeddingId;
  const deletionRequested = useRef(false);
  const updateSelection = (id: number) => {
    selectionRef.current = id;
    selectWedding(id);
  };
  const deletionLifecycle = createWeddingDeletionLifecycle({
    queryClient,
    queryKey: getListWeddingsQueryKey(),
    getSelection: () => selectionRef.current,
    selectWedding: updateSelection,
    showError: () => Alert.alert(t('common.error'), language === 'fr'
      ? 'La suppression a échoué. Le mariage a été rétabli. Vérifiez votre connexion et réessayez.'
      : 'Deletion failed. The wedding has been restored. Check your connection and try again.'),
  });
  const deleteWedding = useDeleteWedding<Error, WeddingDeletionContext>({
    mutation: {
      ...deletionLifecycle,
      retry: false,
      onSettled: () => {
        deletionRequested.current = false;
        deletionLifecycle.onSettled();
      },
    },
  });
  const createWedding = useCreateWedding();
  const [createOpen, setCreateOpen] = useState(false);
  const [partner1, setPartner1] = useState('');
  const [partner2, setPartner2] = useState('');
  const [weddingDate, setWeddingDate] = useState('');
  const [venue, setVenue] = useState('');
  const [currency, setCurrency] = useState<SupportedCurrency>(getNewWeddingCurrency({ preferredCurrency }));
  const [totalBudget, setTotalBudget] = useState('');
  const [guestCount, setGuestCount] = useState('');
  const [invalidFields, setInvalidFields] = useState<string[]>([]);
  const [submitError, setSubmitError] = useState('');

  const resetCreateForm = () => {
    setPartner1('');
    setPartner2('');
    setWeddingDate('');
    setVenue('');
    setCurrency(getNewWeddingCurrency({ preferredCurrency }));
    setTotalBudget('');
    setGuestCount('');
    setInvalidFields([]);
    setSubmitError('');
  };

  const openCreateForm = () => {
    resetCreateForm();
    setCreateOpen(true);
  };

  const handleCreate = () => {
    const first = partner1.trim();
    const second = partner2.trim();
    const place = venue.trim();
    const date = weddingDate.trim();
    const budget = Number(totalBudget.replace(',', '.') || 0);
    const guests = Number(guestCount || 0);
    const missing = [
      !first && 'partner1',
      !second && 'partner2',
      (date.length !== 10 || !parsePickerDate(date)) && 'weddingDate',
      !place && 'venue',
    ].filter((field): field is string => !!field);
    setInvalidFields(missing);
    if (missing.length > 0) {
      setSubmitError(language === 'fr'
        ? 'Complétez les champs indiqués et sélectionnez une date avant de créer le mariage.'
        : 'Complete the highlighted fields and select a date before creating the wedding.');
      return;
    }
    const invalidNumbers = [
      (!Number.isFinite(budget) || budget < 0) && 'totalBudget',
      (!Number.isFinite(guests) || guests < 0 || !Number.isInteger(guests)) && 'guestCount',
    ].filter((field): field is string => !!field);
    if (invalidNumbers.length > 0) {
      setInvalidFields(invalidNumbers);
      setSubmitError(language === 'fr' ? 'Le budget et le nombre d’invités doivent être des nombres positifs.' : 'Budget and guest count must be positive numbers.');
      return;
    }
    setSubmitError('');

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
          Alert.alert(language === 'fr' ? 'Mariage créé' : 'Wedding created', language === 'fr' ? `${wedding.names} est maintenant votre mariage actif.` : `${wedding.names} is now your active wedding.`);
        },
        onError: (error) => setSubmitError((error as { status?: number }).status === 401
          ? (language === 'fr' ? 'Votre session a expiré. Reconnectez-vous avant de réessayer.' : 'Your session has expired. Sign in again before retrying.')
          : (language === 'fr' ? 'Impossible de créer le mariage. Vérifiez votre connexion et réessayez.' : 'Unable to create the wedding. Check your connection and try again.')),
      },
    );
  };

  const handleSelect = (id: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    updateSelection(id);
  };

  const handleDelete = (id: number, names: string) => {
    if (deletionRequested.current) return;
    const title = language === 'fr' ? 'Supprimer ce dossier' : 'Delete this file';
    const message = language === 'fr'
      ? `Toutes les données de "${names}" seront définitivement supprimées (invités, prestataires, budget, paiements…). Cette action est irréversible.`
      : `All data for "${names}" will be permanently deleted (guests, vendors, budget, payments…). This action cannot be undone.`;
    const confirmDeletion = () => {
      if (deletionRequested.current) return;
      deletionRequested.current = true;
      deleteWedding.mutate({ id });
    };
    if (Platform.OS === 'web') {
      if (window.confirm(`${title}\n\n${message}`)) confirmDeletion();
      return;
    }
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    Alert.alert(
      title,
      message,
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: confirmDeletion,
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
            <Text style={[ss.title, { fontFamily: SERIF, color: '#FBF5FB' }]}>{language === 'fr' ? 'Vos mariages' : 'Your weddings'}</Text>
            <TouchableOpacity
              onPress={openCreateForm}
              activeOpacity={0.8}
              style={ss.createButton}
            >
              <Feather name="plus" size={14} color="#3C1A3C" />
              <Text style={[ss.createButtonText, { fontFamily: SANS_SEMIBOLD }]}>{language === 'fr' ? 'Nouveau mariage' : 'New wedding'}</Text>
            </TouchableOpacity>
          </LinearGradient>
          {deleteWedding.isPending && (
            <View style={ss.deletionStatus} accessibilityLiveRegion="polite">
              <ActivityIndicator size="small" color={colors.accent} />
              <Text style={{ fontFamily: SANS, color: colors.mutedForeground }}>
                {language === 'fr' ? 'Suppression en cours…' : 'Deleting…'}
              </Text>
            </View>
          )}
          <View style={{ height: 16 }} />
        </View>
      }
      ListEmptyComponent={
        <View style={ss.emptyWrap}>
          <EmptyState
            icon="heart"
            title={language === 'fr' ? 'Aucun mariage pour le moment' : 'No weddings yet'}
            subtitle={language === 'fr' ? 'Vous pouvez créer votre premier dossier directement ici, dans l’onglet « Vos mariages ».' : 'Create your first file directly here in the “Your weddings” tab.'}
          />
          <TouchableOpacity
            onPress={openCreateForm}
            activeOpacity={0.8}
            style={[ss.emptyCreateButton, { backgroundColor: colors.plum }]}
          >
            <Feather name="plus" size={16} color="#FBF5FB" />
            <Text style={[ss.emptyCreateButtonText, { fontFamily: SANS_SEMIBOLD }]}>{language === 'fr' ? 'Créer mon premier mariage' : 'Create my first wedding'}</Text>
          </TouchableOpacity>
        </View>
      }
      renderItem={({ item }) => {
        const isActive = item.id === selectedWeddingId;
        const days = Math.max(0, daysUntil(item.weddingDate));
        const weddingInitials = initials(item.names ?? '');
        const cardShadow = isActive ? accentShadow('lg') : shadow('sm');

        return (
          <TouchableOpacity
            onPress={() => handleSelect(item.id)}
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
                <LinearGradient
                  colors={isActive
                    ? [colors.gold, colors.goldDim]
                    : [colors.plumLight, colors.plum]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={[ss.avatar, shadow('xs')]}
                >
                  <Text style={[ss.avatarText, { fontFamily: SERIF, color: isActive ? colors.plumDark : '#FBF5FB' }]}>
                    {weddingInitials || '?'}
                  </Text>
                </LinearGradient>
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
                <TouchableOpacity
                  onPress={(event) => {
                    event.stopPropagation();
                    handleDelete(item.id, item.names);
                  }}
                  disabled={deleteWedding.isPending}
                  accessibilityRole="button"
                  accessibilityLabel={language === 'fr' ? `Supprimer le mariage ${item.names}` : `Delete wedding ${item.names}`}
                  accessibilityState={{ disabled: deleteWedding.isPending }}
                  activeOpacity={0.5}
                  style={[ss.deleteButton, { opacity: deleteWedding.isPending ? 0.4 : 1 }]}
                >
                  <Feather name="trash-2" size={19} color={isActive ? colors.gold : colors.destructive} />
                </TouchableOpacity>
              </View>

              <View style={[ss.wcardFooter, { borderTopColor: isActive ? 'rgba(255,255,255,0.12)' : colors.border }]}>
                <View style={ss.footerItem}>
                  <Feather name="calendar" size={12} color={isActive ? '#C8A96E' : colors.accent} />
                  <Text style={[ss.footerText, { fontFamily: SANS, color: isActive ? '#C8A96E' : colors.mutedForeground }]}>
                    {new Date(item.weddingDate).toLocaleDateString(locale, { day: 'numeric', month: 'long', year: 'numeric' })}
                  </Text>
                </View>
                <View style={[
                  ss.daysBadge,
                  { backgroundColor: isActive ? 'rgba(200,170,112,0.22)' : colors.muted },
                  shadow('xs'),
                ]}>
                  <Text style={[ss.daysNum, { fontFamily: SERIF, color: isActive ? colors.gold : colors.plumDark }]}>{days}</Text>
                  <Text style={[ss.daysLabel, { fontFamily: SANS_SEMIBOLD, color: isActive ? '#bdc8c4' : colors.mutedForeground }]}>{language === 'fr' ? 'JOURS' : 'DAYS'}</Text>
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
      <KeyboardAwareScrollViewCompat
        style={[ss.modalRoot, { backgroundColor: colors.background }]}
        contentContainerStyle={[ss.modalContent, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 28 }]}
        keyboardShouldPersistTaps="always"
        showsVerticalScrollIndicator={false}
        bottomOffset={24}
      >
          <View style={ss.modalHeader}>
            <View>
               <Text style={[ss.modalEyebrow, { fontFamily: SANS_SEMIBOLD, color: colors.goldDim }]}>{language === 'fr' ? 'NOUVEAU DOSSIER' : 'NEW FILE'}</Text>
               <Text style={[ss.modalTitle, { fontFamily: SERIF, color: colors.foreground }]}>{language === 'fr' ? 'Créer un mariage' : 'Create a wedding'}</Text>
            </View>
             <TouchableOpacity onPress={() => setCreateOpen(false)} style={ss.closeButton} accessibilityLabel={t('common.close')}>
              <Feather name="x" size={19} color={colors.mutedForeground} />
            </TouchableOpacity>
          </View>

          <Text style={[ss.modalDescription, { fontFamily: SANS, color: colors.mutedForeground }]}>
            {language === 'fr' ? 'Ajoutez les informations principales pour commencer à organiser ce mariage.' : 'Add the main information to start planning this wedding.'}
          </Text>

          <Text style={[ss.fieldLabel, { fontFamily: SANS_SEMIBOLD, color: colors.foreground }]}>{language === 'fr' ? 'Prénom du premier marié' : 'First partner’s first name'}</Text>
          <TextInput
            value={partner1}
            onChangeText={(value) => { setPartner1(value); setSubmitError(''); setInvalidFields((fields) => fields.filter((field) => field !== 'partner1')); }}
            placeholder="Sophie"
            placeholderTextColor={colors.mutedForeground}
            style={[ss.input, { color: colors.foreground, borderColor: invalidFields.includes('partner1') ? colors.rose : colors.border, backgroundColor: colors.card }]}
          />

          <Text style={[ss.fieldLabel, { fontFamily: SANS_SEMIBOLD, color: colors.foreground }]}>{language === 'fr' ? 'Prénom du second marié' : 'Second partner’s first name'}</Text>
          <TextInput
            value={partner2}
            onChangeText={(value) => { setPartner2(value); setSubmitError(''); setInvalidFields((fields) => fields.filter((field) => field !== 'partner2')); }}
            placeholder="James"
            placeholderTextColor={colors.mutedForeground}
            style={[ss.input, { color: colors.foreground, borderColor: invalidFields.includes('partner2') ? colors.rose : colors.border, backgroundColor: colors.card }]}
          />

          <Text style={[ss.fieldLabel, { fontFamily: SANS_SEMIBOLD, color: colors.foreground }]}>{language === 'fr' ? 'Date du mariage' : 'Wedding date'}</Text>
          <DateField value={weddingDate} onChange={(value) => { setWeddingDate(value); setSubmitError(''); setInvalidFields((fields) => fields.filter((field) => field !== 'weddingDate')); }} label={language === 'fr' ? 'Date du mariage' : 'Wedding date'} invalid={invalidFields.includes('weddingDate')} />

          <Text style={[ss.fieldLabel, { fontFamily: SANS_SEMIBOLD, color: colors.foreground }]}>{language === 'fr' ? 'Lieu' : 'Venue'}</Text>
          <TextInput
            value={venue}
            onChangeText={(value) => { setVenue(value); setSubmitError(''); setInvalidFields((fields) => fields.filter((field) => field !== 'venue')); }}
            placeholder={language === 'fr' ? 'Lieu de réception' : 'Reception venue'}
            placeholderTextColor={colors.mutedForeground}
            style={[ss.input, { color: colors.foreground, borderColor: invalidFields.includes('venue') ? colors.rose : colors.border, backgroundColor: colors.card }]}
          />

          <Text style={[ss.fieldLabel, { fontFamily: SANS_SEMIBOLD, color: colors.foreground }]}>{language === 'fr' ? 'Devise' : 'Currency'}</Text>
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
              <Text style={[ss.fieldLabel, { fontFamily: SANS_SEMIBOLD, color: colors.foreground }]}>{language === 'fr' ? 'Budget total' : 'Total budget'}</Text>
              <TextInput
                value={totalBudget}
                onChangeText={(value) => { setTotalBudget(value); setSubmitError(''); setInvalidFields((fields) => fields.filter((field) => field !== 'totalBudget')); }}
                placeholder="0"
                placeholderTextColor={colors.mutedForeground}
                keyboardType="decimal-pad"
                style={[ss.input, { color: colors.foreground, borderColor: invalidFields.includes('totalBudget') ? colors.rose : colors.border, backgroundColor: colors.card }]}
              />
            </View>
            <View style={ss.column}>
              <Text style={[ss.fieldLabel, { fontFamily: SANS_SEMIBOLD, color: colors.foreground }]}>{language === 'fr' ? 'Nombre d’invités' : 'Guest count'}</Text>
              <TextInput
                value={guestCount}
                onChangeText={(value) => { setGuestCount(value); setSubmitError(''); setInvalidFields((fields) => fields.filter((field) => field !== 'guestCount')); }}
                placeholder="0"
                placeholderTextColor={colors.mutedForeground}
                keyboardType="number-pad"
                style={[ss.input, { color: colors.foreground, borderColor: invalidFields.includes('guestCount') ? colors.rose : colors.border, backgroundColor: colors.card }]}
              />
            </View>
          </View>

          {submitError ? <Text accessibilityLiveRegion="polite" style={[ss.submitError, { color: colors.rose, fontFamily: SANS }]}>{submitError}</Text> : null}
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
                <Text style={[ss.submitButtonText, { fontFamily: SANS_SEMIBOLD }]}>{language === 'fr' ? 'Créer le mariage' : 'Create wedding'}</Text>
              </>
            )}
          </TouchableOpacity>
      </KeyboardAwareScrollViewCompat>
    </Modal>

    <TourSheet visible={tourVisible} onClose={closeTour} steps={language === 'fr' ? TOUR_STEPS : TOUR_STEPS_EN} />
    </>
  );
}

const ss = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  heroHeader: { paddingHorizontal: 20, paddingBottom: 22, overflow: 'hidden' },
  deleteButton: { minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  deletionStatus: { marginHorizontal: 16, marginTop: 12, flexDirection: 'row', alignItems: 'center', gap: 8 },
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
  input: { minHeight: 44, borderWidth: StyleSheet.hairlineWidth, borderRadius: 10, paddingHorizontal: 12, fontSize: 14, letterSpacing: 0 },
  currencyRow: { flexDirection: 'row', gap: 8 },
  currencyButton: { flex: 1, alignItems: 'center', borderWidth: StyleSheet.hairlineWidth, borderRadius: 9, paddingVertical: 11 },
  currencyText: { fontSize: 11 },
  twoColumns: { flexDirection: 'row', gap: 10 },
  column: { flex: 1 },
  submitButton: { minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 12, marginTop: 26 },
  submitError: { fontSize: 12, lineHeight: 18, marginTop: 20 },
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
