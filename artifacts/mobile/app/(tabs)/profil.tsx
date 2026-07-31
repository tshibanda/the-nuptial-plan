import {
  ScrollView, View, Text, StyleSheet, Platform, TouchableOpacity,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useListWeddings, useGetWeddingSummary } from '@workspace/api-client-react';
import { useWedding } from '@/context/WeddingContext';
import { useColors } from '@/hooks/useColors';
import { SERIF, SANS, SANS_MEDIUM, SANS_SEMIBOLD } from '@/constants/fonts';
import { formatCents } from '@/utils/format';

function RowItem({ icon, label, value, accent, colors }: {
  icon: string; label: string; value?: string; accent?: boolean;
  colors: ReturnType<typeof useColors>;
}) {
  return (
    <View style={[ss.row, { borderBottomColor: colors.border }]}>
      <View style={[ss.rowIcon, { backgroundColor: accent ? colors.goldLight : colors.background }]}>
        <Feather name={icon as any} size={15} color={accent ? colors.goldDim : colors.mutedForeground} />
      </View>
      <Text style={[ss.rowLabel, { fontFamily: SANS, color: colors.foreground }]}>{label}</Text>
      {value ? <Text style={[ss.rowValue, { fontFamily: SANS_MEDIUM, color: colors.mutedForeground }]}>{value}</Text> : null}
      <Feather name="chevron-right" size={14} color={colors.border} />
    </View>
  );
}

export default function ProfilScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { selectedWeddingId } = useWedding();
  const topPad = Platform.OS === 'web' ? 67 : insets.top;

  const { data: weddings } = useListWeddings();
  const activeWedding = weddings?.find((w) => w.id === selectedWeddingId) ?? weddings?.[0];
  const wId = activeWedding?.id ?? 0;

  const { data: summary } = useGetWeddingSummary(wId);

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{ paddingBottom: Platform.OS === 'web' ? 100 : 100 }}
      showsVerticalScrollIndicator={false}
    >
      {/* Profile header */}
      <LinearGradient colors={[colors.navyDark, colors.navy]} style={[ss.hero, { paddingTop: topPad + 24 }]}>
        <View style={[ss.avatarCircle, { borderColor: 'rgba(200,170,112,0.4)' }]}>
          <Text style={[ss.avatarText, { fontFamily: SERIF }]}>EC</Text>
        </View>
        <Text style={[ss.name, { fontFamily: SERIF }]}>Élise Caron</Text>
        <Text style={[ss.role, { fontFamily: SANS_MEDIUM }]}>Directrice artistique</Text>
        <Text style={[ss.brand, { fontFamily: SANS }]}>The Nuptial Plan · Atelier nuptial</Text>
      </LinearGradient>

      <View style={{ paddingHorizontal: 16 }}>
        {/* Active wedding summary */}
        {activeWedding && (
          <View style={[ss.summaryCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={ss.summaryTop}>
              <View>
                <Text style={[ss.summaryEye, { fontFamily: SANS_SEMIBOLD, color: colors.goldDim }]}>MARIAGE ACTIF</Text>
                <Text style={[ss.summaryNames, { fontFamily: SERIF, color: colors.foreground }]}>{activeWedding.names}</Text>
              </View>
              <View style={[ss.summaryBadge, { backgroundColor: colors.successBg }]}>
                <Text style={[ss.summaryBadgeText, { fontFamily: SANS_SEMIBOLD, color: colors.success }]}>Actif</Text>
              </View>
            </View>
            {summary && (
              <View style={[ss.summaryStats, { borderTopColor: colors.border }]}>
                {[
                  { label: 'Invités', value: `${summary.confirmedGuests}/${summary.totalGuests}` },
                  { label: 'Prestataires', value: String(summary.vendorCount) },
                  { label: 'Budget', value: formatCents(summary.budgetTotal, activeWedding.currency) },
                ].map((s) => (
                  <View key={s.label} style={ss.summaryStat}>
                    <Text style={[ss.summaryStatVal, { fontFamily: SERIF, color: colors.foreground }]}>{s.value}</Text>
                    <Text style={[ss.summaryStatLabel, { fontFamily: SANS, color: colors.mutedForeground }]}>{s.label}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}

        {/* Quick actions */}
        <Text style={[ss.section, { fontFamily: SANS_SEMIBOLD, color: colors.mutedForeground }]}>GESTION</Text>
        <View style={[ss.group, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <RowItem icon="heart" label="Mes mariages" value={String(weddings?.length ?? 0)} accent colors={colors} />
          <RowItem icon="users" label="Invités" value={summary ? `${summary.totalGuests} invités` : undefined} colors={colors} />
          <RowItem icon="briefcase" label="Prestataires" value={summary ? `${summary.vendorCount}` : undefined} colors={colors} />
          <RowItem icon="file-text" label="Contrats" colors={colors} />
        </View>

        <Text style={[ss.section, { fontFamily: SANS_SEMIBOLD, color: colors.mutedForeground }]}>APPLICATION</Text>
        <View style={[ss.group, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <RowItem icon="settings" label="Paramètres" colors={colors} />
          <RowItem icon="bell" label="Notifications" colors={colors} />
          <RowItem icon="help-circle" label="Aide & support" colors={colors} />
        </View>

        {/* App info */}
        <View style={ss.appInfo}>
          <View style={ss.logoRow}>
            <View style={[ss.logoN, { borderColor: colors.goldDim }]}>
              <Text style={[ss.logoNText, { fontFamily: SERIF, color: colors.goldDim }]}>N</Text>
            </View>
            <Text style={[ss.logoLabel, { fontFamily: SERIF, color: colors.foreground }]}>The Nuptial Plan</Text>
          </View>
          <Text style={[ss.version, { fontFamily: SANS, color: colors.tertiaryText }]}>Version 1.0.0 · Atelier de planification nuptiale</Text>
        </View>
      </View>
    </ScrollView>
  );
}

const ss = StyleSheet.create({
  hero: { paddingHorizontal: 20, paddingBottom: 28, alignItems: 'center' },
  avatarCircle: { width: 72, height: 72, borderRadius: 36, backgroundColor: 'rgba(200,170,112,0.15)', borderWidth: 1.5, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  avatarText: { fontSize: 32, color: '#c8aa70', lineHeight: 34 },
  name: { fontSize: 30, color: '#f8f3ea', marginBottom: 4 },
  role: { fontSize: 12, color: '#c8aa70', letterSpacing: 0.5, marginBottom: 2 },
  brand: { fontSize: 10, color: '#8eacaa', letterSpacing: 0.3 },
  summaryCard: { borderRadius: 8, borderWidth: StyleSheet.hairlineWidth, marginTop: 16, overflow: 'hidden' },
  summaryTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', padding: 14 },
  summaryEye: { fontSize: 8, letterSpacing: 1.4, marginBottom: 3 },
  summaryNames: { fontSize: 20, lineHeight: 22 },
  summaryBadge: { borderRadius: 4, paddingHorizontal: 8, paddingVertical: 3 },
  summaryBadgeText: { fontSize: 10 },
  summaryStats: { flexDirection: 'row', borderTopWidth: StyleSheet.hairlineWidth, paddingVertical: 12 },
  summaryStat: { flex: 1, alignItems: 'center', gap: 2 },
  summaryStatVal: { fontSize: 20, lineHeight: 20 },
  summaryStatLabel: { fontSize: 9 },
  section: { fontSize: 9, letterSpacing: 1.5, marginTop: 24, marginBottom: 8 },
  group: { borderRadius: 8, borderWidth: StyleSheet.hairlineWidth, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth },
  rowIcon: { width: 32, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  rowLabel: { flex: 1, fontSize: 13 },
  rowValue: { fontSize: 12, marginRight: 4 },
  appInfo: { alignItems: 'center', paddingTop: 28, paddingBottom: 8, gap: 10 },
  logoRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  logoN: { width: 32, height: 32, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  logoNText: { fontSize: 22, lineHeight: 24 },
  logoLabel: { fontSize: 20 },
  version: { fontSize: 11 },
});
