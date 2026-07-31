import { useEffect } from 'react';
import {
  ScrollView, View, Text, StyleSheet, RefreshControl,
  ActivityIndicator, Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import {
  useListWeddings, useGetWeddingSummary, useListEvents, useListVendors,
} from '@workspace/api-client-react';
import { useWedding } from '@/context/WeddingContext';
import { useColors } from '@/hooks/useColors';
import { SERIF, SANS, SANS_MEDIUM, SANS_SEMIBOLD } from '@/constants/fonts';
import { formatCents, formatDateParts, daysUntil, vendorStatusLabel } from '@/utils/format';
import { shadow, accentShadow } from '@/utils/shadow';
import { StatusBadge } from '@/components/StatusBadge';
import { EmptyState } from '@/components/EmptyState';

export default function DashboardScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { selectedWeddingId, selectWedding } = useWedding();
  const topPad = Platform.OS === 'web' ? 67 : insets.top;

  const { data: weddings, isLoading: loadingWeddings } = useListWeddings();

  useEffect(() => {
    if (weddings && weddings.length > 0 && !selectedWeddingId) {
      selectWedding(weddings[0].id);
    }
  }, [weddings, selectedWeddingId, selectWedding]);

  const activeWedding = weddings?.find((w) => w.id === selectedWeddingId) ?? weddings?.[0];
  const wId = activeWedding?.id ?? 0;

  const { data: summary, refetch: r1, isRefetching: refreshing } = useGetWeddingSummary(wId);
  const { data: events, refetch: r2 } = useListEvents(wId);
  const { data: vendors, refetch: r3 } = useListVendors(wId);

  const onRefresh = () => { r1(); r2(); r3(); };

  if (loadingWeddings) {
    return (
      <View style={[ss.center, { backgroundColor: colors.background, paddingTop: topPad }]}>
        <ActivityIndicator color={colors.accent} size="large" />
      </View>
    );
  }

  if (!activeWedding) {
    return (
      <View style={[ss.center, { backgroundColor: colors.background, paddingTop: topPad }]}>
        <EmptyState icon="heart" title="Aucun mariage" subtitle="Créez votre premier mariage depuis l'application web." />
      </View>
    );
  }

  const upcoming = (events ?? [])
    .filter((e) => !e.completed)
    .sort((a, b) => new Date(a.eventDate).getTime() - new Date(b.eventDate).getTime())
    .slice(0, 4);

  const previewVendors = (vendors ?? []).slice(0, 3);
  const budgetPct = summary && summary.budgetTotal > 0
    ? Math.round((summary.budgetSpent / summary.budgetTotal) * 100) : 0;
  const days = Math.max(0, daysUntil(activeWedding.weddingDate));

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{ paddingBottom: 100 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />}
      showsVerticalScrollIndicator={false}
    >
      {/* ── Hero card ── */}
      <LinearGradient colors={[colors.navyDark, colors.navy]} style={[ss.hero, { paddingTop: topPad + 20 }]}>
        {/* Sheen highlight at top */}
        <LinearGradient
          colors={['rgba(255,255,255,0.07)', 'transparent']}
          style={ss.heroSheen}
          pointerEvents="none"
        />
        <Text style={[ss.heroEye, { fontFamily: SANS_MEDIUM }]}>LA CÉLÉBRATION</Text>
        <Text style={[ss.heroNames, { fontFamily: SERIF }]}>{activeWedding.names}</Text>
        <Text style={[ss.heroVenue, { fontFamily: SANS }]} numberOfLines={1}>{activeWedding.venue}</Text>
        <View style={ss.heroRow}>
          {/* Date badge — glassy */}
          <View style={ss.heroBadge}>
            <Text style={[ss.heroBadgeText, { fontFamily: SANS_MEDIUM }]}>
              {new Date(activeWedding.weddingDate).toLocaleDateString('fr-FR', {
                day: 'numeric', month: 'long', year: 'numeric',
              })}
            </Text>
          </View>
          {/* Countdown */}
          <View style={[ss.heroCountdown, accentShadow('sm')]}>
            <Text style={[ss.heroNum, { fontFamily: SERIF }]}>{days}</Text>
            <Text style={[ss.heroUnit, { fontFamily: SANS }]}>jours</Text>
          </View>
        </View>
      </LinearGradient>

      <View style={ss.body}>
        {/* ── Metrics ── */}
        <SectionTitle eyebrow="EN UN COUP D'ŒEIL" title="L'essentiel" colors={colors} />
        <View style={ss.grid}>
          <MetricCard icon="users" label="Invités confirmés"
            value={String(summary?.confirmedGuests ?? '—')}
            note={summary ? `sur ${summary.totalGuests} invités` : '—'}
            colors={colors} />
          <MetricCard icon="calendar" label="Jours restants"
            value={String(days)} note="avant la cérémonie"
            colors={colors} highlight />
          <MetricCard icon="briefcase" label="Prestataires"
            value={String(summary?.vendorCount ?? vendors?.length ?? '—')}
            note="dans votre équipe" colors={colors} />
          <MetricCard icon="trending-up" label="Budget engagé"
            value={`${budgetPct} %`}
            note={summary ? formatCents(summary.budgetSpent, activeWedding.currency) : '—'}
            colors={colors} />
        </View>

        {/* ── Upcoming events ── */}
        {upcoming.length > 0 && (
          <>
            <SectionTitle eyebrow="LES PROCHAINES SEMAINES" title="À venir" colors={colors} />
            <View style={[ss.card, shadow('sm'), { borderColor: colors.border, backgroundColor: colors.card }]}>
              {/* Top rim light */}
              <View style={[ss.rimLight, { borderTopColor: 'rgba(255,255,255,0.55)' }]} />
              {upcoming.map((evt, i) => {
                const { day, month } = formatDateParts(evt.eventDate);
                return (
                  <View
                    key={evt.id}
                    style={[ss.evtRow, i < upcoming.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border }]}
                  >
                    <View style={[ss.evtDate, { backgroundColor: i === 0 ? colors.goldLight : colors.background }, i === 0 && shadow('xs')]}>
                      <Text style={[ss.evtDay, { fontFamily: SERIF, color: colors.foreground }]}>{day}</Text>
                      <Text style={[ss.evtMonth, { fontFamily: SANS_SEMIBOLD, color: colors.mutedForeground }]}>{month}</Text>
                    </View>
                    <View style={ss.evtInfo}>
                      <Text style={[ss.evtTitle, { fontFamily: SANS_SEMIBOLD, color: colors.foreground }]} numberOfLines={1}>{evt.title}</Text>
                      {evt.detail ? <Text style={[ss.evtDetail, { fontFamily: SANS, color: colors.mutedForeground }]} numberOfLines={1}>{evt.detail}</Text> : null}
                    </View>
                    <Feather name="chevron-right" size={14} color={colors.goldDim} />
                  </View>
                );
              })}
            </View>
          </>
        )}

        {/* ── Vendor preview ── */}
        {previewVendors.length > 0 && (
          <>
            <SectionTitle eyebrow="SOIGNEUSEMENT CHOISIS" title="Votre équipe" colors={colors} />
            <View style={ss.vlist}>
              {previewVendors.map((v) => {
                const { label, tone } = vendorStatusLabel(v.status);
                const av = v.name.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2);
                return (
                  <View key={v.id} style={[ss.vrow, shadow('sm'), { backgroundColor: colors.card, borderColor: colors.border }]}>
                    <View style={[ss.rimLight, { borderTopColor: 'rgba(255,255,255,0.5)' }]} />
                    <View style={[ss.vav, { backgroundColor: colors.goldLight }, shadow('xs')]}>
                      <Text style={[ss.vavText, { fontFamily: SERIF, color: colors.navy }]}>{av}</Text>
                    </View>
                    <View style={ss.vinfo}>
                      <Text style={[ss.vname, { fontFamily: SANS_SEMIBOLD, color: colors.foreground }]} numberOfLines={1}>{v.name}</Text>
                      <Text style={[ss.vcat, { fontFamily: SANS, color: colors.mutedForeground }]}>{v.category}</Text>
                    </View>
                    <StatusBadge label={label} tone={tone} />
                  </View>
                );
              })}
            </View>
          </>
        )}
      </View>
    </ScrollView>
  );
}

function SectionTitle({ eyebrow, title, colors }: { eyebrow: string; title: string; colors: ReturnType<typeof useColors> }) {
  return (
    <View style={{ marginTop: 24, marginBottom: 12 }}>
      <Text style={[ss.eye, { fontFamily: SANS_SEMIBOLD, color: colors.goldDim }]}>{eyebrow}</Text>
      <Text style={[ss.stitle, { fontFamily: SERIF, color: colors.foreground }]}>{title}</Text>
    </View>
  );
}

function MetricCard({ icon, label, value, note, colors, highlight }: {
  icon: string; label: string; value: string; note: string;
  colors: ReturnType<typeof useColors>; highlight?: boolean;
}) {
  const cardShadow = highlight ? accentShadow('sm') : shadow('sm');
  const borderTopColor = highlight ? 'rgba(200,170,112,0.45)' : 'rgba(255,255,255,0.55)';

  return (
    <LinearGradient
      colors={highlight
        ? ['rgba(200,170,112,0.06)', colors.card]
        : ['rgba(255,255,255,0.40)', colors.card]}
      style={[ms.card, cardShadow, { borderColor: highlight ? colors.goldDim + '55' : colors.border }]}
    >
      {/* Rim light */}
      <View style={[ms.rim, { borderTopColor }]} />
      <Feather name={icon as any} size={15} color={highlight ? colors.accent : colors.accent} />
      <Text style={[ms.value, { fontFamily: SERIF, color: colors.foreground }]}>{value}</Text>
      <Text style={[ms.label, { fontFamily: SANS_SEMIBOLD, color: colors.mutedForeground }]}>{label.toUpperCase()}</Text>
      <Text style={[ms.note, { fontFamily: SANS, color: colors.tertiaryText }]} numberOfLines={1}>{note}</Text>
    </LinearGradient>
  );
}

const ms = StyleSheet.create({
  card: { width: '47.5%', borderRadius: 8, borderWidth: StyleSheet.hairlineWidth, padding: 14, gap: 3, overflow: 'hidden' },
  rim: { ...StyleSheet.absoluteFillObject, bottom: undefined, height: 1, borderTopWidth: 1 },
  value: { fontSize: 30, lineHeight: 32, marginTop: 4 },
  label: { fontSize: 8, letterSpacing: 1 },
  note: { fontSize: 10 },
});

const ss = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  hero: { paddingHorizontal: 20, paddingBottom: 28, overflow: 'hidden' },
  heroSheen: { ...StyleSheet.absoluteFillObject, height: 120 },
  heroEye: { fontSize: 9, letterSpacing: 2, color: '#c8aa70', marginBottom: 8 },
  heroNames: { fontSize: 36, lineHeight: 36, color: '#f8f3ea', marginBottom: 4 },
  heroVenue: { fontSize: 12, color: '#bdc8c4', marginBottom: 18 },
  heroRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  heroBadge: { backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: 4, borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(255,255,255,0.18)', paddingHorizontal: 12, paddingVertical: 7 },
  heroBadgeText: { fontSize: 11, color: '#f8f3ea', letterSpacing: 0.3 },
  heroCountdown: { alignItems: 'center', backgroundColor: 'rgba(200,170,112,0.12)', borderRadius: 8, paddingHorizontal: 16, paddingVertical: 8 },
  heroNum: { fontSize: 48, lineHeight: 44, color: '#c8aa70' },
  heroUnit: { fontSize: 10, color: '#bdc8c4', letterSpacing: 1 },
  body: { paddingHorizontal: 16 },
  eye: { fontSize: 9, letterSpacing: 1.6, marginBottom: 3 },
  stitle: { fontSize: 28, lineHeight: 28 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  card: { borderRadius: 8, borderWidth: StyleSheet.hairlineWidth, overflow: 'hidden' },
  rimLight: { position: 'absolute', left: 0, right: 0, top: 0, height: 1, borderTopWidth: 1 },
  evtRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingVertical: 11 },
  evtDate: { width: 44, height: 44, borderRadius: 6, alignItems: 'center', justifyContent: 'center' },
  evtDay: { fontSize: 20, lineHeight: 20 },
  evtMonth: { fontSize: 7, letterSpacing: 0.8, marginTop: 1 },
  evtInfo: { flex: 1 },
  evtTitle: { fontSize: 12, marginBottom: 2 },
  evtDetail: { fontSize: 10 },
  vlist: { gap: 8 },
  vrow: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 8, borderWidth: StyleSheet.hairlineWidth, padding: 12, overflow: 'hidden' },
  vav: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  vavText: { fontSize: 15 },
  vinfo: { flex: 1 },
  vname: { fontSize: 12, marginBottom: 2 },
  vcat: { fontSize: 10 },
});
