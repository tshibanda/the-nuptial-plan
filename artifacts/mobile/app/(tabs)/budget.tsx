/**
 * Budget — mobile screen
 * Plum gradient hero · summary bar · category list · first-visit TourSheet
 */
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
import { useListWeddings, useGetBudgetSummary } from '@workspace/api-client-react';
import type { BudgetCategory } from '@workspace/api-client-react';
import { useWedding } from '@/context/WeddingContext';
import { useColors } from '@/hooks/useColors';
import { useTour } from '@/hooks/useTour';
import { SERIF, SANS, SANS_MEDIUM, SANS_SEMIBOLD } from '@/constants/fonts';
import { formatCents } from '@/utils/format';
import { shadow } from '@/utils/shadow';
import { EmptyState } from '@/components/EmptyState';
import { TourSheet, TourHelpFab } from '@/components/TourSheet';

// ── Tour steps ────────────────────────────────────────────────────────────────
const TOUR_STEPS = [
  {
    icon: 'pie-chart',
    title: 'Votre budget',
    description:
      "Suivez en un coup d\u2019\u0153il la totalit\u00e9 de votre budget allou\u00e9 et les d\u00e9penses engag\u00e9es \u00e0 ce jour.",
  },
  {
    icon: 'bar-chart-2',
    title: 'Résumé global',
    description:
      "La barre de progression vous indique visuellement le pourcentage du budget d\u00e9j\u00e0 d\u00e9pens\u00e9.",
  },
  {
    icon: 'tag',
    title: 'Par catégorie',
    description:
      "Chaque poste budg\u00e9taire est list\u00e9 avec son enveloppe et le montant r\u00e9ellement engag\u00e9.",
  },
];

// ── Category palette (cycles through) ────────────────────────────────────────
const CAT_COLORS = [
  '#eadfcf', '#dce7df', '#eadfdf', '#e1dceb', '#e0e7dc', '#dce0e7',
  '#f0e8e0', '#e0ece0', '#f0e0e4',
];

// ── Category row ─────────────────────────────────────────────────────────────
interface CategoryRowProps {
  category: BudgetCategory;
  index: number;
  currency: string;
  colors: ReturnType<typeof useColors>;
}

function CategoryRow({ category, index, currency, colors }: CategoryRowProps) {
  const pct =
    category.allocatedCents > 0
      ? Math.min(100, Math.round((category.spentCents / category.allocatedCents) * 100))
      : 0;

  const isOver = category.spentCents > category.allocatedCents;
  const barColor = isOver ? colors.destructive : pct >= 80 ? colors.warning : colors.plum;
  const avatarBg = CAT_COLORS[index % CAT_COLORS.length];
  const initials = category.name.slice(0, 2).toUpperCase();

  return (
    <View
      style={[
        ss.card,
        shadow('sm'),
        { backgroundColor: colors.card, borderColor: colors.border },
      ]}
    >
      {/* Rim sheen */}
      <View style={[ss.rim, { borderTopColor: 'rgba(255,255,255,0.65)' }]} />

      <View style={ss.cardTop}>
        {/* Avatar */}
        <View style={[ss.av, { backgroundColor: avatarBg }]}>
          <Text style={[ss.avText, { fontFamily: SERIF, color: colors.plumDark }]}>
            {initials}
          </Text>
        </View>

        {/* Info */}
        <View style={ss.cardBody}>
          <Text
            style={[ss.catName, { fontFamily: SANS_SEMIBOLD, color: colors.foreground }]}
            numberOfLines={1}
          >
            {category.name}
          </Text>

          {/* Progress bar */}
          <View style={[ss.barTrack, { backgroundColor: colors.muted }]}>
            <View
              style={[
                ss.barFill,
                { width: `${pct}%` as any, backgroundColor: barColor },
              ]}
            />
          </View>

          <View style={ss.catMeta}>
            <Text style={[ss.metaLabel, { fontFamily: SANS, color: colors.mutedForeground }]}>
              Dépensé{' '}
              <Text style={{ fontFamily: SANS_MEDIUM, color: isOver ? colors.destructive : colors.foreground }}>
                {formatCents(category.spentCents, currency)}
              </Text>
            </Text>
            <Text style={[ss.metaLabel, { fontFamily: SANS, color: colors.mutedForeground }]}>
              {pct}%
            </Text>
          </View>
        </View>

        {/* Allocated amount */}
        <View style={ss.cardRight}>
          <Text style={[ss.allocated, { fontFamily: SERIF, color: colors.plumDark }]}>
            {formatCents(category.allocatedCents, currency)}
          </Text>
          <Text style={[ss.allocLabel, { fontFamily: SANS, color: colors.mutedForeground }]}>
            alloué
          </Text>
        </View>
      </View>
    </View>
  );
}

// ── Summary bar ───────────────────────────────────────────────────────────────
interface SummaryBarProps {
  totalAllocated: number;
  totalSpent: number;
  currency: string;
  colors: ReturnType<typeof useColors>;
}

function SummaryBar({ totalAllocated, totalSpent, currency, colors }: SummaryBarProps) {
  const pct =
    totalAllocated > 0
      ? Math.min(100, Math.round((totalSpent / totalAllocated) * 100))
      : 0;
  const remaining = totalAllocated - totalSpent;
  const isOver = totalSpent > totalAllocated;
  const barColor = isOver
    ? colors.destructive
    : pct >= 80
    ? colors.warning
    : colors.plum;

  return (
    <View
      style={[
        ss.summaryCard,
        shadow('md'),
        { backgroundColor: colors.card, borderColor: colors.border },
      ]}
    >
      <View style={[ss.rim, { borderTopColor: 'rgba(255,255,255,0.65)' }]} />

      {/* Top row: dépensé vs alloué */}
      <View style={ss.summaryRow}>
        <View>
          <Text style={[ss.summaryValue, { fontFamily: SERIF, color: colors.foreground }]}>
            {formatCents(totalSpent, currency)}
          </Text>
          <Text style={[ss.summaryLabel, { fontFamily: SANS, color: colors.mutedForeground }]}>
            dépensé
          </Text>
        </View>

        <View style={[ss.pctBadge, { backgroundColor: isOver ? colors.destructive + '1A' : colors.plumBg }]}>
          <Text style={[ss.pctText, { fontFamily: SANS_SEMIBOLD, color: isOver ? colors.destructive : colors.plum }]}>
            {pct}%
          </Text>
        </View>

        <View style={{ alignItems: 'flex-end' }}>
          <Text style={[ss.summaryValue, { fontFamily: SERIF, color: colors.foreground }]}>
            {formatCents(totalAllocated, currency)}
          </Text>
          <Text style={[ss.summaryLabel, { fontFamily: SANS, color: colors.mutedForeground }]}>
            budget total
          </Text>
        </View>
      </View>

      {/* Progress bar */}
      <View style={[ss.barTrackLg, { backgroundColor: colors.muted, marginTop: 12 }]}>
        <View
          style={[ss.barFillLg, { width: `${pct}%` as any, backgroundColor: barColor }]}
        />
      </View>

      {/* Remaining */}
      <Text style={[ss.remaining, { fontFamily: SANS_MEDIUM, color: isOver ? colors.destructive : colors.mutedForeground, marginTop: 8 }]}>
        {isOver
          ? `Dépassement de ${formatCents(Math.abs(remaining), currency)}`
          : `${formatCents(remaining, currency)} restant`}
      </Text>
    </View>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────
export default function BudgetScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { selectedWeddingId } = useWedding();
  const topPad = Platform.OS === 'web' ? 67 : insets.top;

  const { tourVisible, openTour, closeTour } = useTour('tour:budget');

  const { data: weddings } = useListWeddings();
  const activeWedding = weddings?.find((w) => w.id === selectedWeddingId) ?? weddings?.[0];
  const wId = activeWedding?.id ?? 0;
  const currency = activeWedding?.currency ?? 'EUR';

  const {
    data: budgetSummary,
    isLoading,
    refetch,
    isRefetching,
  } = useGetBudgetSummary(wId);

  const categories: BudgetCategory[] = budgetSummary?.categories ?? [];

  return (
    <>
      <ScrollView
        style={{ flex: 1, backgroundColor: colors.background }}
        contentContainerStyle={{ paddingBottom: 100, flexGrow: 1 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            tintColor={colors.plum}
          />
        }
      >
        {/* ── Hero ─────────────────────────────────────────────────────────── */}
        <LinearGradient
          colors={[colors.plumDark, colors.plum, colors.plumLight]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[ss.hero, { paddingTop: topPad + 20 }]}
        >
          {/* Decorative blobs */}
          <View
            style={{
              position: 'absolute', top: -24, right: -28,
              width: 110, height: 110, borderRadius: 55,
              backgroundColor: colors.gold + '1E',
            }}
            pointerEvents="none"
          />
          <View
            style={{
              position: 'absolute', bottom: -16, left: -16,
              width: 80, height: 80, borderRadius: 40,
              backgroundColor: colors.sage + '20',
            }}
            pointerEvents="none"
          />
          <LinearGradient
            colors={['rgba(255,255,255,0.08)', 'transparent']}
            style={ss.heroSheen}
            pointerEvents="none"
          />
          <View style={ss.goldBar} />

          <Text style={[ss.eye, { fontFamily: SANS_MEDIUM, color: '#C8A96E' }]}>
            FINANCES
          </Text>
          <Text style={[ss.title, { fontFamily: SERIF, color: '#FBF5FB' }]}>
            Budget
          </Text>
          {activeWedding && (
            <Text style={[ss.subtitle, { fontFamily: SANS, color: '#DEC0DE' }]}>
              {activeWedding.names}
            </Text>
          )}
        </LinearGradient>

        {/* ── Content ──────────────────────────────────────────────────────── */}
        <View style={ss.content}>
          {isLoading ? (
            <View style={ss.loading}>
              <ActivityIndicator color={colors.accent} />
            </View>
          ) : !budgetSummary ? (
            <EmptyState
              icon="pie-chart"
              title="Aucun budget"
              subtitle="Créez votre budget depuis l'application web."
            />
          ) : (
            <>
              {/* Summary bar */}
              <SummaryBar
                totalAllocated={budgetSummary.totalAllocated}
                totalSpent={budgetSummary.totalSpent}
                currency={currency}
                colors={colors}
              />

              {/* Section header */}
              {categories.length > 0 && (
                <Text
                  style={[
                    ss.sectionHeader,
                    { fontFamily: SANS_SEMIBOLD, color: colors.goldDim },
                  ]}
                >
                  PAR CATÉGORIE
                </Text>
              )}

              {/* Category rows */}
              {categories.length === 0 ? (
                <EmptyState
                  icon="tag"
                  title="Aucune catégorie"
                  subtitle="Ajoutez des postes budgétaires depuis l'application web."
                />
              ) : (
                categories.map((cat, i) => (
                  <CategoryRow
                    key={cat.id}
                    category={cat}
                    index={i}
                    currency={currency}
                    colors={colors}
                  />
                ))
              )}
            </>
          )}
        </View>
      </ScrollView>

      {/* Tour */}
      <TourHelpFab
        onPress={openTour}
        bottom={Platform.OS === 'web' ? 94 : insets.bottom + 84}
      />
      <TourSheet visible={tourVisible} onClose={closeTour} steps={TOUR_STEPS} />
    </>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const ss = StyleSheet.create({
  // Hero
  hero: {
    paddingHorizontal: 20,
    paddingBottom: 22,
    overflow: 'hidden',
  },
  heroSheen: {
    ...StyleSheet.absoluteFillObject,
    height: 80,
  },
  goldBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 1.5,
    backgroundColor: 'rgba(200,170,112,0.35)',
  },
  eye: {
    fontSize: 9,
    letterSpacing: 2,
    marginBottom: 4,
  },
  title: {
    fontSize: 34,
    lineHeight: 34,
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 12,
    marginBottom: 4,
  },

  // Content
  content: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  loading: {
    paddingTop: 60,
    alignItems: 'center',
  },
  sectionHeader: {
    fontSize: 9,
    letterSpacing: 2,
    marginTop: 20,
    marginBottom: 10,
    marginLeft: 2,
  },

  // Summary card
  summaryCard: {
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 16,
    overflow: 'hidden',
    marginBottom: 4,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  summaryValue: {
    fontSize: 22,
    lineHeight: 24,
  },
  summaryLabel: {
    fontSize: 11,
    marginTop: 2,
  },
  pctBadge: {
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  pctText: {
    fontSize: 15,
  },
  barTrackLg: {
    height: 7,
    borderRadius: 4,
    overflow: 'hidden',
  },
  barFillLg: {
    height: 7,
    borderRadius: 4,
  },
  remaining: {
    fontSize: 11,
    textAlign: 'center',
  },

  // Category card
  card: {
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
    marginBottom: 10,
  },
  rim: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    height: 1,
    borderTopWidth: 1,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
  },
  av: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  avText: {
    fontSize: 15,
  },
  cardBody: {
    flex: 1,
    gap: 6,
  },
  catName: {
    fontSize: 13,
  },
  barTrack: {
    height: 5,
    borderRadius: 3,
    overflow: 'hidden',
  },
  barFill: {
    height: 5,
    borderRadius: 3,
  },
  catMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  metaLabel: {
    fontSize: 10,
  },
  cardRight: {
    alignItems: 'flex-end',
    flexShrink: 0,
  },
  allocated: {
    fontSize: 18,
    lineHeight: 18,
  },
  allocLabel: {
    fontSize: 9,
    marginTop: 2,
  },
});
