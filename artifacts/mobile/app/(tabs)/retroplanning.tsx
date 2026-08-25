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
import { useLocalization } from '@/context/LocalizationContext';

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

function formatDate(date: Date, locale: string) {
  return date.toLocaleDateString(locale, {
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
  copy,
  locale,
}: {
  milestone: Milestone;
  index: number;
  last: boolean;
  colors: ReturnType<typeof useColors>;
  today: number;
  copy: ReturnType<typeof getCopy>;
  locale: string;
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
            {formatDate(milestone.date, locale)}
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
            {isPast ? copy.pastDue : index === 0 ? copy.anticipate : copy.upcoming}
          </Text>
        </View>
      </View>
    </View>
  );
}

export default function RetroplanningScreen() {
  const { language, locale } = useLocalization();
  const copy = getCopy(language);
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { selectedWeddingId } = useWedding();
  const weddingId = selectedWeddingId ?? 0;
  const { data: wedding, isLoading: weddingLoading } = useGetWedding(weddingId, {
    query: {
      enabled: !!weddingId,
      queryKey: getGetWeddingQueryKey(weddingId),
      staleTime: 30_000,
    },
  });
  const { data: vendors = [], isLoading: vendorsLoading } = useListVendors(weddingId, {
    query: {
      enabled: !!weddingId,
      queryKey: getListVendorsQueryKey(weddingId),
      staleTime: 30_000,
    },
  });

  const caterer = vendors.find((vendor) =>
    /traiteur|catering|caterer/i.test(`${vendor.category} ${vendor.name}`),
  );

  const milestones = useMemo<Milestone[]>(() => {
    if (!wedding?.weddingDate) return [];
    const venue = wedding.venue || copy.venueTbd;
    const catererName = caterer?.name || copy.catererTbd;
    return [
      { title: copy.validateVenue, detail: venue, date: shiftDate(wedding.weddingDate, -12), tone: 'gold' },
      { title: copy.bookCaterer, detail: catererName, date: shiftDate(wedding.weddingDate, -10), tone: 'rose' },
      { title: copy.signContracts, detail: copy.contractDetails, date: shiftDate(wedding.weddingDate, -8), tone: 'sage' },
      { title: copy.finalizeMenu, detail: catererName, date: shiftDate(wedding.weddingDate, -5), tone: 'gold' },
      { title: copy.confirmSchedule, detail: venue, date: shiftDate(wedding.weddingDate, -2), tone: 'rose' },
      { title: copy.weddingDay, detail: `${wedding.names} · ${venue}`, date: new Date(`${wedding.weddingDate.slice(0, 10)}T12:00:00`), tone: 'sage' },
    ];
  }, [caterer, copy, wedding]);

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
          {copy.selectWedding}
        </Text>
        <Text style={[styles.emptyText, { color: colors.mutedForeground, fontFamily: SANS }]}>
          {copy.selectWeddingBody}
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={[styles.content, { paddingBottom: 160 + insets.bottom }]}
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
          {copy.eyebrow}
        </Text>
        <Text style={[styles.title, { color: '#FBF5FB', fontFamily: SERIF }]}>
          {copy.title}
        </Text>
        <Text style={[styles.heroBody, { color: '#F7EAF4', fontFamily: SANS }]}>
          {copy.heroBody(wedding.names)}
        </Text>
        <View style={styles.infoChips}>
          <InfoChip icon="calendar" value={formatDate(new Date(`${wedding.weddingDate.slice(0, 10)}T12:00:00`), locale)} colors={colors} />
          <InfoChip icon="map-pin" value={wedding.venue || copy.venueTbd} colors={colors} />
          <InfoChip icon="coffee" value={caterer?.name || copy.catererTbd} colors={colors} />
        </View>
      </LinearGradient>

      <View style={[styles.progressCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.progressHeader}>
          <View>
            <Text style={[styles.sectionEyebrow, { color: colors.goldDim, fontFamily: SANS_SEMIBOLD }]}>
              {copy.progress}
            </Text>
            <Text style={[styles.progressTitle, { color: colors.foreground, fontFamily: SERIF }]}>
              {copy.stepCount(completedCount, milestones.length)}
            </Text>
          </View>
          <Text style={[styles.progressValue, { color: colors.plum, fontFamily: SERIF }]}>{progress}%</Text>
        </View>
        <View style={[styles.progressTrack, { backgroundColor: colors.muted }]}>
          <View style={[styles.progressFill, { width: `${progress}%`, backgroundColor: colors.plum }]} />
        </View>
        <Text style={[styles.progressHint, { color: colors.mutedForeground, fontFamily: SANS }]}>
          {copy.progressHint}
        </Text>
      </View>

      <View style={styles.timeline}>
        <Text style={[styles.timelineHeading, { color: colors.goldDim, fontFamily: SANS_SEMIBOLD }]}>
          {copy.mainSteps}
        </Text>
        {milestones.map((milestone, index) => (
          <MilestoneRow
            key={`${milestone.title}-${milestone.date.toISOString()}`}
            milestone={milestone}
            index={index}
            last={index === milestones.length - 1}
            colors={colors}
            today={today}
            copy={copy}
            locale={locale}
          />
        ))}
      </View>
    </ScrollView>
  );
}

function getCopy(language: 'fr' | 'en') {
  return language === 'fr' ? {
    pastDue: 'Échéance passée', anticipate: 'À anticiper', upcoming: 'À venir', venueTbd: 'Lieu à définir', catererTbd: 'Traiteur à définir',
    validateVenue: 'Valider le lieu de réception', bookCaterer: 'Réserver le traiteur', signContracts: 'Signer les contrats principaux', contractDetails: 'Photographe, DJ, fleuriste et traiteur', finalizeMenu: 'Finaliser le menu et les dégustations', confirmSchedule: 'Confirmer le planning avec les prestataires', weddingDay: 'Jour J',
    selectWedding: 'Sélectionnez un mariage', selectWeddingBody: 'Votre rétro-planning sera généré à partir de la date de votre mariage.', eyebrow: 'ORGANISATION SEREINE', title: 'Rétro-planning', heroBody: (names: string) => `Un calendrier vivant pour ${names}. Les échéances se recalculent automatiquement lorsque la date, le lieu ou le traiteur évolue.`,
    progress: 'VOTRE AVANCEMENT', stepCount: (count: number, total: number) => `${count} étape${count > 1 ? 's' : ''} sur ${total}`, progressHint: 'Les jalons passés sont automatiquement identifiés selon la date du jour.', mainSteps: 'LES GRANDES ÉTAPES',
  } : {
    pastDue: 'Past due', anticipate: 'Plan ahead', upcoming: 'Upcoming', venueTbd: 'Venue to be confirmed', catererTbd: 'Caterer to be confirmed',
    validateVenue: 'Confirm the reception venue', bookCaterer: 'Book the caterer', signContracts: 'Sign the main contracts', contractDetails: 'Photographer, DJ, florist and caterer', finalizeMenu: 'Finalize the menu and tastings', confirmSchedule: 'Confirm the schedule with vendors', weddingDay: 'Wedding day',
    selectWedding: 'Select a wedding', selectWeddingBody: 'Your timeline will be generated from your wedding date.', eyebrow: 'STRESS-FREE PLANNING', title: 'Timeline', heroBody: (names: string) => `A living calendar for ${names}. Deadlines update automatically when the date, venue or caterer changes.`,
    progress: 'YOUR PROGRESS', stepCount: (count: number, total: number) => `${count} step${count === 1 ? '' : 's'} of ${total}`, progressHint: 'Past milestones are identified automatically based on today’s date.', mainSteps: 'KEY MILESTONES',
  };
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
      <Feather name={icon as any} size={12} color={colors.plumDark} />
      <Text style={[styles.infoChipText, { color: colors.plumDark, fontFamily: SANS }]} numberOfLines={1}>
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