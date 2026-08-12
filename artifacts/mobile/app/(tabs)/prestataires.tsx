import { useState } from 'react';
import {
  FlatList, View, Text, StyleSheet, TextInput, ScrollView, Alert,
  ActivityIndicator, Platform, TouchableOpacity,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import {
  useListWeddings,
  useListVendors,
  useCreateVendor,
  useListAddressBookEntries,
  useAddAddressBookEntryToWedding,
  getListVendorsQueryKey,
} from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import { useWedding } from '@/context/WeddingContext';
import { useColors } from '@/hooks/useColors';
import { useTour } from '@/hooks/useTour';
import { SERIF, SANS, SANS_MEDIUM, SANS_SEMIBOLD } from '@/constants/fonts';
import { formatCents, vendorStatusLabel } from '@/utils/format';
import { shadow } from '@/utils/shadow';
import { StatusBadge } from '@/components/StatusBadge';
import { EmptyState } from '@/components/EmptyState';
import { VendorDetailSheet } from '@/components/VendorDetailSheet';
import { TourSheet } from '@/components/TourSheet';
import { BottomSheet } from '@/components/BottomSheet';

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
  const topPad = Platform.OS === 'web' ? 67 : 0;
  const { tourVisible, openTour, closeTour } = useTour('tour:prestataires');
  const [search, setSearch] = useState('');
  const [selectedVendorId, setSelectedVendorId] = useState<number | null>(null);
  const [addVisible, setAddVisible] = useState(false);
  const [addressBookVisible, setAddressBookVisible] = useState(false);
  const [form, setForm] = useState({ name: '', category: '', contactName: '', contactEmail: '', amount: '' });
  const queryClient = useQueryClient();

  const { data: weddings } = useListWeddings();
  const activeWedding = weddings?.find((w) => w.id === selectedWeddingId) ?? weddings?.[0];
  const wId = activeWedding?.id ?? 0;

  const { data: vendors, isLoading, refetch, isRefetching } = useListVendors(wId);
  const createVendor = useCreateVendor();
  const { data: addressBookEntries = [], isLoading: addressBookLoading } = useListAddressBookEntries();
  const addAddressBookEntry = useAddAddressBookEntryToWedding();

  const filtered = (vendors ?? []).filter(
    (v) =>
      v.name.toLowerCase().includes(search.toLowerCase()) ||
      v.category.toLowerCase().includes(search.toLowerCase()),
  );

  const handleVendorPress = (id: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedVendorId(id);
  };

  const saveVendor = () => {
    if (!form.name.trim() || !form.category.trim()) return;
    createVendor.mutate({
      weddingId: wId,
      data: {
        name: form.name.trim(), category: form.category.trim(), status: 'awaiting_contract',
        totalAmountCents: Math.round((Number(form.amount.replace(',', '.')) || 0) * 100),
        contactName: form.contactName.trim() || undefined, contactEmail: form.contactEmail.trim() || undefined,
      },
    }, {
      onSuccess: () => { queryClient.invalidateQueries({ queryKey: getListVendorsQueryKey(wId) }); setForm({ name: '', category: '', contactName: '', contactEmail: '', amount: '' }); setAddVisible(false); },
    });
  };

  const importAddressBookEntry = (addressBookId: number) => {
    if (!wId) return;
    addAddressBookEntry.mutate(
      { weddingId: wId, addressBookId },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListVendorsQueryKey(wId) });
          setAddressBookVisible(false);
          setAddVisible(false);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        },
        onError: () => Alert.alert('Erreur', 'Impossible d’ajouter ce prestataire au mariage.'),
      },
    );
  };

  return (
    <>
      <FlatList
        data={filtered}
        keyExtractor={(item) => String(item.id)}
        style={{ flex: 1, backgroundColor: colors.background }}
        contentContainerStyle={{ paddingBottom: 280, flexGrow: 1 }}
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

              <View style={ss.heroTop}>
                <View style={ss.heroTitleWrap}>
                  <Text style={[ss.eye, { fontFamily: SANS_MEDIUM, color: '#C8A96E' }]}>L'ÉQUIPE CRÉATIVE</Text>
                  <Text style={[ss.title, { fontFamily: SERIF, color: '#FBF5FB' }]}>Prestataires</Text>
                  {activeWedding && (
                    <Text style={[ss.subtitle, { fontFamily: SANS, color: '#DEC0DE' }]}>{activeWedding.names}</Text>
                  )}
                </View>
                <TouchableOpacity onPress={() => setAddVisible(true)} style={ss.addHeaderBtn}>
                  <Feather name="plus" size={15} color="#FBF5FB" /><Text style={[ss.addHeaderText, { fontFamily: SANS_SEMIBOLD }]}>Ajouter</Text>
                </TouchableOpacity>
              </View>
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
      <BottomSheet visible={addVisible} onClose={() => setAddVisible(false)} eyebrow="ÉQUIPE CRÉATIVE" title="Ajouter un prestataire">
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={ss.form} showsVerticalScrollIndicator={false}>
          <TouchableOpacity
            onPress={() => setAddressBookVisible((visible) => !visible)}
            style={[ss.addressBookBtn, { backgroundColor: colors.plumBg, borderColor: colors.plum + '40' }]}
            activeOpacity={0.75}
          >
            <Feather name="book-open" size={15} color={colors.plum} />
            <View style={ss.addressBookBtnText}>
              <Text style={[ss.addressBookTitle, { color: colors.plum, fontFamily: SANS_SEMIBOLD }]}>Importer du carnet d’adresses</Text>
              <Text style={[ss.addressBookHint, { color: colors.mutedForeground, fontFamily: SANS }]}>Ajouter un contact déjà enregistré à ce mariage</Text>
            </View>
            <Feather name={addressBookVisible ? 'chevron-up' : 'chevron-down'} size={15} color={colors.plum} />
          </TouchableOpacity>
          {addressBookVisible && (
            <View style={[ss.addressBookList, { borderColor: colors.border, backgroundColor: colors.card }]}>
              {addressBookLoading ? (
                <ActivityIndicator color={colors.plum} style={ss.addressBookLoading} />
              ) : addressBookEntries.length === 0 ? (
                <Text style={[ss.addressBookEmpty, { color: colors.mutedForeground, fontFamily: SANS }]}>Votre carnet d’adresses est encore vide.</Text>
              ) : (
                addressBookEntries.map((entry) => (
                  <TouchableOpacity
                    key={entry.id}
                    onPress={() => importAddressBookEntry(entry.id)}
                    disabled={addAddressBookEntry.isPending}
                    style={[ss.addressBookRow, { borderBottomColor: colors.border, opacity: addAddressBookEntry.isPending ? 0.6 : 1 }]}
                    activeOpacity={0.75}
                  >
                    <View style={[ss.addressBookAvatar, { backgroundColor: colors.gold + '35' }]}>
                      <Text style={[ss.addressBookAvatarText, { color: colors.plum, fontFamily: SERIF }]}>{entry.name.split(/\s+/).map((word) => word[0]).join('').slice(0, 2).toUpperCase()}</Text>
                    </View>
                    <View style={ss.addressBookInfo}>
                      <Text style={[ss.addressBookName, { color: colors.foreground, fontFamily: SANS_SEMIBOLD }]} numberOfLines={1}>{entry.name}</Text>
                      <Text style={[ss.addressBookCategory, { color: colors.mutedForeground, fontFamily: SANS }]} numberOfLines={1}>{entry.category}{entry.contactName ? ` · ${entry.contactName}` : ''}</Text>
                    </View>
                    <Feather name="plus-circle" size={17} color={colors.plum} />
                  </TouchableOpacity>
                ))
              )}
            </View>
          )}
          <Text style={[ss.orLabel, { color: colors.mutedForeground, fontFamily: SANS_MEDIUM }]}>OU SAISIR UN NOUVEAU PRESTATAIRE</Text>
          {([
            ['name', 'Nom du prestataire *'], ['category', 'Catégorie *'], ['contactName', 'Nom du contact'], ['contactEmail', 'E-mail'], ['amount', 'Montant du devis (€)'],
          ] as const).map(([key, placeholder]) => <TextInput key={key} value={form[key]} onChangeText={(value) => setForm((current) => ({ ...current, [key]: value }))} placeholder={placeholder} placeholderTextColor={colors.mutedForeground} keyboardType={key === 'amount' ? 'decimal-pad' : key === 'contactEmail' ? 'email-address' : 'default'} autoCapitalize={key === 'contactEmail' ? 'none' : 'sentences'} style={[ss.formInput, { backgroundColor: colors.background, borderColor: colors.border, color: colors.foreground }]} />)}
          <TouchableOpacity disabled={createVendor.isPending} onPress={saveVendor} style={[ss.saveBtn, { backgroundColor: colors.plum }]}><Text style={[ss.saveText, { fontFamily: SANS_SEMIBOLD }]}>{createVendor.isPending ? 'Enregistrement…' : 'Enregistrer le prestataire'}</Text></TouchableOpacity>
        </ScrollView>
      </BottomSheet>

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
  heroTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  heroTitleWrap: { flex: 1, minWidth: 0 },
  addHeaderBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, flexShrink: 0, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 9, backgroundColor: 'rgba(255,255,255,0.13)' },
  addHeaderText: { color: '#FBF5FB', fontSize: 11 },
  form: { padding: 16, gap: 10 },
  formInput: { minHeight: 44, borderWidth: 1, borderRadius: 9, paddingHorizontal: 12, fontSize: 12 },
  saveBtn: { minHeight: 46, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginTop: 4 },
  saveText: { color: '#FBF5FB', fontSize: 12 },
  addressBookBtn: { flexDirection: 'row', alignItems: 'center', gap: 9, borderWidth: 1, borderRadius: 10, padding: 11 },
  addressBookBtnText: { flex: 1, gap: 2 },
  addressBookTitle: { fontSize: 11 },
  addressBookHint: { fontSize: 9, lineHeight: 13 },
  addressBookList: { borderWidth: 1, borderRadius: 10, overflow: 'hidden' },
  addressBookLoading: { paddingVertical: 16 },
  addressBookEmpty: { padding: 14, fontSize: 11, textAlign: 'center' },
  addressBookRow: { minHeight: 58, flexDirection: 'row', alignItems: 'center', gap: 9, paddingHorizontal: 10, borderBottomWidth: StyleSheet.hairlineWidth },
  addressBookAvatar: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  addressBookAvatarText: { fontSize: 12 },
  addressBookInfo: { flex: 1, gap: 2 },
  addressBookName: { fontSize: 11 },
  addressBookCategory: { fontSize: 9 },
  orLabel: { fontSize: 8, letterSpacing: 1.1, marginTop: 2 },
});
