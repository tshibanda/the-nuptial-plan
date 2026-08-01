/**
 * Budget — mobile screen
 * Plum gradient hero · summary bar · donut chart · category list · TourSheet
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
import Svg, { Path, G, Text as SvgText, Circle } from 'react-native-svg';
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
import { useState, useCallback } from 'react';

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
    title: 'R\u00e9sum\u00e9 global',
    description:
      "La barre de progression vous indique visuellement le pourcentage du budget d\u00e9j\u00e0 d\u00e9pens\u00e9.",
  },
  {
    icon: 'tag',
    title: 'Par cat\u00e9gorie',
    description:
      "Chaque poste budg\u00e9taire est list\u00e9 avec son enveloppe et le montant r\u00e9ellement engag\u00e9.",
  },
];

// ── Colour palettes ───────────────────────────────────────────────────────────
/** Avatar background pastels (existing) */
const CAT_COLORS = [
  '#eadfcf', '#dce7df', '#eadfdf', '#e1dceb', '#e0e7dc', '#dce0e7',
  '#f0e8e0', '#e0ece0', '#f0e0e4',
];

/** Vivid brand-aligned colours for the donut chart */
const CHART_COLORS = [
  '#5D2D5D', // plum
  '#C8A96E', // gold
  '#CC8C94', // rose
  '#6B8C72', // sage
  '#9B89C4', // lavender
  '#6B8FC0', // blue
  '#7A4A7A', // plum-light
  '#A8893E', // gold-dim
  '#A0606A', // rose-dark
  '#4A6A4A', // sage-dark
];

// ── Donut chart math ──────────────────────────────────────────────────────────
const CHART_SIZE = 200;
const CX = CHART_SIZE / 2;
const CY = CHART_SIZE / 2;
const OUTER_R = 86;
const INNER_R = 52;
const SEL_OUTER_R = 93; // expanded radius when selected
const GAP_DEG = 2.5;    // gap between slices

function polarToCartesian(cx: number, cy: number, r: number, deg: number) {
  const rad = ((deg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function slicePath(
  cx: number, cy: number,
  outerR: number, innerR: number,
  startDeg: number, endDeg: number,
): string {
  const o1 = polarToCartesian(cx, cy, outerR, startDeg);
  const o2 = polarToCartesian(cx, cy, outerR, endDeg);
  const i1 = polarToCartesian(cx, cy, innerR, endDeg);
  const i2 = polarToCartesian(cx, cy, innerR, startDeg);
  const large = endDeg - startDeg > 180 ? 1 : 0;
  return [
    `M ${o1.x.toFixed(3)} ${o1.y.toFixed(3)}`,
    `A ${outerR} ${outerR} 0 ${large} 1 ${o2.x.toFixed(3)} ${o2.y.toFixed(3)}`,
    `L ${i1.x.toFixed(3)} ${i1.y.toFixed(3)}`,
    `A ${innerR} ${innerR} 0 ${large} 0 ${i2.x.toFixed(3)} ${i2.y.toFixed(3)}`,
    'Z',
  ].join(' ');
}

// ── Donut chart component ─────────────────────────────────────────────────────
interface DonutChartProps {
  categories: BudgetCategory[];
  selectedId: number | null;
  onSelect: (id: number | null) => void;
  totalSpent: number;
  totalAllocated: number;
  currency: string;
  colors: ReturnType<typeof useColors>;
}

function DonutChart({
  categories, selectedId, onSelect,
  totalSpent, totalAllocated, currency, colors,
}: DonutChartProps) {
  const total = categories.reduce((s, c) => s + c.allocatedCents, 0);
  if (total === 0 || categories.length === 0) return null;

  // Build slice descriptors
  let cursor = 0;
  const slices = categories.map((cat, i) => {
    const fraction = cat.allocatedCents / total;
    const sweep = fraction * 360;
    const startDeg = cursor + GAP_DEG / 2;
    const endDeg = cursor + sweep - GAP_DEG / 2;
    cursor += sweep;
    const color = CHART_COLORS[i % CHART_COLORS.length]!;
    const isSelected = selectedId === cat.id;
    const hasArc = sweep > GAP_DEG + 0.5;
    const oR = isSelected ? SEL_OUTER_R : OUTER_R;
    return {
      cat, color, isSelected, hasArc,
      path: hasArc ? slicePath(CX, CY, oR, INNER_R, startDeg, endDeg) : null,
    };
  });

  // Centre label
  const selectedCat = selectedId !== null
    ? categories.find(c => c.id === selectedId)
    : null;

  const pct = totalAllocated > 0
    ? Math.round((totalSpent / totalAllocated) * 100)
    : 0;

  const centreLine1 = selectedCat
    ? selectedCat.name.length > 10 ? selectedCat.name.slice(0, 9) + '\u2026' : selectedCat.name
    : `${pct}%`;
  const centreLine2 = selectedCat
    ? formatCents(selectedCat.spentCents, currency)
    : 'd\u00e9pens\u00e9';

  const hasSelection = selectedId !== null;

  return (
    <View style={chartSS.wrap}>
      {/* SVG donut */}
      <Svg width={CHART_SIZE} height={CHART_SIZE} viewBox={`0 0 ${CHART_SIZE} ${CHART_SIZE}`}>
        <G>
          {slices.map(({ cat, path, color, isSelected }) =>
            path ? (
              <Path
                key={cat.id}
                d={path}
                fill={color}
                opacity={hasSelection && !isSelected ? 0.30 : 1}
                onPress={() => onSelect(isSelected ? null : cat.id)}
              />
            ) : null,
          )}
        </G>

        {/* Centre hole label */}
        <SvgText
          x={CX}
          y={CY - 5}
          textAnchor="middle"
          fontSize={selectedCat ? 11 : 18}
          fontWeight="bold"
          fill={colors.plumDark}
        >
          {centreLine1}
        </SvgText>
        <SvgText
          x={CX}
          y={CY + 13}
          textAnchor="middle"
          fontSize={9}
          fill={colors.mutedForeground}
        >
          {centreLine2}
        </SvgText>
      </Svg>

      {/* Legend — 2-column wrap */}
      <View style={chartSS.legend}>
        {slices.map(({ cat, color, isSelected }) => (
          <TouchableOpacity
            key={cat.id}
            onPress={() => onSelect(isSelected ? null : cat.id)}
            style={[
              chartSS.legendItem,
              isSelected && { opacity: 1 },
              hasSelection && !isSelected && { opacity: 0.40 },
            ]}
            activeOpacity={0.7}
          >
            <View style={[chartSS.legendDot, { backgroundColor: color }]} />
            <Text
              style={[
                chartSS.legendLabel,
                { color: isSelected ? colors.foreground : colors.mutedForeground },
                isSelected && { fontFamily: SANS_SEMIBOLD },
              ]}
              numberOfLines={1}
            >
              {cat.name}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const chartSS = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  legend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    marginTop: 8,
    paddingHorizontal: 8,
    gap: 4,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 20,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    flexShrink: 0,
  },
  legendLabel: {
    fontSize: 10,
    fontFamily: SANS,
    maxWidth: 90,
  },
});

// ── Category row ─────────────────────────────────────────────────────────────
interface CategoryRowProps {
  category: BudgetCategory;
  index: number;
  currency: string;
  colors: ReturnType<typeof useColors>;
  isSelected: boolean;
  chartColor: string;
  onPress: () => void;
}

function CategoryRow({ category, index, currency, colors, isSelected, chartColor, onPress }: CategoryRowProps) {
  const pct =
    category.allocatedCents > 0
      ? Math.min(100, Math.round((category.spentCents / category.allocatedCents) * 100))
      : 0;

  const isOver = category.spentCents > category.allocatedCents;
  const barColor = isOver ? colors.destructive : pct >= 80 ? colors.warning : colors.plum;
  const avatarBg = CAT_COLORS[index % CAT_COLORS.length]!;
  const initials = category.name.slice(0, 2).toUpperCase();

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.75}>
      <View
        style={[
          ss.card,
          shadow('sm'),
          {
            backgroundColor: colors.card,
            borderColor: isSelected ? chartColor : colors.border,
            borderWidth: isSelected ? 1.5 : StyleSheet.hairlineWidth,
          },
        ]}
      >
        {/* Rim sheen */}
        <View style={[ss.rim, { borderTopColor: 'rgba(255,255,255,0.65)' }]} />

        {/* Selected accent bar on the left */}
        {isSelected && (
          <View
            style={{
              position: 'absolute', left: 0, top: 0, bottom: 0,
              width: 3, borderTopLeftRadius: 12, borderBottomLeftRadius: 12,
              backgroundColor: chartColor,
            }}
          />
        )}

        <View style={[ss.cardTop, isSelected && { paddingLeft: 18 }]}>
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
                  { width: `${pct}%` as any, backgroundColor: isSelected ? chartColor : barColor },
                ]}
              />
            </View>

            <View style={ss.catMeta}>
              <Text style={[ss.metaLabel, { fontFamily: SANS, color: colors.mutedForeground }]}>
                {'D\u00e9pens\u00e9 '}
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
            <Text style={[ss.allocated, { fontFamily: SERIF, color: isSelected ? chartColor : colors.plumDark }]}>
              {formatCents(category.allocatedCents, currency)}
            </Text>
            <Text style={[ss.allocLabel, { fontFamily: SANS, color: colors.mutedForeground }]}>
              allou\u00e9
            </Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
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
            d\u00e9pens\u00e9
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
      <Text
        style={[
          ss.remaining,
          {
            fontFamily: SANS_MEDIUM,
            color: isOver ? colors.destructive : colors.mutedForeground,
            marginTop: 8,
          },
        ]}
      >
        {isOver
          ? `D\u00e9passement de ${formatCents(Math.abs(remaining), currency)}`
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

  const [selectedCatId, setSelectedCatId] = useState<number | null>(null);

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

  const handleSelectCat = useCallback((id: number | null) => {
    setSelectedCatId(prev => prev === id ? null : id);
  }, []);

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
              subtitle="Cr\u00e9ez votre budget depuis l\u2019application web."
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

              {/* ── Donut chart ── */}
              {categories.length > 0 && (
                <View
                  style={[
                    ss.chartCard,
                    shadow('sm'),
                    { backgroundColor: colors.card, borderColor: colors.border },
                  ]}
                >
                  <View style={[ss.rim, { borderTopColor: 'rgba(255,255,255,0.65)' }]} />
                  <Text
                    style={[ss.chartTitle, { fontFamily: SANS_SEMIBOLD, color: colors.goldDim }]}
                  >
                    R\u00c9PARTITION DU BUDGET
                  </Text>
                  <Text
                    style={[ss.chartHint, { fontFamily: SANS, color: colors.mutedForeground }]}
                  >
                    Appuyez sur une tranche pour d\u00e9tailler
                  </Text>
                  <DonutChart
                    categories={categories}
                    selectedId={selectedCatId}
                    onSelect={handleSelectCat}
                    totalSpent={budgetSummary.totalSpent}
                    totalAllocated={budgetSummary.totalAllocated}
                    currency={currency}
                    colors={colors}
                  />
                </View>
              )}

              {/* Section header */}
              {categories.length > 0 && (
                <Text
                  style={[
                    ss.sectionHeader,
                    { fontFamily: SANS_SEMIBOLD, color: colors.goldDim },
                  ]}
                >
                  PAR CAT\u00c9GORIE
                </Text>
              )}

              {/* Category rows */}
              {categories.length === 0 ? (
                <EmptyState
                  icon="tag"
                  title="Aucune cat\u00e9gorie"
                  subtitle="Ajoutez des postes budg\u00e9taires depuis l\u2019application web."
                />
              ) : (
                categories.map((cat, i) => (
                  <CategoryRow
                    key={cat.id}
                    category={cat}
                    index={i}
                    currency={currency}
                    colors={colors}
                    isSelected={selectedCatId === cat.id}
                    chartColor={CHART_COLORS[i % CHART_COLORS.length]!}
                    onPress={() => handleSelectCat(cat.id)}
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
    top: 0, left: 0, right: 0,
    height: 1.5,
    backgroundColor: 'rgba(200,170,112,0.35)',
  },
  eye: { fontSize: 9, letterSpacing: 2, marginBottom: 4 },
  title: { fontSize: 34, lineHeight: 34, marginBottom: 2 },
  subtitle: { fontSize: 12, marginBottom: 4 },

  // Content
  content: { paddingHorizontal: 16, paddingTop: 16 },
  loading: { paddingTop: 60, alignItems: 'center' },
  sectionHeader: {
    fontSize: 9, letterSpacing: 2,
    marginTop: 20, marginBottom: 10, marginLeft: 2,
  },

  // Chart card
  chartCard: {
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
    marginTop: 12,
    paddingTop: 14,
    paddingBottom: 10,
  },
  chartTitle: { fontSize: 9, letterSpacing: 2, textAlign: 'center' },
  chartHint: { fontSize: 10, textAlign: 'center', marginTop: 2, opacity: 0.6 },

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
  summaryValue: { fontSize: 22, lineHeight: 24 },
  summaryLabel: { fontSize: 11, marginTop: 2 },
  pctBadge: { borderRadius: 20, paddingHorizontal: 12, paddingVertical: 5 },
  pctText: { fontSize: 15 },
  barTrackLg: { height: 7, borderRadius: 4, overflow: 'hidden' },
  barFillLg: { height: 7, borderRadius: 4 },
  remaining: { fontSize: 11, textAlign: 'center' },

  // Category card
  card: {
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 10,
  },
  rim: {
    position: 'absolute', left: 0, right: 0, top: 0,
    height: 1, borderTopWidth: 1,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
  },
  av: {
    width: 40, height: 40, borderRadius: 20,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  avText: { fontSize: 15 },
  cardBody: { flex: 1, gap: 6 },
  catName: { fontSize: 13 },
  barTrack: { height: 5, borderRadius: 3, overflow: 'hidden' },
  barFill: { height: 5, borderRadius: 3 },
  catMeta: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  metaLabel: { fontSize: 10 },
  cardRight: { alignItems: 'flex-end', flexShrink: 0 },
  allocated: { fontSize: 18, lineHeight: 18 },
  allocLabel: { fontSize: 9, marginTop: 2 },
});
