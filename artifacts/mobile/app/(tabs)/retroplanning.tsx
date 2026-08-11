import { useMemo } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import type { CalendarEvent } from '@workspace/api-client-react';
import {
  getGetWeddingQueryKey,
  getListVendorsQueryKey,
  useGetWedding,
  useListVendors,
} from '@workspace/api-client-react';
import { useWedding } from '@/context/WeddingContext';
import { useColors } from '@/hooks/useColors';
import { SERIF, SANS, SANS_MEDIUM, SANS_SEMIBOLD } from '@/constants/fonts';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type Tone = 'gold' | 'sage' | 'rose';
type Milestone = {
  title: string;
  detail: string;
  date: Date;
  tone: Tone;
};

function shiftDate(date: string, months: number, days = 0) {
  const value = new Date(`${date.slice(0, 10)}T12:00:00`);
  const originalDay = value.getDate();
  value.setDate(1);
  value.setMonth(value.getMonth() + months);
  const lastDay = new Date(value.getFullYear(), value.getMonth() + 1, 0).getDate();
  value.setDate(Math.min(originalDay, lastDay));
  value.setDate(value.getDate() + days);
  return value;
}

function formatDate(date: Date) {
  return date.toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

function MilestoneRow({
  milestone,
  index,
  last,
  colors,
  today,
}: {
  milestone: Milestone;
  index: number;
  last: boolean;
  colors: ReturnType<typeof useColors>;
  today: number;
}) {
  const isPast = milestone.date.getTime() < today;
  const toneColor = milestone.tone === 'gold'
    ? colors.gold
    : milestone.tone === 'rose'
      ? colors.rose
      : colors.sage;

  return (
    <View style={styles.timelineRow}>
      <View style={styles.timelineRail}>
        <View
          style={[
            styles.timelineDot,
            {
              backgroundColor: isPast ? colors.sage : colors.card,
              borderColor: isPast ? colors.sage : toneColor,
            },
          ]}
        >
          {isPast ? <Feather name="check" size={11} color="#FBF5FB" /> : null}
        </View>
        {!last ? (
          <View
            style={[
              styles.timelineLine,
              { backgroundColor: isPast ? colors.sage + '80' : colors.border },
            ]}
          />
        ) : null}
      </View>
      <View
        style={[
          styles.milestoneCard,
          {
            backgroundColor: colors.card,
            borderColor: colors.border,
            borderLeftColor: toneColor,
          },
        ]}
      >
        <View style={styles.milestoneTop}>
          <Text
            style={[styles.milestoneTitle, { color: colors.foreground, fontFamily: SANS_SEMIBOLD }]}
            numberOfLines={2}
          >
            {milestone.title}
          </Text>
          <Text style={[styles.milestoneDate, { color: toneColor, fontFamily: SANS_SEMIBOLD }]}>
            {formatDate(milestone.date)}
          </Text>
        </View>
        <Text style={[styles.milestoneDetail, { color: colors.mutedForeground, fontFamily: SANS }]}>
          {milestone.detail}
        </Text>
        <View style={styles.milestoneStatus}>
          <Feather
            name={isPast ? 'check-circle' : 'clock'}
            size={12}
            color={isPast ? colors.sage : colors.mutedForeground}
          />
          <Text style={[styles.statusText, { color: isPast ? colors.sage : colors.mutedForeground, fontFamily: SANS_MEDIUM }]}>
            {isPast ? 'Échéance passée' : index === 0 ? 'À anticiper' : 'À venir'}
          </Text>
        </View>
      </View>
    </View>
  );
}

export default function RetroplanningScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { selectedWeddingId } = useWedding();
  const weddingId = selectedWeddingId ?? 0;
  const { data: wedding, isLoading: weddingLoading } = useGetWedding(weddingId, {
    query: {
      enabled: !!weddingId,
      queryKey: getGetWeddingQueryKey(weddingId),
      staleTime: 0,
      refetchOnMount: 'always',
    },
  });
  const { data: vendors = [], isLoading: vendorsLoading } = useListVendors(weddingId, {
    query: {
      enabled: !!weddingId,
      queryKey: getListVendorsQueryKey(weddingId),
      staleTime: 0,
      refetchOnMount: 'always',
    },
  });

  const caterer = vendors.find((vendor) =>
    /traiteur|catering|caterer/i.test(`${vendor.category} ${vendor.name}`),
  );

  const milestones = useMemo<Milestone[]>(() => {
    if (!wedding?.weddingDate) return [];
    const venue = wedding.venue || 'Votre lieu de réception';
    const catererName = caterer?.name || 'Traiteur à définir';
    return [
      { title: 'Valider le lieu de réception', detail: venue, date: shiftDate(wedding.weddingDate, -12), tone: 'gold' },
      { title: 'Réserver le traiteur', detail: catererName, date: shiftDate(wedding.weddingDate, -10), tone: 'rose' },
      { title: 'Signer les contrats principaux', detail: 'Photographe, DJ, fleuriste et traiteur', date: shiftDate(wedding.weddingDate, -8), tone: 'sage' },
      { title: 'Finaliser le menu et les dégustations', detail: catererName, date: shiftDate(wedding.weddingDate, -5), tone: 'gold' },
      { title: 'Confirmer le planning avec les prestataires', detail: venue, date: shiftDate(wedding.weddingDate, -2), tone: 'rose' },
      { title: 'Jour J', detail: `${wedding.names} · ${venue}`, date: new Date(`${wedding.weddingDate.slice(0, 10)}T12:00:00`), tone: 'sage' },
    ];
  }, [caterer, wedding]);

  const today = startOfDay(new Date());
  const completedCount = milestones.filter((milestone) => milestone.date.getTime() < today).length;
  const progress = milestones.length ? Math.round((completedCount / milestones.length) * 100) : 0;
  const isLoading = weddingLoading || vendorsLoading;

  if (isLoading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.plum} />
      </View>
    );
  }

  if (!weddingId || !wedding || !milestones.length) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <Feather name="calendar" size={28} color={colors.goldDim} />
        <Text style={[styles.emptyTitle, { color: colors.foreground, fontFamily: SERIF }]}>
          Sélectionnez un mariage
        </Text>
        <Text style={[styles.emptyText, { color: colors.mutedForeground, fontFamily: SANS }]}>
          Votre rétro-planning sera généré à partir de la date de votre mariage.
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={[styles.content, { paddingBottom: 140 + insets.bottom }]}
      showsVerticalScrollIndicator={false}
    >
      <LinearGradient
        colors={[colors.plumDark, colors.plum, colors.plumLight]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.hero}
      >
        <View style={styles.goldBar} />
        <Text style={[styles.eyebrow, { color: '#C8A96E', fontFamily: SANS_MEDIUM }]}>
          ORGANISATION SEREINE
        </Text>
        <Text style={[styles.title, { color: '#FBF5FB', fontFamily: SERIF }]}>
          Rétro-planning
        </Text>
        <Text style={[styles.heroBody, { color: '#F7EAF4', fontFamily: SANS }]}>
          Un calendrier vivant pour {wedding.names}. Les échéances se recalculent automatiquement lorsque la date, le lieu ou le traiteur évolue.
        </Text>
        <View style={styles.infoChips}>
          <InfoChip icon="calendar" value={formatDate(new Date(`${wedding.weddingDate.slice(0, 10)}T12:00:00`))} colors={colors} />
          <InfoChip icon="map-pin" value={wedding.venue || 'Lieu à définir'} colors={colors} />
          <InfoChip icon="coffee" value={caterer?.name || 'Traiteur à définir'} colors={colors} />
        </View>
      </LinearGradient>

      <View style={[styles.progressCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.progressHeader}>
          <View>
            <Text style={[styles.sectionEyebrow, { color: colors.goldDim, fontFamily: SANS_SEMIBOLD }]}>
              VOTRE AVANCEMENT
            </Text>
            <Text style={[styles.progressTitle, { color: colors.foreground, fontFamily: SERIF }]}>
              {completedCount} étape{completedCount > 1 ? 's' : ''} sur {milestones.length}
            </Text>
          </View>
          <Text style={[styles.progressValue, { color: colors.plum, fontFamily: SERIF }]}>{progress}%</Text>
        </View>
        <View style={[styles.progressTrack, { backgroundColor: colors.muted }]}>
          <View style={[styles.progressFill, { width: `${progress}%`, backgroundColor: colors.plum }]} />
        </View>
        <Text style={[styles.progressHint, { color: colors.mutedForeground, fontFamily: SANS }]}>
          Les jalons passés sont automatiquement identifiés selon la date du jour.
        </Text>
      </View>

      <View style={styles.timeline}>
        <Text style={[styles.timelineHeading, { color: colors.goldDim, fontFamily: SANS_SEMIBOLD }]}>
          LES GRANDES ÉTAPES
        </Text>
        {milestones.map((milestone, index) => (
          <MilestoneRow
            key={`${milestone.title}-${milestone.date.toISOString()}`}
            milestone={milestone}
            index={index}
            last={index === milestones.length - 1}
            colors={colors}
            today={today}
          />
        ))}
      </View>
    </ScrollView>
  );
}

function InfoChip({
  icon,
  value,
  colors,
}: {
  icon: string;
  value: string;
  colors: ReturnType<typeof useColors>;
}) {
  return (
    <View style={styles.infoChip}>
      <Feather name={icon as any} size={12} color="#6B4C68" />
      <Text style={[styles.infoChipText, { color: colors.foreground, fontFamily: SANS }]} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { gap: 16 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 10 },
  emptyTitle: { fontSize: 25, marginTop: 4 },
  emptyText: { maxWidth: 280, fontSize: 12, lineHeight: 18, textAlign: 'center' },
  hero: { paddingHorizontal: 20, paddingTop: 28, paddingBottom: 22, overflow: 'hidden' },
  goldBar: { position: 'absolute', top: 0, left: 0, right: 0, height: 1.5, backgroundColor: 'rgba(200,170,112,0.45)' },
  eyebrow: { fontSize: 9, letterSpacing: 1.8, marginBottom: 5 },
  title: { fontSize: 36, lineHeight: 38 },
  heroBody: { fontSize: 12, lineHeight: 18, marginTop: 12 },
  infoChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginTop: 16 },
  infoChip: { maxWidth: '100%', flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: 'rgba(255,255,255,0.72)', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 7 },
  infoChipText: { maxWidth: 230, fontSize: 10 },
  progressCard: { marginHorizontal: 16, borderRadius: 13, borderWidth: StyleSheet.hairlineWidth, padding: 16, gap: 10 },
  progressHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sectionEyebrow: { fontSize: 8, letterSpacing: 1.3, marginBottom: 3 },
  progressTitle: { fontSize: 21, lineHeight: 23 },
  progressValue: { fontSize: 28 },
  progressTrack: { height: 7, borderRadius: 4, overflow: 'hidden' },
  progressFill: { height: 7, borderRadius: 4 },
  progressHint: { fontSize: 10, lineHeight: 15 },
  timeline: { paddingHorizontal: 16 },
  timelineHeading: { fontSize: 8, letterSpacing: 1.5, marginBottom: 12, marginLeft: 40 },
  timelineRow: { flexDirection: 'row', minHeight: 104 },
  timelineRail: { width: 40, alignItems: 'center' },
  timelineDot: { width: 25, height: 25, borderRadius: 13, borderWidth: 2, alignItems: 'center', justifyContent: 'center', zIndex: 1 },
  timelineLine: { position: 'absolute', top: 25, bottom: 0, width: 2 },
  milestoneCard: { flex: 1, minHeight: 88, borderWidth: StyleSheet.hairlineWidth, borderLeftWidth: 3, borderRadius: 11, padding: 13, marginBottom: 12, gap: 6 },
  milestoneTop: { gap: 5 },
  milestoneTitle: { fontSize: 12, lineHeight: 16 },
  milestoneDate: { fontSize: 9, letterSpacing: 0.3 },
  milestoneDetail: { fontSize: 10, lineHeight: 15 },
  milestoneStatus: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 1 },
  statusText: { fontSize: 9 },
});