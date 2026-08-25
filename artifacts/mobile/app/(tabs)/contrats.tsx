import { useState } from 'react';
import {
  FlatList, View, Text, StyleSheet, TextInput, ScrollView, Alert,
  ActivityIndicator, Platform, TouchableOpacity,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useListContracts, useListWeddings, useCreateContract, getListContractsQueryKey } from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import { useWedding } from '@/context/WeddingContext';
import { useColors } from '@/hooks/useColors';
import { useTour } from '@/hooks/useTour';
import { SERIF, SANS, SANS_MEDIUM, SANS_SEMIBOLD } from '@/constants/fonts';
import { formatCents } from '@/utils/format';
import { shadow } from '@/utils/shadow';
import { EmptyState } from '@/components/EmptyState';
import { TourSheet } from '@/components/TourSheet';
import { BottomSheet } from '@/components/BottomSheet';
import { PaywallModal } from '@/components/PaywallModal';
import { PremiumBadge } from '@/components/PremiumBadge';
import { PremiumPageGate } from '@/components/PremiumPageGate';
import { usePremiumGate } from '@/hooks/usePremiumGate';
import { useLocalization } from '@/context/LocalizationContext';

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
  const { language, locale } = useLocalization();
  const tr = language === 'fr' ? {
    title: 'Contrats', add: 'Ajouter', search: 'Rechercher un prestataire…', noResults: 'Aucun résultat', noContracts: 'Aucun contrat',
    editSearch: 'Modifiez votre recherche.', empty: 'Appuyez sur Ajouter pour créer votre premier contrat.', signed: 'Signé le', noDate: 'Date non renseignée',
    gate: 'vos contrats', feature: 'Contrats prestataires', eye: 'THE NUPTIAL PLAN', documents: 'DOCUMENTS', addTitle: 'Ajouter un contrat',
    status: 'STATUT', notes: 'Notes', required: 'Prestataire requis', requiredBody: 'Saisissez le nom du prestataire.',
    error: 'Erreur', errorBody: 'Impossible d’ajouter ce contrat.', saving: 'Enregistrement…', save: 'Enregistrer le contrat',
    fields: ['Nom du prestataire *', 'Montant total (€)', 'Acompte versé (€)', 'Date de signature (AAAA-MM-JJ)'],
    statuses: { signed: 'Signé', pending: 'En attente', partial: 'Partiel', cancelled: 'Annulé' },
  } : {
    title: 'Contracts', add: 'Add', search: 'Search for a vendor…', noResults: 'No results', noContracts: 'No contracts',
    editSearch: 'Edit your search.', empty: 'Tap Add to create your first contract.', signed: 'Signed on', noDate: 'No date provided',
    gate: 'your contracts', feature: 'Vendor contracts', eye: 'THE NUPTIAL PLAN', documents: 'DOCUMENTS', addTitle: 'Add a contract',
    status: 'STATUS', notes: 'Notes', required: 'Vendor required', requiredBody: 'Enter the vendor name.',
    error: 'Error', errorBody: 'Unable to add this contract.', saving: 'Saving…', save: 'Save contract',
    fields: ['Vendor name *', 'Total amount (€)', 'Deposit paid (€)', 'Signature date (YYYY-MM-DD)'],
    statuses: { signed: 'Signed', pending: 'Pending', partial: 'Partial', cancelled: 'Cancelled' },
  };
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { selectedWeddingId } = useWedding();
  const topPad = Platform.OS === 'web' ? 67 : 0;
  const { tourVisible, openTour, closeTour } = useTour('tour:contrats');
  const { paywallVisible, closePaywall, requirePremium, isPremium } = usePremiumGate();
  const [search, setSearch] = useState('');
  const [addVisible, setAddVisible] = useState(false);
  const [form, setForm] = useState({ vendorName: '', amount: '', deposit: '', signedDate: '', notes: '' });
  const [status, setStatus] = useState<'pending' | 'signed' | 'partial' | 'cancelled'>('pending');
  const queryClient = useQueryClient();
  const createContract = useCreateContract();

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

  if (!isPremium) return <PremiumPageGate featureLabel={tr.gate} />;
  return (
    <>
      <FlatList
        data={filtered}
        keyExtractor={(item) => String(item.id)}
        style={{ flex: 1, backgroundColor: colors.background }}
        contentContainerStyle={{ paddingBottom: 160, flexGrow: 1 }}
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
              <View style={ss.heroTop}>
                <View style={ss.heroTitleWrap}>
                  <Text style={[ss.eye, { fontFamily: SANS_MEDIUM, color: '#C8A96E' }]}>THE NUPTIAL PLAN</Text>
                  <View style={ss.titleRow}>
                    <Text style={[ss.title, { fontFamily: SERIF, color: '#FBF5FB' }]}>{tr.title}</Text>
                    <PremiumBadge />
                  </View>
                  {activeWedding && (
                    <Text style={[ss.subtitle, { fontFamily: SANS, color: '#DEC0DE' }]} numberOfLines={1}>
                      {activeWedding.names}
                    </Text>
                  )}
                </View>
                <TouchableOpacity onPress={() => requirePremium(() => setAddVisible(true))} style={ss.addHeaderBtn}>
                  <Feather name="plus" size={15} color="#FBF5FB" />
                  <Text style={[ss.addHeaderText, { fontFamily: SANS_SEMIBOLD }]}>{tr.add}</Text>
                  <PremiumBadge hidden={isPremium} />
                </TouchableOpacity>
              </View>
            </LinearGradient>

            {/* Search bar */}
            <View style={[ss.searchWrap, { backgroundColor: colors.card, borderColor: colors.border }, shadow('sm')]}>
              <Feather name="search" size={16} color={colors.mutedForeground} />
              <TextInput
                style={[ss.searchInput, { fontFamily: SANS, color: colors.foreground }]}
                placeholder={tr.search}
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
              title={search ? tr.noResults : tr.noContracts}
              subtitle={search ? tr.editSearch : tr.empty}
            />
          </View>
        }
        renderItem={({ item }) => {
          const statusInfo = STATUS_COLORS[item.status] ?? STATUS_COLORS.pending;
          const label = tr.statuses[item.status as keyof typeof tr.statuses] ?? item.status;

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
                         {tr.signed} {new Date(item.signedDate).toLocaleDateString(locale, { day: 'numeric', month: 'long', year: 'numeric' })}
                      </Text>
                    ) : (
                       <Text style={[ss.dateText, { fontFamily: SANS, color: colors.mutedForeground }]}>{tr.noDate}</Text>
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

      <PaywallModal
        visible={paywallVisible}
        onClose={closePaywall}
        featureLabel={tr.feature}
      />
      <BottomSheet visible={addVisible} onClose={() => setAddVisible(false)} eyebrow={tr.documents} title={tr.addTitle}>
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={ss.form} showsVerticalScrollIndicator={false}>
          {([
            ['vendorName', tr.fields[0]], ['amount', tr.fields[1]], ['deposit', tr.fields[2]], ['signedDate', tr.fields[3]],
          ] as const).map(([key, placeholder]) => (
            <TextInput key={key} value={form[key]} onChangeText={(value) => setForm((current) => ({ ...current, [key]: value }))} placeholder={placeholder} placeholderTextColor={colors.mutedForeground} keyboardType={key === 'amount' || key === 'deposit' ? 'decimal-pad' : 'default'} style={[ss.formInput, { backgroundColor: colors.background, borderColor: colors.border, color: colors.foreground }]} />
          ))}
          <Text style={[ss.formLabel, { color: colors.mutedForeground, fontFamily: SANS_MEDIUM }]}>{tr.status}</Text>
          <View style={ss.statusRow}>{(['pending', 'signed', 'partial', 'cancelled'] as const).map((item) => <TouchableOpacity key={item} onPress={() => setStatus(item)} style={[ss.statusChoice, { backgroundColor: status === item ? colors.plum : colors.muted, borderColor: status === item ? colors.plum : colors.border }]}><Text style={[ss.statusText, { color: status === item ? '#FBF5FB' : colors.mutedForeground, fontFamily: SANS_MEDIUM }]}>{tr.statuses[item]}</Text></TouchableOpacity>)}</View>
          <TextInput value={form.notes} onChangeText={(value) => setForm((current) => ({ ...current, notes: value }))} placeholder={tr.notes} placeholderTextColor={colors.mutedForeground} multiline style={[ss.formInput, ss.formNotes, { backgroundColor: colors.background, borderColor: colors.border, color: colors.foreground }]} />
          <TouchableOpacity disabled={createContract.isPending} onPress={() => {
            if (!form.vendorName.trim()) { Alert.alert(tr.required, tr.requiredBody); return; }
            createContract.mutate({ weddingId: wId, data: { vendorName: form.vendorName.trim(), status, totalAmountCents: Math.round((Number(form.amount.replace(',', '.')) || 0) * 100), depositPaidCents: Math.round((Number(form.deposit.replace(',', '.')) || 0) * 100), signedDate: form.signedDate.trim() || undefined, notes: form.notes.trim() || undefined } }, { onSuccess: () => { queryClient.invalidateQueries({ queryKey: getListContractsQueryKey(wId) }); setForm({ vendorName: '', amount: '', deposit: '', signedDate: '', notes: '' }); setStatus('pending'); setAddVisible(false); }, onError: () => Alert.alert(tr.error, tr.errorBody) });
          }} style={[ss.saveBtn, { backgroundColor: colors.plum }]}><Text style={[ss.saveText, { fontFamily: SANS_SEMIBOLD }]}>{createContract.isPending ? tr.saving : tr.save}</Text></TouchableOpacity>
        </ScrollView>
      </BottomSheet>
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
  heroTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  heroTitleWrap: { flex: 1, minWidth: 0 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  addHeaderBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, flexShrink: 0, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 9, backgroundColor: 'rgba(255,255,255,0.13)' },
  addHeaderText: { color: '#FBF5FB', fontSize: 11 },
  form: { padding: 16, gap: 10 },
  formInput: { minHeight: 44, borderWidth: 1, borderRadius: 9, paddingHorizontal: 12, fontSize: 12 },
  formNotes: { minHeight: 72, paddingTop: 12, textAlignVertical: 'top' },
  formLabel: { fontSize: 9, letterSpacing: 1.2, marginTop: 4 },
  statusRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  statusChoice: { borderWidth: 1, borderRadius: 9, paddingHorizontal: 10, minHeight: 36, justifyContent: 'center' },
  statusText: { fontSize: 10 },
  saveBtn: { minHeight: 46, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginTop: 4 },
  saveText: { color: '#FBF5FB', fontSize: 12 },
});
