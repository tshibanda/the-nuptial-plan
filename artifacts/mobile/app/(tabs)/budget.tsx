/**
 * Budget — mobile screen
 * Plum gradient hero · summary bar · donut chart · category list · edit/create sheets · TourSheet
 */
import { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Platform,
  TouchableOpacity,
  RefreshControl,
  TextInput,
  Alert,
} from 'react-native';
import { exportBudgetPDF } from '@/utils/budget-pdf';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import Svg, { Path, G, Text as SvgText } from 'react-native-svg';
import {
  useGetBudgetSummary,
  getGetBudgetSummaryQueryKey,
  useUpdateBudgetCategory,
  useCreateBudgetCategory,
} from '@workspace/api-client-react';
import type { BudgetCategory } from '@workspace/api-client-react';
import { useLocalization } from '@/context/LocalizationContext';
import { useColors } from '@/hooks/useColors';
import { useActiveWedding } from '@/hooks/useActiveWedding';
import { useTour } from '@/hooks/useTour';
import { SERIF, SANS, SANS_MEDIUM, SANS_SEMIBOLD } from '@/constants/fonts';
import { formatCents } from '@/utils/format';
import { shadow } from '@/utils/shadow';
import { EmptyState } from '@/components/EmptyState';
import { TourSheet } from '@/components/TourSheet';
import { BottomSheet } from '@/components/BottomSheet';
import { usePremiumGate } from '@/hooks/usePremiumGate';
import { PaywallModal } from '@/components/PaywallModal';
import { usePreferredCurrency } from '@/hooks/usePreferredCurrency';

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
      "Chaque poste budg\u00e9taire est list\u00e9 avec son enveloppe et le montant r\u00e9ellement engag\u00e9. Appuyez sur une ligne pour modifier le montant.",
  },
];
const TOUR_STEPS_EN = [
  { icon: 'pie-chart', title: 'Your budget', description: 'Track your total allocated budget and spending to date at a glance.' },
  { icon: 'bar-chart-2', title: 'Overall summary', description: 'The progress bar visually shows the percentage of budget already spent.' },
  { icon: 'tag', title: 'By category', description: 'Each budget item shows its allocation and actual spending. Tap a row to edit the amount.' },
];

// ── Colour palettes ───────────────────────────────────────────────────────────
/** Avatar background pastels */
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
const SEL_OUTER_R = 93;
// Keep slices contiguous: category colors should flow into one another
// without separator gaps or outlines.
const GAP_DEG = 0;

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
  if (categories.length === 0) return null;

  // Prefer allocated amounts, but keep the chart useful for newly-created
  // budgets where every category starts at zero. Falling back to spent amounts
  // (and finally equal slices) prevents the donut from disappearing entirely.
  const allocatedTotal = categories.reduce((s, c) => s + Math.max(0, c.allocatedCents), 0);
  const spentTotal = categories.reduce((s, c) => s + Math.max(0, c.spentCents), 0);
  const chartTotal = allocatedTotal || spentTotal || categories.length;
  const valueFor = (category: BudgetCategory) =>
    allocatedTotal > 0
      ? Math.max(0, category.allocatedCents)
      : spentTotal > 0
        ? Math.max(0, category.spentCents)
        : 1;

  let cursor = 0;
  const slices = categories.map((cat, i) => {
    const fraction = valueFor(cat) / chartTotal;
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

      {/* Legend */}
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
  language: 'fr' | 'en';
}

function CategoryRow({ category, index, currency, colors, isSelected, chartColor, onPress, language }: CategoryRowProps) {
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
                {language === 'fr' ? 'Dépensé ' : 'Spent '}
                <Text style={{ fontFamily: SANS_MEDIUM, color: isOver ? colors.destructive : colors.foreground }}>
                  {formatCents(category.spentCents, currency)}
                </Text>
              </Text>
              <Text style={[ss.metaLabel, { fontFamily: SANS, color: colors.mutedForeground }]}>
                {pct}%
              </Text>
            </View>
          </View>

          {/* Allocated amount + edit hint */}
          <View style={ss.cardRight}>
            <Text style={[ss.allocated, { fontFamily: SERIF, color: isSelected ? chartColor : colors.plumDark }]}>
              {formatCents(category.allocatedCents, currency)}
            </Text>
            <View style={ss.editHint}>
              <Feather name="edit-2" size={9} color={colors.mutedForeground} />
              <Text style={[ss.allocLabel, { fontFamily: SANS, color: colors.mutedForeground }]}>
                {language === 'fr' ? 'allocated' : 'allocated'}
              </Text>
            </View>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

// ── Edit / Create sheet ───────────────────────────────────────────────────────
interface EditSheetProps {
  visible: boolean;
  onClose: () => void;
  category: BudgetCategory | null; // null = create mode
  weddingId: number;
  currency: string;
  onSaved: () => void;
  colors: ReturnType<typeof useColors>;
  language: 'fr' | 'en';
}

function EditCategorySheet({
  visible,
  onClose,
  category,
  weddingId,
  currency,
  onSaved,
  colors,
  language,
}: EditSheetProps) {
  const isEdit = category !== null;

  const [name, setName] = useState('');
  const [amountStr, setAmountStr] = useState('');

  useEffect(() => {
    if (!visible) return;
    if (isEdit && category) {
      setName(category.name);
      setAmountStr(String((category.allocatedCents / 100).toFixed(2)));
    } else {
      setName('');
      setAmountStr('');
    }
  }, [visible, category?.id]);

  const updateMut = useUpdateBudgetCategory({
    mutation: {
      onSuccess: () => { onSaved(); onClose(); },
      onError: () => { Alert.alert(language === 'fr' ? 'Erreur' : 'Error', language === 'fr' ? 'Impossible de modifier la catégorie.' : 'Unable to update the category.'); },
    },
  });

  const createMut = useCreateBudgetCategory({
    mutation: {
      onSuccess: () => { onSaved(); onClose(); },
      onError: () => { Alert.alert(language === 'fr' ? 'Erreur' : 'Error', language === 'fr' ? 'Impossible de créer la catégorie.' : 'Unable to create the category.'); },
    },
  });

  const isBusy = updateMut.isPending || createMut.isPending;

  const handleSave = () => {
    const parsed = parseFloat(amountStr.replace(',', '.'));
    if (isNaN(parsed) || parsed < 0) {
      Alert.alert(language === 'fr' ? 'Montant invalide' : 'Invalid amount', language === 'fr' ? 'Veuillez saisir un montant valide.' : 'Please enter a valid amount.');
      return;
    }
    const allocatedCents = Math.round(parsed * 100);

    if (isEdit && category) {
      const update: { name?: string; allocatedCents?: number } = { allocatedCents };
      if (name.trim() && name.trim() !== category.name) update.name = name.trim();
      updateMut.mutate({ weddingId, id: category.id, data: update });
    } else {
      const trimmed = name.trim();
      if (!trimmed) {
        Alert.alert(language === 'fr' ? 'Nom requis' : 'Name required', language === 'fr' ? 'Veuillez saisir un nom de catégorie.' : 'Please enter a category name.');
        return;
      }
      createMut.mutate({ weddingId, data: { name: trimmed, allocatedCents } });
    }
  };

  const currencySymbol = currency === 'EUR' ? '€' : currency === 'USD' ? '$' : currency;

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      eyebrow={isEdit ? (language === 'fr' ? 'MODIFIER' : 'EDIT') : (language === 'fr' ? 'NOUVELLE CATÉGORIE' : 'NEW CATEGORY')}
      title={isEdit ? category!.name : (language === 'fr' ? 'Ajouter un poste' : 'Add an item')}
    >
      <View style={ss.formBody}>
        <View style={ss.fieldGroup}>
          <Text style={[ss.fieldLabel, { fontFamily: SANS_SEMIBOLD, color: colors.mutedForeground }]}>
            {language === 'fr' ? 'Nom' : 'Name'}
          </Text>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder={language === 'fr' ? 'ex. Traiteur' : 'e.g. Caterer'}
            placeholderTextColor={colors.mutedForeground}
            style={[
              ss.input,
              {
                fontFamily: SANS,
                color: colors.foreground,
                backgroundColor: colors.background,
                borderColor: colors.border,
              },
            ]}
            returnKeyType="next"
            autoCapitalize="sentences"
          />
        </View>

        <View style={ss.fieldGroup}>
          <Text style={[ss.fieldLabel, { fontFamily: SANS_SEMIBOLD, color: colors.mutedForeground }]}>
            {language === 'fr' ? 'Montant alloué' : 'Allocated amount'} ({currencySymbol})
          </Text>
          <TextInput
            value={amountStr}
            onChangeText={setAmountStr}
            placeholder="0.00"
            placeholderTextColor={colors.mutedForeground}
            keyboardType="decimal-pad"
            style={[
              ss.input,
              ss.inputLarge,
              {
                fontFamily: SERIF,
                color: colors.plumDark,
                backgroundColor: colors.background,
                borderColor: colors.border,
              },
            ]}
            returnKeyType="done"
            onSubmitEditing={handleSave}
          />
        </View>

        <TouchableOpacity
          onPress={handleSave}
          disabled={isBusy}
          style={[ss.saveBtn, { backgroundColor: isBusy ? colors.muted : colors.plum }]}
          activeOpacity={0.8}
        >
          {isBusy ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={[ss.saveBtnText, { fontFamily: SANS_SEMIBOLD }]}>
              {isEdit ? (language === 'fr' ? 'Enregistrer' : 'Save') : (language === 'fr' ? 'Créer' : 'Create')}
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </BottomSheet>
  );
}

// ── Summary bar ───────────────────────────────────────────────────────────────
interface SummaryBarProps {
  totalAllocated: number;
  totalSpent: number;
  currency: string;
  colors: ReturnType<typeof useColors>;
  language: 'fr' | 'en';
}

function SummaryBar({ totalAllocated, totalSpent, currency, colors, language }: SummaryBarProps) {
  const pct =
    totalAllocated > 0
      ? Math.min(100, Math.round((totalSpent / totalAllocated) * 100))
      : 0;
  const remaining = totalAllocated - totalSpent;
  const isOver = totalSpent > totalAllocated;
  const barColor = isOver ? colors.destructive : pct >= 80 ? colors.warning : colors.plum;

  return (
    <View
      style={[
        ss.summaryCard,
        shadow('md'),
        { backgroundColor: colors.card, borderColor: colors.border },
      ]}
    >
      <View style={[ss.rim, { borderTopColor: 'rgba(255,255,255,0.65)' }]} />

      <View style={ss.summaryRow}>
        <View>
          <Text style={[ss.summaryValue, { fontFamily: SERIF, color: colors.foreground }]}>
            {formatCents(totalSpent, currency)}
          </Text>
          <Text style={[ss.summaryLabel, { fontFamily: SANS, color: colors.mutedForeground }]}>
            {language === 'fr' ? 'dépensé' : 'spent'}
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
            {language === 'fr' ? 'budget total' : 'total budget'}
          </Text>
        </View>
      </View>

      <View style={[ss.barTrackLg, { backgroundColor: colors.muted, marginTop: 12 }]}>
        <View style={[ss.barFillLg, { width: `${pct}%` as any, backgroundColor: barColor }]} />
      </View>

      <Text style={[ss.remaining, { fontFamily: SANS_MEDIUM, color: isOver ? colors.destructive : colors.mutedForeground, marginTop: 8 }]}>
        {isOver
          ? (language === 'fr' ? `Dépassement de ${formatCents(Math.abs(remaining), currency)}` : `${formatCents(Math.abs(remaining), currency)} over budget`)
          : (language === 'fr' ? `${formatCents(remaining, currency)} restant` : `${formatCents(remaining, currency)} remaining`)}
      </Text>
    </View>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────
export default function BudgetScreen() {
  const colors = useColors();
  const { language, locale } = useLocalization();
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === 'web' ? 67 : 0;

  const { tourVisible, openTour, closeTour } = useTour('tour:budget');

  // Premium gate for analytics chart
  const { paywallVisible, openPaywall, closePaywall, isPremium } = usePremiumGate();

  // Chart selection state (from task #47)
  const [selectedCatId, setSelectedCatId] = useState<number | null>(null);

  // useActiveWedding keeps the persisted selection available while the wedding
  // list is loading, so the budget request can start without waiting for it.
  const { activeWedding, weddingId: wId } = useActiveWedding();
  const preferredCurrency = usePreferredCurrency();
  const currency = activeWedding?.currency ?? preferredCurrency;

  const {
    data: budgetSummary,
    isLoading,
    refetch,
    isRefetching,
  } = useGetBudgetSummary(wId ?? 0, {
    query: {
      queryKey: getGetBudgetSummaryQueryKey(wId ?? 0),
      enabled: wId !== null,
      staleTime: 5 * 60 * 1000,
      gcTime: 30 * 60 * 1000,
    },
  });

  const categories: BudgetCategory[] = budgetSummary?.categories ?? [];

  const handleSelectCat = useCallback((id: number | null) => {
    setSelectedCatId(prev => prev === id ? null : id);
  }, []);

  // Edit / create sheet state (from task #46)
  const [editTarget, setEditTarget] = useState<BudgetCategory | null>(null);
  const [sheetMode, setSheetMode] = useState<'edit' | 'create' | null>(null);

  const openEdit = (cat: BudgetCategory) => {
    setEditTarget(cat);
    setSheetMode('edit');
    // Also highlight this category in the donut chart
    setSelectedCatId(cat.id);
  };

  const openCreate = () => {
    setEditTarget(null);
    setSheetMode('create');
  };

  const closeSheet = () => setSheetMode(null);

  // ── PDF export ──────────────────────────────────────────────────────────────
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = useCallback(async () => {
    if (!budgetSummary || isExporting) return;
    setIsExporting(true);
    try {
      await exportBudgetPDF({
        weddingNames: activeWedding?.names ?? 'Budget',
        weddingDate: activeWedding?.weddingDate ?? null,
        currency,
        totalAllocated: budgetSummary.totalAllocated,
        totalSpent: budgetSummary.totalSpent,
        categories: categories.map(c => ({
          id: c.id,
          name: c.name,
          allocatedCents: c.allocatedCents,
          spentCents: c.spentCents,
        })),
      });
    } finally {
      setIsExporting(false);
    }
  }, [budgetSummary, activeWedding, currency, categories, isExporting]);

  const fabBottom = Platform.OS === 'web' ? 94 : insets.bottom + 84;

  return (
    <>
      <ScrollView
        style={{ flex: 1, backgroundColor: colors.background }}
        contentContainerStyle={{ paddingBottom: 160, flexGrow: 1 }}
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
              {language === 'fr' ? 'FINANCES' : 'FINANCES'}
          </Text>
          <View style={ss.heroTop}>
            <Text style={[ss.title, { fontFamily: SERIF, color: '#FBF5FB' }]}>Budget</Text>
            {budgetSummary && <TouchableOpacity onPress={handleExport} disabled={isExporting} activeOpacity={0.75} style={ss.heroAction}>
              {isExporting ? <ActivityIndicator size="small" color="#C8A96E" /> : <Feather name="share" size={14} color="#C8A96E" />}
              <Text style={[ss.exportBtnText, { fontFamily: SANS_SEMIBOLD }]}>{isExporting ? (language === 'fr' ? 'Export…' : 'Exporting…') : (language === 'fr' ? 'Exporter' : 'Export')}</Text>
            </TouchableOpacity>}
          </View>
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
              title={language === 'fr' ? 'Aucun budget' : 'No budget'}
              subtitle={language === 'fr' ? "Créez votre budget depuis l'application web." : 'Create your budget in the web app.'}
            />
          ) : (
            <>
              {/* Summary bar */}
              <SummaryBar
                totalAllocated={budgetSummary.totalAllocated}
                totalSpent={budgetSummary.totalSpent}
                currency={currency}
                colors={colors}
                language={language}
              />

              {/* ── Donut chart — Premium analytics ── */}
              {categories.length > 0 && (
                isPremium ? (
                  <View
                    style={[
                      ss.chartCard,
                      shadow('sm'),
                      { backgroundColor: colors.card, borderColor: colors.border },
                    ]}
                  >
                    <View style={[ss.rim, { borderTopColor: 'rgba(255,255,255,0.65)' }]} />
                    <Text style={[ss.chartTitle, { fontFamily: SANS_SEMIBOLD, color: colors.goldDim }]}>
                      {language === 'fr' ? 'RÉPARTITION DU BUDGET' : 'BUDGET BREAKDOWN'}
                    </Text>
                    <Text style={[ss.chartHint, { fontFamily: SANS, color: colors.mutedForeground }]}>
                      {language === 'fr' ? 'Appuyez sur une tranche pour détailler' : 'Tap a segment for details'}
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
                ) : (
                  <TouchableOpacity
                    onPress={openPaywall}
                    activeOpacity={0.85}
                    style={[
                      ss.chartCard,
                      ss.paywallCard,
                      shadow('sm'),
                      { backgroundColor: colors.plumBg, borderColor: colors.plum + '40' },
                    ]}
                  >
                    <View style={[ss.rim, { borderTopColor: 'rgba(255,255,255,0.65)' }]} />
                    <View style={ss.paywallInner}>
                      <View style={[ss.paywallIcon, { backgroundColor: colors.plum }]}>
                        <Feather name="trending-up" size={20} color="#FBF5FB" />
                      </View>
                      <Text style={[ss.paywallTitle, { fontFamily: SERIF, color: colors.plumDark }]}>
                        {language === 'fr' ? 'Analytiques avancées' : 'Advanced analytics'}
                      </Text>
                      <Text style={[ss.paywallBody, { fontFamily: SANS, color: colors.mutedForeground }]}>
                        {language === 'fr' ? 'La répartition graphique par catégorie est une fonctionnalité Premium. Débloquez-la pour visualiser vos dépenses.' : 'Category chart breakdown is a Premium feature. Unlock it to view your spending.'}
                      </Text>
                      <View style={[ss.paywallCta, { backgroundColor: colors.plum }]}>
                        <Feather name="award" size={13} color="#FBF5FB" />
                        <Text style={[ss.paywallCtaText, { fontFamily: SANS_SEMIBOLD }]}>
                          {language === 'fr' ? 'Passer à Premium' : 'Upgrade to Premium'}
                        </Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                )
              )}

              {/* Section header + Ajouter button (from task #46) */}
              <View style={ss.sectionRow}>
                {categories.length > 0 && (
                  <Text
                    style={[ss.sectionHeader, { fontFamily: SANS_SEMIBOLD, color: colors.goldDim }]}
                  >
                    {language === 'fr' ? 'PAR CATÉGORIE' : 'BY CATEGORY'}
                  </Text>
                )}
                <TouchableOpacity
                  onPress={openCreate}
                  style={[ss.addBtn, { backgroundColor: colors.plumBg, borderColor: colors.plum + '40' }]}
                  activeOpacity={0.7}
                >
                  <Feather name="plus" size={13} color={colors.plum} />
                  <Text style={[ss.addBtnText, { fontFamily: SANS_SEMIBOLD, color: colors.plum }]}>
                    {language === 'fr' ? 'Ajouter' : 'Add'}
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Category rows */}
              {categories.length === 0 ? (
                <TouchableOpacity onPress={openCreate} activeOpacity={0.75}>
                  <EmptyState
                    icon="tag"
                    title={language === 'fr' ? 'Aucune catégorie' : 'No categories'}
                    subtitle={language === 'fr' ? 'Appuyez sur « Ajouter » pour créer un premier poste budgétaire.' : 'Tap “Add” to create your first budget item.'}
                  />
                </TouchableOpacity>
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
                    onPress={() => openEdit(cat)}
                    language={language}
                  />
                ))
              )}
            </>
          )}
        </View>
      </ScrollView>

      {/* Tour */}
       <TourSheet visible={tourVisible} onClose={closeTour} steps={language === 'fr' ? TOUR_STEPS : TOUR_STEPS_EN} />

      {/* Premium paywall */}
      <PaywallModal
        visible={paywallVisible}
        onClose={closePaywall}
        featureLabel={language === 'fr' ? 'Analytiques budget avancées' : 'Advanced budget analytics'}
      />

      {/* Edit / Create sheet (from task #46) */}
      <EditCategorySheet
        visible={sheetMode !== null}
        onClose={closeSheet}
        category={sheetMode === 'edit' ? editTarget : null}
        weddingId={wId ?? 0}
        currency={currency}
        onSaved={refetch}
        colors={colors}
        language={language}
      />
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
  heroTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  heroAction: { flexDirection: 'row', alignItems: 'center', gap: 5, minHeight: 34, borderRadius: 9, paddingHorizontal: 10, backgroundColor: 'rgba(255,255,255,0.12)', borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(200,169,110,0.40)' },
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
  exportBtn: {
    position: 'absolute',
    top: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(200,169,110,0.40)',
  },
  exportBtnText: {
    fontSize: 11,
    color: '#C8A96E',
  },

  // Content
  content: { paddingHorizontal: 16, paddingTop: 16 },
  loading: { paddingTop: 60, alignItems: 'center' },

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

  // Section row (header + add button)
  sectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 20,
    marginBottom: 10,
    marginLeft: 2,
  },
  sectionHeader: {
    fontSize: 9,
    letterSpacing: 2,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  addBtnText: { fontSize: 11 },

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
  editHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginTop: 2,
  },
  allocLabel: { fontSize: 9 },

  // Form (inside edit/create sheet)
  formBody: {
    paddingHorizontal: 20,
    paddingTop: 16,
    gap: 18,
  },
  fieldGroup: { gap: 6 },
  fieldLabel: {
    fontSize: 10,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  input: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 15,
  },
  inputLarge: { fontSize: 22, paddingVertical: 12 },
  saveBtn: {
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 4,
  },
  saveBtnText: { color: '#fff', fontSize: 15 },

  // Paywall teaser card (non-premium)
  paywallCard: {
    marginTop: 12,
  },
  paywallInner: {
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 22,
    gap: 10,
  },
  paywallIcon: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  paywallTitle: {
    fontSize: 22,
    lineHeight: 24,
    textAlign: 'center',
  },
  paywallBody: {
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
    maxWidth: 280,
  },
  paywallCta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 10,
    paddingHorizontal: 18,
    paddingVertical: 10,
    marginTop: 4,
  },
  paywallCtaText: {
    color: '#FBF5FB',
    fontSize: 13,
  },
});
