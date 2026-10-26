/**
 * Paiements — mobile screen
 * Plum gradient hero · summary card · payment list · PDF export · TourSheet
 */
import { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  SectionList,
  StyleSheet,
  TextInput,
  Alert,
  ActivityIndicator,
  Platform,
  TouchableOpacity,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import { currencySymbol, useListPayments, useCreatePayment, getListPaymentsQueryKey } from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import type { Payment } from '@workspace/api-client-react';
import { MOBILE_TAB_STALE_TIME, useActiveWedding } from '@/hooks/useActiveWedding';
import { useColors } from '@/hooks/useColors';
import { useTour } from '@/hooks/useTour';
import { SERIF, SANS, SANS_MEDIUM, SANS_SEMIBOLD } from '@/constants/fonts';
import { formatCents, formatDateShort, paymentStatusLabel } from '@/utils/format';
import { shadow } from '@/utils/shadow';
import { EmptyState } from '@/components/EmptyState';
import { DateField } from '@/components/DateField';
import { QueryErrorState } from '@/components/QueryErrorState';
import { TourSheet } from '@/components/TourSheet';
import { BottomSheet } from '@/components/BottomSheet';
import { exportPaymentsPDF } from '@/utils/payments-pdf';
import { PremiumBadge } from '@/components/PremiumBadge';
import { PremiumPageGate } from '@/components/PremiumPageGate';
import { useSubscription } from '@/lib/subscription';
import { useLocalization } from '@/context/LocalizationContext';
import { usePreferredCurrency } from '@/hooks/usePreferredCurrency';
import { organizePayments, type PaymentSection } from '@/utils/payment-list';
import { isPremiumTabDataEnabled } from '@/utils/tab-access';

// ── Tour steps ────────────────────────────────────────────────────────────────
const TOUR_STEPS = [
  {
    icon: 'credit-card',
    title: 'Vos paiements',
    description: "Consultez tous vos paiements à venir, réglés ou en retard en un coup d'œil.",
  },
  {
    icon: 'alert-circle',
    title: 'Priorités',
    description: 'Les paiements en retard apparaissent en haut avec un fond rouge. Réglez-les en priorité.',
  },
  {
    icon: 'share',
    title: 'Exporter',
    description: 'Exportez la liste en PDF pour la partager avec votre partenaire ou votre comptable.',
  },
];
const TOUR_STEPS_EN = [
  { icon: 'credit-card', title: 'Your payments', description: 'See all your upcoming, paid, and overdue payments at a glance.' },
  { icon: 'alert-circle', title: 'Priorities', description: 'Overdue payments appear first with a red background. Settle these first.' },
  { icon: 'share', title: 'Export', description: 'Export the list as a PDF to share with your partner or accountant.' },
];

// ── Payment row ───────────────────────────────────────────────────────────────
interface PaymentRowProps {
  payment: Payment;
  currency: string;
  colors: ReturnType<typeof useColors>;
  language: 'fr' | 'en';
}

function PaymentRow({ payment, currency, colors, language }: PaymentRowProps) {
  const { tone } = paymentStatusLabel(payment.status, language);
  const label = language === 'fr'
    ? ({ pending: 'En attente', scheduled: 'Programmé', paid: 'Réglé', overdue: 'En retard' }[payment.status] ?? payment.status)
    : ({ pending: 'Pending', scheduled: 'Scheduled', paid: 'Paid', overdue: 'Overdue' }[payment.status] ?? payment.status);

  const accentColor =
    tone === 'success' ? colors.sage :
    tone === 'error'   ? colors.destructive :
    tone === 'warning' ? colors.warning :
                         colors.mutedForeground;

  const badgeBg =
    tone === 'success' ? colors.sageBg :
    tone === 'error'   ? colors.destructive + '18' :
    tone === 'warning' ? colors.warningBg :
                         colors.muted;

  const isOverdue = payment.status === 'overdue';
  const initials  = payment.vendorName.slice(0, 2).toUpperCase();

  return (
    <View
      style={[
        ss.card,
        shadow('sm'),
        {
          backgroundColor: isOverdue ? '#fff8f8' : colors.card,
          borderColor: isOverdue ? colors.destructive + '40' : colors.border,
          borderWidth: isOverdue ? 1 : StyleSheet.hairlineWidth,
        },
      ]}
    >
      <View style={[ss.rim, { borderTopColor: 'rgba(255,255,255,0.65)' }]} />

      {/* Overdue left accent */}
      {isOverdue && (
        <View
          style={{
            position: 'absolute', left: 0, top: 0, bottom: 0,
            width: 3, borderTopLeftRadius: 12, borderBottomLeftRadius: 12,
            backgroundColor: colors.destructive,
          }}
        />
      )}

      <View style={[ss.cardInner, isOverdue && { paddingLeft: 18 }]}>
        {/* Avatar */}
        <View style={[ss.av, { backgroundColor: accentColor + '22' }]}>
          <Text style={[ss.avText, { fontFamily: SERIF, color: accentColor }]}>
            {initials}
          </Text>
        </View>

        {/* Info */}
        <View style={ss.cardBody}>
          <Text style={[ss.vendorName, { fontFamily: SANS_SEMIBOLD, color: colors.foreground }]} numberOfLines={1}>
            {payment.vendorName}
          </Text>
          <View style={ss.metaRow}>
            <Feather name="calendar" size={10} color={colors.mutedForeground} />
            <Text style={[ss.metaText, { fontFamily: SANS, color: colors.mutedForeground }]}>
               {formatDateShort(payment.dueDate, language)}
            </Text>
          </View>
        </View>

        {/* Right: amount + badge */}
        <View style={ss.cardRight}>
          <Text style={[ss.amount, { fontFamily: SERIF, color: isOverdue ? colors.destructive : colors.plumDark }]}>
             {formatCents(payment.amountCents, currency, language)}
          </Text>
          <View style={[ss.badge, { backgroundColor: badgeBg }]}>
            <Text style={[ss.badgeText, { fontFamily: SANS_SEMIBOLD, color: accentColor }]}>
              {label}
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
}

// ── Summary card ─────────────────────────────────────────────────────────────
interface SummaryCardProps {
  payments: Payment[];
  currency: string;
  colors: ReturnType<typeof useColors>;
  language: 'fr' | 'en';
}

function SummaryCard({ payments, currency, colors, language }: SummaryCardProps) {
  const total     = payments.reduce((s, p) => s + Number(p.amountCents ?? 0), 0);
  const paid      = payments.filter(p => p.status === 'paid').reduce((s, p) => s + Number(p.amountCents ?? 0), 0);
  const pending   = total - paid;
  const overdueCnt = payments.filter(p => p.status === 'overdue').length;
  const paidPct   = total > 0 ? Math.round((paid / total) * 100) : 0;

  return (
    <View style={[ss.summaryCard, shadow('md'), { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={[ss.rim, { borderTopColor: 'rgba(255,255,255,0.65)' }]} />
      <View style={ss.summaryRow}>
        <View style={ss.summaryItem}>
          <Text style={[ss.summaryValue, { fontFamily: SERIF, color: colors.foreground }]}>
             {formatCents(total, currency, language)}
          </Text>
          <Text style={[ss.summaryLabel, { fontFamily: SANS, color: colors.mutedForeground }]}>{language === 'fr' ? 'total' : 'total'}</Text>
        </View>
        <View style={[ss.divider, { backgroundColor: colors.border }]} />
        <View style={ss.summaryItem}>
          <Text style={[ss.summaryValue, { fontFamily: SERIF, color: colors.sage }]}>
             {formatCents(paid, currency, language)}
          </Text>
          <Text style={[ss.summaryLabel, { fontFamily: SANS, color: colors.mutedForeground }]}>{language === 'fr' ? 'réglé' : 'paid'}</Text>
        </View>
        <View style={[ss.divider, { backgroundColor: colors.border }]} />
        <View style={ss.summaryItem}>
          <Text style={[ss.summaryValue, { fontFamily: SERIF, color: overdueCnt > 0 ? colors.destructive : colors.warning }]}>
             {formatCents(pending, currency, language)}
          </Text>
          <Text style={[ss.summaryLabel, { fontFamily: SANS, color: colors.mutedForeground }]}>
            {language === 'fr' ? `restant${overdueCnt > 0 ? ` · ${overdueCnt} retard` : ''}` : `remaining${overdueCnt > 0 ? ` · ${overdueCnt} overdue` : ''}`}
          </Text>
        </View>
      </View>
      {/* Progress bar */}
      <View style={[ss.barTrack, { backgroundColor: colors.muted, marginTop: 14 }]}>
        <View style={[ss.barFill, { width: `${paidPct}%` as any, backgroundColor: colors.sage }]} />
      </View>
      <Text style={[ss.pctLabel, { fontFamily: SANS_MEDIUM, color: colors.mutedForeground }]}>
        {paidPct}% {language === 'fr' ? 'réglé' : 'paid'}
      </Text>
    </View>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────
export default function PaiementsScreen() {
  const { language } = useLocalization();
  const tr = language === 'fr' ? {
    gate: 'le suivi des paiements', eye: 'FINANCES', title: 'Paiements', exporting: 'Export…', export: 'Exporter', add: 'Ajouter',
    emptyTitle: 'Aucun paiement', emptyBody: 'Appuyez sur Ajouter pour enregistrer un nouveau paiement.',
    overdue: 'EN RETARD', due: 'À RÉGLER', paid: 'RÉGLÉS', sheet: 'FINANCES', addTitle: 'Ajouter un paiement', status: 'STATUT',
    notes: 'Notes', required: 'Informations manquantes', requiredBody: 'Renseignez le prestataire, le libellé, le montant et la date d’échéance.',
    error: 'Erreur', errorBody: 'Impossible d’ajouter ce paiement.', saving: 'Enregistrement…', save: 'Enregistrer le paiement',
    fields: ['Nom du prestataire *', 'Libellé du paiement *', 'Montant (€) *'],
  } : {
    gate: 'payment tracking', eye: 'FINANCES', title: 'Payments', exporting: 'Exporting…', export: 'Export', add: 'Add',
    emptyTitle: 'No payments', emptyBody: 'Tap Add to record a new payment.',
    overdue: 'OVERDUE', due: 'DUE', paid: 'PAID', sheet: 'FINANCES', addTitle: 'Add a payment', status: 'STATUS',
    notes: 'Notes', required: 'Missing information', requiredBody: 'Enter the vendor, description, amount, and due date.',
    error: 'Error', errorBody: 'Unable to add this payment.', saving: 'Saving…', save: 'Save payment',
    fields: ['Vendor name *', 'Payment description *', 'Amount (€) *'],
  };
  const { isActive: isPremium } = useSubscription();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { activeWedding, weddingId } = useActiveWedding();
  const preferredCurrency = usePreferredCurrency();
  const topPad = Platform.OS === 'web' ? 67 : 0;

  const { tourVisible, openTour, closeTour } = useTour('tour:paiements');
  const [addVisible, setAddVisible] = useState(false);
  const [form, setForm] = useState({ vendorName: '', description: '', amount: '', dueDate: '', notes: '' });
  const [status, setStatus] = useState<'pending' | 'paid' | 'overdue' | 'scheduled'>('pending');
  const queryClient = useQueryClient();
  const [isExporting, setIsExporting] = useState(false);

  const wId = weddingId ?? 0;
  const currency = activeWedding?.currency ?? preferredCurrency;

  const { data: payments, isLoading, isError, refetch, isRefetching } = useListPayments(wId, { query: { queryKey: getListPaymentsQueryKey(wId), enabled: isPremiumTabDataEnabled(weddingId, isPremium), staleTime: MOBILE_TAB_STALE_TIME } });
  const createPayment = useCreatePayment();

  const { sorted, sections } = useMemo(
    () => organizePayments(payments ?? []),
    [payments],
  );

  const handleExport = useCallback(async () => {
    if (!payments || isExporting) return;
    setIsExporting(true);
    try {
      await exportPaymentsPDF({
        weddingNames: activeWedding?.names ?? 'Paiements',
        weddingDate: activeWedding?.weddingDate ?? null,
        currency,
        language,
        payments: sorted.map(p => ({
          id: p.id,
          vendorName: p.vendorName,
          amountCents: p.amountCents,
          dueDate: p.dueDate,
          status: p.status,
        })),
      });
    } finally {
      setIsExporting(false);
    }
  }, [payments, activeWedding, currency, language, sorted, isExporting]);

  const fabBottom = Platform.OS === 'web' ? 94 : insets.bottom + 84;

  if (!isPremium) return <PremiumPageGate featureLabel={tr.gate} />;
  return (
    <>
      <SectionList<Payment, PaymentSection>
        sections={sections}
        style={{ flex: 1, backgroundColor: colors.background }}
        contentContainerStyle={{ paddingBottom: 160, flexGrow: 1 }}
        showsVerticalScrollIndicator={false}
        stickySectionHeadersEnabled={false}
        initialNumToRender={10}
        maxToRenderPerBatch={10}
        updateCellsBatchingPeriod={50}
        windowSize={5}
        removeClippedSubviews={Platform.OS === 'android'}
        refreshing={isRefetching}
        onRefresh={() => void refetch()}
        keyExtractor={(payment) => String(payment.id)}
        renderSectionHeader={({ section }) => {
          const sectionCopy = section.key === 'overdue'
            ? { title: tr.overdue, color: colors.destructive, backgroundColor: colors.destructive + '18' }
            : section.key === 'due'
              ? { title: tr.due, color: colors.goldDim, backgroundColor: colors.warningBg }
              : { title: tr.paid, color: colors.sageDark, backgroundColor: colors.sageBg };
          return (
            <View style={[ss.sectionRow, { backgroundColor: colors.background }]}>
              <Text style={[ss.sectionHeader, { fontFamily: SANS_SEMIBOLD, color: sectionCopy.color }]}>
                {sectionCopy.title}
              </Text>
              <View style={[ss.countBadge, { backgroundColor: sectionCopy.backgroundColor }]}>
                <Text style={[ss.countText, { fontFamily: SANS_SEMIBOLD, color: sectionCopy.color }]}>
                  {section.data.length}
                </Text>
              </View>
            </View>
          );
        }}
        renderItem={({ item }) => (
          <PaymentRow payment={item} currency={currency} colors={colors} language={language} />
        )}
        ListHeaderComponent={
          <>
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
              <Text style={[ss.eye, { fontFamily: SANS_MEDIUM, color: '#C8A96E' }]}>{tr.eye}</Text>
              <View style={ss.heroTop}>
                <View style={ss.titleRow}>
                  <Text style={[ss.title, { fontFamily: SERIF, color: '#FBF5FB' }]}>{tr.title}</Text>
                  <PremiumBadge />
                </View>
                <View style={ss.heroActions}>
                  {payments && <TouchableOpacity onPress={handleExport} disabled={isExporting} activeOpacity={0.75} style={ss.heroAction}>
                    {isExporting ? <ActivityIndicator size="small" color="#C8A96E" /> : <Feather name="share" size={14} color="#C8A96E" />}
                    <Text style={[ss.exportBtnText, { fontFamily: SANS_SEMIBOLD }]}>{isExporting ? tr.exporting : tr.export}</Text>
                  </TouchableOpacity>}
                  <TouchableOpacity onPress={() => setAddVisible(true)} style={ss.addHeaderBtn}>
                    <Feather name="plus" size={15} color="#FBF5FB" />
                    <Text style={[ss.addHeaderText, { fontFamily: SANS_SEMIBOLD }]}>{tr.add}</Text>
                  </TouchableOpacity>
                </View>
              </View>
              {activeWedding && (
                <Text style={[ss.subtitle, { fontFamily: SANS, color: '#DEC0DE' }]}>{activeWedding.names}</Text>
              )}
            </LinearGradient>
            {isError && payments !== undefined && (
              <QueryErrorState compact onRetry={refetch} retrying={isRefetching} />
            )}
            {payments && payments.length > 0 && (
              <View style={ss.content}>
                <SummaryCard payments={sorted} currency={currency} colors={colors} language={language} />
              </View>
            )}
          </>
        }
        ListEmptyComponent={
          <View style={ss.content}>
            {isLoading
              ? <View style={ss.loading}><ActivityIndicator color={colors.accent} /></View>
              : isError && !payments
                ? <QueryErrorState onRetry={refetch} retrying={isRefetching} />
              : <EmptyState icon="credit-card" title={tr.emptyTitle} subtitle={tr.emptyBody} />}
          </View>
        }
      />

      <BottomSheet visible={addVisible} onClose={() => setAddVisible(false)} eyebrow={tr.sheet} title={tr.addTitle}>
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={ss.form} showsVerticalScrollIndicator={false}>
          {([
             ['vendorName', tr.fields[0]],
             ['description', tr.fields[1]],
             ['amount', `${language === 'fr' ? 'Montant' : 'Amount'} (${currencySymbol(currency)}) *`],
          ] as const).map(([key, placeholder]) => (
            <TextInput
              key={key}
              value={form[key]}
              onChangeText={(value) => setForm((current) => ({ ...current, [key]: value }))}
              placeholder={placeholder}
              placeholderTextColor={colors.mutedForeground}
              keyboardType={key === 'amount' ? 'decimal-pad' : 'default'}
              style={[ss.formInput, { backgroundColor: colors.background, borderColor: colors.border, color: colors.foreground }]}
            />
          ))}
          <DateField value={form.dueDate} onChange={(dueDate) => setForm((current) => ({ ...current, dueDate }))} label={language === 'fr' ? 'Date d’échéance *' : 'Due date *'} />
          <Text style={[ss.formLabel, { color: colors.mutedForeground, fontFamily: SANS_MEDIUM }]}>{tr.status}</Text>
          <View style={ss.statusRow}>
            {(['pending', 'scheduled', 'paid', 'overdue'] as const).map((item) => (
              <TouchableOpacity key={item} onPress={() => setStatus(item)} style={[ss.statusChoice, { backgroundColor: status === item ? colors.plum : colors.muted, borderColor: status === item ? colors.plum : colors.border }]}>
                <Text style={[ss.statusText, { color: status === item ? '#FBF5FB' : colors.mutedForeground, fontFamily: SANS_MEDIUM }]}>{language === 'fr' ? ({ pending: 'En attente', scheduled: 'Programmé', paid: 'Réglé', overdue: 'En retard' }[item]) : ({ pending: 'Pending', scheduled: 'Scheduled', paid: 'Paid', overdue: 'Overdue' }[item])}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <TextInput value={form.notes} onChangeText={(value) => setForm((current) => ({ ...current, notes: value }))} placeholder={tr.notes} placeholderTextColor={colors.mutedForeground} multiline style={[ss.formInput, ss.formNotes, { backgroundColor: colors.background, borderColor: colors.border, color: colors.foreground }]} />
          <TouchableOpacity
            disabled={createPayment.isPending}
            onPress={() => {
              if (!form.vendorName.trim() || !form.description.trim() || !form.amount.trim() || !form.dueDate.trim()) {
                 Alert.alert(tr.required, tr.requiredBody);
                return;
              }
              createPayment.mutate({
                weddingId: wId,
                data: {
                  vendorName: form.vendorName.trim(),
                  description: form.description.trim(),
                  amountCents: Math.round((Number(form.amount.replace(',', '.')) || 0) * 100),
                  dueDate: form.dueDate.trim(),
                  status,
                  notes: form.notes.trim() || undefined,
                },
              }, {
                onSuccess: () => {
                  queryClient.invalidateQueries({ queryKey: getListPaymentsQueryKey(wId) });
                  setForm({ vendorName: '', description: '', amount: '', dueDate: '', notes: '' });
                  setStatus('pending');
                  setAddVisible(false);
                },
                 onError: () => Alert.alert(tr.error, tr.errorBody),
              });
            }}
            style={[ss.saveBtn, { backgroundColor: colors.plum, opacity: createPayment.isPending ? 0.6 : 1 }]}
          >
             <Text style={[ss.saveText, { fontFamily: SANS_SEMIBOLD }]}>{createPayment.isPending ? tr.saving : tr.save}</Text>
          </TouchableOpacity>
        </ScrollView>
      </BottomSheet>
      <TourSheet visible={tourVisible} onClose={closeTour} steps={language === 'fr' ? TOUR_STEPS : TOUR_STEPS_EN} />
    </>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const ss = StyleSheet.create({
  hero: { paddingHorizontal: 20, paddingBottom: 22, overflow: 'hidden' },
  heroTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  heroActions: { flexDirection: 'row', alignItems: 'center', gap: 7, flexShrink: 0 },
  heroAction: { flexDirection: 'row', alignItems: 'center', gap: 5, minHeight: 34, borderRadius: 9, paddingHorizontal: 10, backgroundColor: 'rgba(255,255,255,0.12)', borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(200,169,110,0.40)' },
  heroSheen: { ...StyleSheet.absoluteFillObject, height: 80 },
  goldBar: { position: 'absolute', top: 0, left: 0, right: 0, height: 1.5, backgroundColor: 'rgba(200,170,112,0.35)' },
  eye: { fontSize: 9, letterSpacing: 2, marginBottom: 4 },
  title: { fontSize: 34, lineHeight: 34, marginBottom: 2 },
  subtitle: { fontSize: 12, marginBottom: 4 },
  exportBtn: {
    position: 'absolute', right: 0,
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 10, paddingVertical: 8, borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(200,169,110,0.40)',
  },
  exportBtnText: { fontSize: 11, color: '#C8A96E' },

  content: { paddingHorizontal: 16, paddingTop: 16 },
  loading: { paddingTop: 60, alignItems: 'center' },

  sectionRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    marginTop: 20, marginBottom: 10, marginHorizontal: 16,
  },
  sectionHeader: { fontSize: 9, letterSpacing: 2 },
  countBadge: { borderRadius: 12, paddingHorizontal: 8, paddingVertical: 2 },
  countText: { fontSize: 10 },

  summaryCard: {
    borderRadius: 14, borderWidth: StyleSheet.hairlineWidth,
    padding: 16, overflow: 'hidden', marginBottom: 4,
  },
  summaryRow: { flexDirection: 'row', alignItems: 'center' },
  summaryItem: { flex: 1, alignItems: 'center' },
  summaryValue: { fontSize: 18, lineHeight: 20 },
  summaryLabel: { fontSize: 10, marginTop: 2 },
  divider: { width: StyleSheet.hairlineWidth, alignSelf: 'stretch', marginHorizontal: 4 },
  barTrack: { height: 7, borderRadius: 4, overflow: 'hidden' },
  barFill: { height: 7, borderRadius: 4 },
  pctLabel: { fontSize: 10, textAlign: 'center', marginTop: 6 },

  card: { borderRadius: 12, overflow: 'hidden', marginHorizontal: 16, marginBottom: 10 },
  rim: { position: 'absolute', left: 0, right: 0, top: 0, height: 1, borderTopWidth: 1 },
  cardInner: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 },
  av: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  avText: { fontSize: 15 },
  cardBody: { flex: 1, gap: 4 },
  vendorName: { fontSize: 13 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { fontSize: 10 },
  cardRight: { alignItems: 'flex-end', flexShrink: 0, gap: 4 },
  amount: { fontSize: 16, lineHeight: 18 },
  badge: { borderRadius: 12, paddingHorizontal: 8, paddingVertical: 3 },
  badgeText: { fontSize: 9 },
  addHeaderBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 8, borderRadius: 9, backgroundColor: 'rgba(255,255,255,0.13)' },
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
