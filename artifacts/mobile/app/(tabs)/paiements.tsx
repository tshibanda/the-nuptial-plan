/**
 * Paiements — mobile screen
 * Plum gradient hero · summary card · payment list · PDF export · TourSheet
 */
import { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Platform,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import { useListWeddings, useListPayments } from '@workspace/api-client-react';
import type { Payment } from '@workspace/api-client-react';
import { useWedding } from '@/context/WeddingContext';
import { useColors } from '@/hooks/useColors';
import { useTour } from '@/hooks/useTour';
import { SERIF, SANS, SANS_MEDIUM, SANS_SEMIBOLD } from '@/constants/fonts';
import { formatCents, formatDateShort, paymentStatusLabel } from '@/utils/format';
import { shadow } from '@/utils/shadow';
import { EmptyState } from '@/components/EmptyState';
import { TourSheet, TourHelpFab } from '@/components/TourSheet';
import { exportPaymentsPDF } from '@/utils/payments-pdf';

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

// ── Status helpers ────────────────────────────────────────────────────────────
function statusSortOrder(s: string): number {
  switch (s) {
    case 'overdue':   return 0;
    case 'pending':   return 1;
    case 'scheduled': return 2;
    case 'paid':      return 3;
    default:          return 4;
  }
}

// ── Payment row ───────────────────────────────────────────────────────────────
interface PaymentRowProps {
  payment: Payment;
  currency: string;
  colors: ReturnType<typeof useColors>;
}

function PaymentRow({ payment, currency, colors }: PaymentRowProps) {
  const { label, tone } = paymentStatusLabel(payment.status);

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
              {formatDateShort(payment.dueDate)}
            </Text>
          </View>
        </View>

        {/* Right: amount + badge */}
        <View style={ss.cardRight}>
          <Text style={[ss.amount, { fontFamily: SERIF, color: isOverdue ? colors.destructive : colors.plumDark }]}>
            {formatCents(payment.amountCents, currency)}
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
}

function SummaryCard({ payments, currency, colors }: SummaryCardProps) {
  const total     = payments.reduce((s, p) => s + p.amountCents, 0);
  const paid      = payments.filter(p => p.status === 'paid').reduce((s, p) => s + p.amountCents, 0);
  const pending   = total - paid;
  const overdueCnt = payments.filter(p => p.status === 'overdue').length;
  const paidPct   = total > 0 ? Math.round((paid / total) * 100) : 0;

  return (
    <View style={[ss.summaryCard, shadow('md'), { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={[ss.rim, { borderTopColor: 'rgba(255,255,255,0.65)' }]} />
      <View style={ss.summaryRow}>
        <View style={ss.summaryItem}>
          <Text style={[ss.summaryValue, { fontFamily: SERIF, color: colors.foreground }]}>
            {formatCents(total, currency)}
          </Text>
          <Text style={[ss.summaryLabel, { fontFamily: SANS, color: colors.mutedForeground }]}>total</Text>
        </View>
        <View style={[ss.divider, { backgroundColor: colors.border }]} />
        <View style={ss.summaryItem}>
          <Text style={[ss.summaryValue, { fontFamily: SERIF, color: colors.sage }]}>
            {formatCents(paid, currency)}
          </Text>
          <Text style={[ss.summaryLabel, { fontFamily: SANS, color: colors.mutedForeground }]}>réglé</Text>
        </View>
        <View style={[ss.divider, { backgroundColor: colors.border }]} />
        <View style={ss.summaryItem}>
          <Text style={[ss.summaryValue, { fontFamily: SERIF, color: overdueCnt > 0 ? colors.destructive : colors.warning }]}>
            {formatCents(pending, currency)}
          </Text>
          <Text style={[ss.summaryLabel, { fontFamily: SANS, color: colors.mutedForeground }]}>
            restant{overdueCnt > 0 ? ` · ${overdueCnt} retard` : ''}
          </Text>
        </View>
      </View>
      {/* Progress bar */}
      <View style={[ss.barTrack, { backgroundColor: colors.muted, marginTop: 14 }]}>
        <View style={[ss.barFill, { width: `${paidPct}%` as any, backgroundColor: colors.sage }]} />
      </View>
      <Text style={[ss.pctLabel, { fontFamily: SANS_MEDIUM, color: colors.mutedForeground }]}>
        {paidPct}% réglé
      </Text>
    </View>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────
export default function PaiementsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { selectedWeddingId } = useWedding();
  const topPad = Platform.OS === 'web' ? 67 : insets.top;

  const { tourVisible, openTour, closeTour } = useTour('tour:paiements');
  const [isExporting, setIsExporting] = useState(false);

  const { data: weddings } = useListWeddings();
  const activeWedding = weddings?.find(w => w.id === selectedWeddingId) ?? weddings?.[0];
  const wId = activeWedding?.id ?? 0;
  const currency = activeWedding?.currency ?? 'EUR';

  const { data: payments, isLoading, refetch, isRefetching } = useListPayments(wId);

  const sorted: Payment[] = [...(payments ?? [])].sort((a, b) => {
    const sA = statusSortOrder(a.status);
    const sB = statusSortOrder(b.status);
    if (sA !== sB) return sA - sB;
    return a.dueDate.localeCompare(b.dueDate);
  });

  const handleExport = useCallback(async () => {
    if (!payments || isExporting) return;
    setIsExporting(true);
    try {
      await exportPaymentsPDF({
        weddingNames: activeWedding?.names ?? 'Paiements',
        weddingDate: activeWedding?.weddingDate ?? null,
        currency,
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
  }, [payments, activeWedding, currency, sorted, isExporting]);

  const fabBottom = Platform.OS === 'web' ? 94 : insets.bottom + 84;

  // Group labels
  const overduePayments   = sorted.filter(p => p.status === 'overdue');
  const pendingPayments   = sorted.filter(p => p.status === 'pending' || p.status === 'scheduled');
  const paidPayments      = sorted.filter(p => p.status === 'paid');

  return (
    <>
      <ScrollView
        style={{ flex: 1, backgroundColor: colors.background }}
        contentContainerStyle={{ paddingBottom: 100, flexGrow: 1 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.plum} />
        }
      >
        {/* ── Hero ─────────────────────────────────────────────────────────── */}
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

          {/* Export button */}
          {payments && (
            <TouchableOpacity
              onPress={handleExport}
              disabled={isExporting}
              activeOpacity={0.75}
              style={[ss.exportBtn, { top: topPad + 16 }]}
            >
              {isExporting
                ? <ActivityIndicator size="small" color="#C8A96E" />
                : <Feather name="share" size={14} color="#C8A96E" />
              }
              <Text style={[ss.exportBtnText, { fontFamily: SANS_SEMIBOLD }]}>
                {isExporting ? 'Export…' : 'Exporter'}
              </Text>
            </TouchableOpacity>
          )}

          <Text style={[ss.eye, { fontFamily: SANS_MEDIUM, color: '#C8A96E' }]}>FINANCES</Text>
          <Text style={[ss.title, { fontFamily: SERIF, color: '#FBF5FB' }]}>Paiements</Text>
          {activeWedding && (
            <Text style={[ss.subtitle, { fontFamily: SANS, color: '#DEC0DE' }]}>{activeWedding.names}</Text>
          )}
        </LinearGradient>

        {/* ── Content ──────────────────────────────────────────────────────── */}
        <View style={ss.content}>
          {isLoading ? (
            <View style={ss.loading}><ActivityIndicator color={colors.accent} /></View>
          ) : !payments || payments.length === 0 ? (
            <EmptyState
              icon="credit-card"
              title="Aucun paiement"
              subtitle="Créez des paiements depuis l'application web."
            />
          ) : (
            <>
              <SummaryCard payments={sorted} currency={currency} colors={colors} />

              {/* Overdue */}
              {overduePayments.length > 0 && (
                <>
                  <View style={ss.sectionRow}>
                    <Text style={[ss.sectionHeader, { fontFamily: SANS_SEMIBOLD, color: colors.destructive }]}>
                      EN RETARD
                    </Text>
                    <View style={[ss.countBadge, { backgroundColor: colors.destructive + '18' }]}>
                      <Text style={[ss.countText, { fontFamily: SANS_SEMIBOLD, color: colors.destructive }]}>
                        {overduePayments.length}
                      </Text>
                    </View>
                  </View>
                  {overduePayments.map(p => (
                    <PaymentRow key={p.id} payment={p} currency={currency} colors={colors} />
                  ))}
                </>
              )}

              {/* Pending / Scheduled */}
              {pendingPayments.length > 0 && (
                <>
                  <View style={ss.sectionRow}>
                    <Text style={[ss.sectionHeader, { fontFamily: SANS_SEMIBOLD, color: colors.goldDim }]}>
                      À RÉGLER
                    </Text>
                    <View style={[ss.countBadge, { backgroundColor: colors.warningBg }]}>
                      <Text style={[ss.countText, { fontFamily: SANS_SEMIBOLD, color: colors.warning }]}>
                        {pendingPayments.length}
                      </Text>
                    </View>
                  </View>
                  {pendingPayments.map(p => (
                    <PaymentRow key={p.id} payment={p} currency={currency} colors={colors} />
                  ))}
                </>
              )}

              {/* Paid */}
              {paidPayments.length > 0 && (
                <>
                  <View style={ss.sectionRow}>
                    <Text style={[ss.sectionHeader, { fontFamily: SANS_SEMIBOLD, color: colors.sageDark }]}>
                      RÉGLÉS
                    </Text>
                    <View style={[ss.countBadge, { backgroundColor: colors.sageBg }]}>
                      <Text style={[ss.countText, { fontFamily: SANS_SEMIBOLD, color: colors.sageDark }]}>
                        {paidPayments.length}
                      </Text>
                    </View>
                  </View>
                  {paidPayments.map(p => (
                    <PaymentRow key={p.id} payment={p} currency={currency} colors={colors} />
                  ))}
                </>
              )}
            </>
          )}
        </View>
      </ScrollView>

      <TourHelpFab onPress={openTour} bottom={fabBottom} />
      <TourSheet visible={tourVisible} onClose={closeTour} steps={TOUR_STEPS} />
    </>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const ss = StyleSheet.create({
  hero: { paddingHorizontal: 20, paddingBottom: 22, overflow: 'hidden' },
  heroSheen: { ...StyleSheet.absoluteFillObject, height: 80 },
  goldBar: { position: 'absolute', top: 0, left: 0, right: 0, height: 1.5, backgroundColor: 'rgba(200,170,112,0.35)' },
  eye: { fontSize: 9, letterSpacing: 2, marginBottom: 4 },
  title: { fontSize: 34, lineHeight: 34, marginBottom: 2 },
  subtitle: { fontSize: 12, marginBottom: 4 },
  exportBtn: {
    position: 'absolute', right: 0,
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.10)',
    borderWidth: 1, borderColor: 'rgba(200,169,110,0.35)',
  },
  exportBtnText: { fontSize: 11, color: '#C8A96E' },

  content: { paddingHorizontal: 16, paddingTop: 16 },
  loading: { paddingTop: 60, alignItems: 'center' },

  sectionRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    marginTop: 20, marginBottom: 10, marginLeft: 2,
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

  card: { borderRadius: 12, overflow: 'hidden', marginBottom: 10 },
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
});
