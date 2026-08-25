import { useMemo, useState } from 'react';
import {
  SectionList, View, Text, StyleSheet,
  ActivityIndicator, Platform, TouchableOpacity, TextInput,
} from 'react-native';

import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import { Feather } from '@expo/vector-icons';
import { useQueryClient } from '@tanstack/react-query';
import type { CalendarEvent } from '@workspace/api-client-react';
import { useListWeddings, useListEvents, useUpdateEvent, getListEventsQueryKey } from '@workspace/api-client-react';
import { useWedding } from '@/context/WeddingContext';
import { useLocalization } from '@/context/LocalizationContext';
import { useColors } from '@/hooks/useColors';
import { useTour } from '@/hooks/useTour';
import { SERIF, SANS, SANS_MEDIUM, SANS_SEMIBOLD } from '@/constants/fonts';
import { shadow, accentShadow } from '@/utils/shadow';
import { EmptyState } from '@/components/EmptyState';
import { EventAddSheet } from '@/components/EventAddSheet';
import { EventDetailSheet } from '@/components/EventDetailSheet';
import { TourSheet } from '@/components/TourSheet';

const TOUR_STEPS = [
  {
    icon: 'calendar',
    title: 'Votre agenda',
    description: 'Gérez tous vos événements et rendez-vous de préparation du mariage en un seul endroit.',
  },
  {
    icon: 'grid',
    title: 'Deux vues au choix',
    description: "Basculez entre la vue Liste et la vue Calendrier grâce aux boutons en haut de l'écran.",
  },
  {
    icon: 'filter',
    title: 'Filtres & couleurs',
    description: 'Filtrez par statut (à venir, terminés) ou par couleur Or, Rose, Sauge pour organiser vos événements.',
  },
  {
    icon: 'plus-circle',
    title: 'Ajouter un événement',
    description: 'Appuyez sur le bouton + en bas à droite pour créer un nouvel événement ou rendez-vous.',
  },
];
const TOUR_STEPS_EN = [
  { icon: 'calendar', title: 'Your calendar', description: 'Manage all your wedding-preparation events and appointments in one place.' },
  { icon: 'grid', title: 'Two views to choose from', description: 'Switch between List and Calendar views with the buttons at the top of the screen.' },
  { icon: 'filter', title: 'Filters & colors', description: 'Filter by status (upcoming, completed) or Gold, Rose, and Sage colors to organize events.' },
  { icon: 'plus-circle', title: 'Add an event', description: 'Tap the + button to create a new event or appointment.' },
];

type Filter = 'all' | 'upcoming' | 'done';
type ViewMode = 'list' | 'calendar';
type ToneFilter = 'gold' | 'rose' | 'sage';

const FILTERS: { key: Filter; label: string }[] = [
  { key: 'all', label: 'Tous' },
  { key: 'upcoming', label: 'À venir' },
  { key: 'done', label: 'Terminés' },
];

const TONE_FILTERS: { key: ToneFilter; label: string }[] = [
  { key: 'gold', label: 'Or' },
  { key: 'rose', label: 'Rose' },
  { key: 'sage', label: 'Sauge' },
];

const FR_DAYS_SHORT = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];

interface Section { title: string; data: CalendarEvent[] }

function buildSections(events: CalendarEvent[], locale: string): Section[] {
  const sorted = [...events].sort(
    (a, b) => new Date(a.eventDate).getTime() - new Date(b.eventDate).getTime()
  );
  const map = new Map<string, CalendarEvent[]>();
  for (const evt of sorted) {
    const key = new Date(evt.eventDate).toLocaleDateString(locale, {
      month: 'long', year: 'numeric',
    }).toUpperCase();
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(evt);
  }
  return Array.from(map.entries()).map(([title, data]) => ({ title, data }));
}

// ── Tone dot ─────────────────────────────────────────────────────────────────
function ToneDot({ tone, colors }: { tone?: string | null; colors: ReturnType<typeof useColors> }) {
  const map: Record<string, string> = { gold: colors.gold, rose: colors.rose, sage: colors.sage };
  const c = (tone && map[tone]) ?? 'transparent';
  if (c === 'transparent') return null;
  return <View style={[td.dot, { backgroundColor: c }]} />;
}
const td = StyleSheet.create({ dot: { width: 6, height: 6, borderRadius: 3 } });

// ── Event row ────────────────────────────────────────────────────────────────
function EventRow({
  item,
  isFirst,
  isLast,
  colors,
  onToggle,
  onPress,
  locale,
}: {
  item: CalendarEvent;
  isFirst: boolean;
  isLast: boolean;
  colors: ReturnType<typeof useColors>;
  onToggle: (item: CalendarEvent) => void;
  onPress: (item: CalendarEvent) => void;
  locale: string;
}) {
  const date = new Date(item.eventDate);
  const day = date.toLocaleDateString(locale, { day: 'numeric' });
  const month = date.toLocaleDateString(locale, { month: 'short' }).replace('.', '').toUpperCase();
  const isCompleted = item.completed ?? false;

  return (
    <TouchableOpacity
      onPress={() => onPress(item)}
      activeOpacity={0.72}
      style={[
        er.row,
        !isLast && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
        isFirst && er.firstRow,
        isLast && er.lastRow,
      ]}
    >
      {/* Date badge */}
      <View
        style={[
          er.dateBadge,
          {
            backgroundColor: isCompleted
              ? colors.background
              : isFirst
              ? colors.goldLight
              : colors.background,
          },
          !isCompleted && isFirst && shadow('xs'),
        ]}
      >
        <Text
          style={[
            er.day,
            { fontFamily: SERIF, color: isCompleted ? colors.mutedForeground : colors.foreground },
          ]}
        >
          {day}
        </Text>
        <Text style={[er.monthTxt, { fontFamily: SANS_SEMIBOLD, color: colors.mutedForeground }]}>
          {month}
        </Text>
      </View>

      {/* Info */}
      <View style={er.info}>
        <View style={er.titleRow}>
          <ToneDot tone={item.tone} colors={colors} />
          <Text
            style={[
              er.title,
              {
                fontFamily: SANS_SEMIBOLD,
                color: isCompleted ? colors.mutedForeground : colors.foreground,
              },
              isCompleted && er.strikethrough,
            ]}
            numberOfLines={1}
          >
            {item.title}
          </Text>
        </View>
        {(item.eventTime || item.detail) ? (
          <Text
            style={[er.meta, { fontFamily: SANS, color: colors.mutedForeground }]}
            numberOfLines={1}
          >
            {[item.eventTime, item.detail].filter(Boolean).join(' · ')}
          </Text>
        ) : null}
        <Text style={[er.dateStr, { fontFamily: SANS, color: colors.mutedForeground }]}>
          {new Date(item.eventDate).toLocaleDateString(locale, { day: 'numeric', month: 'short', year: 'numeric' })}
        </Text>
      </View>

      {/* Complete toggle */}
      <TouchableOpacity
        onPress={(e) => { e.stopPropagation(); onToggle(item); }}
        activeOpacity={0.7}
        hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        style={[
          er.checkBtn,
          {
            borderColor: isCompleted ? colors.sage : colors.border,
            backgroundColor: isCompleted ? colors.sage + '1A' : 'transparent',
          },
        ]}
      >
        {isCompleted ? (
          <Feather name="check" size={13} color={colors.sage} />
        ) : (
          <View style={er.checkEmpty} />
        )}
      </TouchableOpacity>
    </TouchableOpacity>
  );
}

const er = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingVertical: 12 },
  firstRow: { paddingTop: 14 }, lastRow: { paddingBottom: 14 },
  dateBadge: { width: 46, height: 46, borderRadius: 8, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  day: { fontSize: 20, lineHeight: 20 },
  monthTxt: { fontSize: 7, letterSpacing: 0.8, marginTop: 1 },
  info: { flex: 1, gap: 2 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  title: { fontSize: 13, flex: 1 },
  strikethrough: { textDecorationLine: 'line-through' },
  meta: { fontSize: 10 }, dateStr: { fontSize: 9, letterSpacing: 0.3, marginTop: 1 },
  checkBtn: { width: 28, height: 28, borderRadius: 14, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  checkEmpty: { width: 8, height: 8, borderRadius: 4 },
});

// ── Stat block ────────────────────────────────────────────────────────────────
function StatBlock({ value, label, color, colors }: { value: number; label: string; color: string; colors: ReturnType<typeof useColors> }) {
  return (
    <View style={hs.statBlock}>
      <Text style={[hs.statValue, { fontFamily: SERIF, color }]}>{value}</Text>
      <Text style={[hs.statLabel, { fontFamily: SANS_MEDIUM, color: colors.mutedForeground }]}>{label}</Text>
    </View>
  );
}

// ── Month navigator ───────────────────────────────────────────────────────────
function MonthNavigator({ year, month, onPrev, onNext, colors, locale }: {
  year: number; month: number; onPrev: () => void; onNext: () => void;
  colors: ReturnType<typeof useColors>;
  locale: string;
}) {
  const label = new Date(year, month, 1)
    .toLocaleDateString(locale, { month: 'long', year: 'numeric' })
    .toUpperCase();
  return (
    <View style={mn.row}>
      <TouchableOpacity onPress={onPrev} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        style={[mn.arrow, { backgroundColor: colors.plumBg, borderColor: colors.border }]}>
        <Feather name="chevron-left" size={16} color={colors.plum} />
      </TouchableOpacity>
      <Text style={[mn.label, { fontFamily: SANS_SEMIBOLD, color: colors.foreground }]}>{label}</Text>
      <TouchableOpacity onPress={onNext} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        style={[mn.arrow, { backgroundColor: colors.plumBg, borderColor: colors.border }]}>
        <Feather name="chevron-right" size={16} color={colors.plum} />
      </TouchableOpacity>
    </View>
  );
}
const mn = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  label: { fontSize: 13, letterSpacing: 0.8 },
  arrow: { width: 32, height: 32, borderRadius: 8, borderWidth: StyleSheet.hairlineWidth, alignItems: 'center', justifyContent: 'center' },
});

// ── Calendar grid ─────────────────────────────────────────────────────────────
function CalendarGrid({ year, month, events, selectedDay, onSelectDay, colors }: {
  year: number; month: number; events: CalendarEvent[];
  selectedDay: string | null; onSelectDay: (day: string | null) => void;
  colors: ReturnType<typeof useColors>;
}) {
  const eventsByDay = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const evt of events) {
      const d = evt.eventDate.slice(0, 10);
      if (!map.has(d)) map.set(d, []);
      if (evt.tone) map.get(d)!.push(evt.tone);
      else map.get(d)!.push('plum');
    }
    return map;
  }, [events]);

  const firstDow = (new Date(year, month, 1).getDay() + 6) % 7; // Mon=0
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDow; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  const todayObj = new Date();
  const isCurrentMonth = todayObj.getFullYear() === year && todayObj.getMonth() === month;

  const toneColor = (tone: string) => {
    if (tone === 'gold') return colors.gold;
    if (tone === 'rose') return colors.rose;
    if (tone === 'sage') return colors.sage;
    return colors.plum;
  };

  return (
    <View style={cg.container}>
      {/* Day-of-week headers */}
      <View style={cg.weekRow}>
        {FR_DAYS_SHORT.map((d, i) => (
          <View key={i} style={cg.cell}>
            <Text style={[cg.weekLabel, { fontFamily: SANS_SEMIBOLD, color: i === 6 ? colors.rose : colors.mutedForeground }]}>{d}</Text>
          </View>
        ))}
      </View>

      {/* Day cells in rows of 7 */}
      {Array.from({ length: cells.length / 7 }, (_, rowIdx) => (
        <View key={rowIdx} style={cg.weekRow}>
          {cells.slice(rowIdx * 7, rowIdx * 7 + 7).map((day, colIdx) => {
            if (!day) return <View key={`e-${rowIdx}-${colIdx}`} style={cg.cell} />;

            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const isToday = isCurrentMonth && todayObj.getDate() === day;
            const isSelected = selectedDay === dateStr;
            const tones = eventsByDay.get(dateStr);

            return (
              <TouchableOpacity
                key={dateStr}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  onSelectDay(isSelected ? null : dateStr);
                }}
                activeOpacity={0.75}
                style={cg.cell}
              >
                {/* Day number circle */}
                <View style={[
                  cg.dayCircle,
                  isSelected && { backgroundColor: colors.plum },
                  !isSelected && isToday && { borderWidth: 1.5, borderColor: colors.plum },
                ]}>
                  <Text style={[
                    cg.dayNum,
                    { fontFamily: isToday || isSelected ? SANS_SEMIBOLD : SANS },
                    { color: isSelected ? '#FBF5FB' : isToday ? colors.plum : colors.foreground },
                  ]}>
                    {day}
                  </Text>
                </View>

                {/* Event indicator dots */}
                {tones && tones.length > 0 && (
                  <View style={cg.dotRow}>
                    {tones.slice(0, 3).map((tone, ti) => (
                      <View
                        key={ti}
                        style={[cg.dot, {
                          backgroundColor: isSelected
                            ? 'rgba(251,245,251,0.75)'
                            : toneColor(tone),
                        }]}
                      />
                    ))}
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      ))}
    </View>
  );
}

const cg = StyleSheet.create({
  container: { paddingBottom: 4 },
  weekRow: { flexDirection: 'row' },
  cell: { flex: 1, alignItems: 'center', paddingVertical: 3 },
  weekLabel: { fontSize: 10, letterSpacing: 0.5, paddingVertical: 6 },
  dayCircle: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  dayNum: { fontSize: 14 },
  dotRow: { flexDirection: 'row', gap: 2, marginTop: 2, height: 6, alignItems: 'center' },
  dot: { width: 4, height: 4, borderRadius: 2 },
});

// ── View toggle ───────────────────────────────────────────────────────────────
function ViewToggle({ view, onChange, colors, language }: {
  view: ViewMode; onChange: (v: ViewMode) => void; colors: ReturnType<typeof useColors>; language: 'fr' | 'en';
}) {
  return (
    <View style={[vt.wrap, { backgroundColor: colors.muted, borderColor: colors.border }]}>
      {(['list', 'calendar'] as ViewMode[]).map((v) => {
        const isActive = view === v;
        return (
          <TouchableOpacity
            key={v}
            onPress={() => { Haptics.selectionAsync(); onChange(v); }}
            activeOpacity={0.8}
            style={[vt.btn, isActive && { backgroundColor: colors.plum }]}
          >
            <Feather
              name={v === 'list' ? 'list' : 'grid'}
              size={13}
              color={isActive ? '#FBF5FB' : colors.mutedForeground}
            />
            <Text style={[vt.label, { fontFamily: SANS_MEDIUM, color: isActive ? '#FBF5FB' : colors.mutedForeground }]}>
               {v === 'list' ? (language === 'fr' ? 'Liste' : 'List') : (language === 'fr' ? 'Calendrier' : 'Calendar')}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}
const vt = StyleSheet.create({
  wrap: { flexDirection: 'row', borderRadius: 10, borderWidth: StyleSheet.hairlineWidth, padding: 3, alignSelf: 'flex-start' },
  btn: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 8 },
  label: { fontSize: 12 },
});

// ── Main screen ───────────────────────────────────────────────────────────────
export default function EvenementsScreen() {
  const colors = useColors();
  const { language, locale } = useLocalization();
  const { selectedWeddingId } = useWedding();
  const topPad = Platform.OS === 'web' ? 67 : 0;
  const { tourVisible, openTour, closeTour } = useTour('tour:evenements');

  const [filter, setFilter] = useState<Filter>('all');
  const [view, setView] = useState<ViewMode>('list');
  const [search, setSearch] = useState('');
  const [toneFilter, setToneFilter] = useState<ToneFilter | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [addSheetInitialDate, setAddSheetInitialDate] = useState<string | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);

  // Calendar navigation state: default to current month
  const now = new Date();
  const [calYear, setCalYear] = useState(now.getFullYear());
  const [calMonth, setCalMonth] = useState(now.getMonth());
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  const queryClient = useQueryClient();
  const { data: weddings } = useListWeddings();
  const activeWedding = weddings?.find((w) => w.id === selectedWeddingId) ?? weddings?.[0];
  const wId = activeWedding?.id ?? 0;
  const { data: events, isLoading, refetch, isRefetching } = useListEvents(wId);
  const EVENTS_QUERY_KEY = getListEventsQueryKey(wId);

  const { mutate: updateEvent } = useUpdateEvent({
    mutation: {
      onMutate: async ({ id, data: patch }) => {
        await queryClient.cancelQueries({ queryKey: EVENTS_QUERY_KEY });
        const prev = queryClient.getQueryData(EVENTS_QUERY_KEY);
        queryClient.setQueryData(EVENTS_QUERY_KEY, (old: CalendarEvent[] | undefined) =>
          old?.map((e) => (e.id === id ? { ...e, ...patch } : e)) ?? old
        );
        return { prev };
      },
      onError: (_err, _vars, context: any) => {
        if (context?.prev !== undefined) queryClient.setQueryData(EVENTS_QUERY_KEY, context.prev);
      },
      onSettled: () => { queryClient.invalidateQueries({ queryKey: EVENTS_QUERY_KEY }); },
    },
  });

  const handleToggle = (item: CalendarEvent) => {
    Haptics.impactAsync(item.completed ? Haptics.ImpactFeedbackStyle.Light : Haptics.ImpactFeedbackStyle.Medium);
    updateEvent({ weddingId: wId, id: item.id, data: { completed: !item.completed } });
  };

  const handleRowPress = (item: CalendarEvent) => {
    Haptics.selectionAsync();
    setSelectedEvent(item);
  };

  const handlePrevMonth = () => {
    setSelectedDay(null);
    if (calMonth === 0) { setCalYear(y => y - 1); setCalMonth(11); }
    else setCalMonth(m => m - 1);
  };
  const handleNextMonth = () => {
    setSelectedDay(null);
    if (calMonth === 11) { setCalYear(y => y + 1); setCalMonth(0); }
    else setCalMonth(m => m + 1);
  };

  const allEvents = events ?? [];

  // Filtered event list — different logic for list vs calendar view
  const filtered = useMemo(() => {
    if (view === 'calendar') {
      if (selectedDay) return allEvents.filter((e) => e.eventDate.startsWith(selectedDay));
      // No day selected → show the entire displayed month
      return allEvents.filter((e) => {
        const d = new Date(e.eventDate);
        return d.getFullYear() === calYear && d.getMonth() === calMonth;
      });
    }

    let result = allEvents;

    // Status filter
    if (filter === 'upcoming') result = result.filter((e) => !e.completed);
    else if (filter === 'done') result = result.filter((e) => !!e.completed);

    // Keyword search (title + notes)
    const q = search.trim().toLowerCase();
    if (q) {
      result = result.filter(
        (e) =>
          e.title.toLowerCase().includes(q) ||
          (e.detail && e.detail.toLowerCase().includes(q)),
      );
    }

    // Tone / colour filter
    if (toneFilter) {
      result = result.filter((e) => e.tone === toneFilter);
    }

    return result;
  }, [allEvents, view, filter, selectedDay, calYear, calMonth, search, toneFilter]);

  const sections = buildSections(filtered, locale);
  const upcomingCount = allEvents.filter((e) => !e.completed).length;
  const doneCount = allEvents.filter((e) => !!e.completed).length;

  // Calendar empty-state subtitle
  const calEmptySubtitle = selectedDay
    ? (language === 'fr' ? `Aucun événement le ${new Date(selectedDay + 'T12:00:00').toLocaleDateString(locale, { day: 'numeric', month: 'long' })}.` : `No events on ${new Date(selectedDay + 'T12:00:00').toLocaleDateString(locale, { day: 'numeric', month: 'long' })}.`)
    : undefined;

  return (
    <>
      <SectionList
        sections={sections}
        keyExtractor={(item) => String(item.id)}
        style={{ flex: 1, backgroundColor: colors.background }}
        contentContainerStyle={{ paddingBottom: 160, flexGrow: 1 }}
        refreshing={isRefetching}
        onRefresh={refetch}
        showsVerticalScrollIndicator={false}
        stickySectionHeadersEnabled={false}
        ListHeaderComponent={
          <View>
            {/* ── Hero gradient header ── */}
            <LinearGradient
              colors={[colors.plumDark, colors.plum, colors.plumLight]}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
              style={[hs.hero, { paddingTop: topPad + 20 }]}
            >
              <View style={{ position: 'absolute', top: -20, right: -20, width: 110, height: 110, borderRadius: 55, backgroundColor: colors.gold + '20' }} pointerEvents="none" />
              <View style={{ position: 'absolute', bottom: 0, left: 10, width: 80, height: 80, borderRadius: 40, backgroundColor: colors.sage + '18' }} pointerEvents="none" />
              <LinearGradient colors={['rgba(255,255,255,0.08)', 'transparent']} style={hs.heroSheen} pointerEvents="none" />
              <View style={hs.goldBar} />
              <Text style={[hs.eye, { fontFamily: SANS_MEDIUM, color: '#C8A96E' }]}>{language === 'fr' ? 'LA CÉLÉBRATION' : 'THE CELEBRATION'}</Text>
              <View style={hs.heroTop}>
                <Text style={[hs.heroTitle, { fontFamily: SERIF, color: '#FBF5FB' }]}>{language === 'fr' ? 'Agenda' : 'Calendar'}</Text>
                <TouchableOpacity
                  onPress={() => { setAddSheetInitialDate(null); setShowAdd(true); }}
                  activeOpacity={0.8}
                  style={hs.heroAddBtn}
                  accessibilityRole="button"
                  accessibilityLabel={language === 'fr' ? 'Ajouter un événement' : 'Add an event'}
                >
                  <Feather name="plus" size={14} color="#FBF5FB" />
                  <Text style={[hs.heroAddText, { fontFamily: SANS_SEMIBOLD }]}>{language === 'fr' ? 'Ajouter' : 'Add'}</Text>
                </TouchableOpacity>
              </View>
            </LinearGradient>

            <View style={{ paddingHorizontal: 16, paddingTop: 16 }}>
              {/* Stats bar (list view only) */}
              {view === 'list' && allEvents.length > 0 && (
                <View style={[hs.statsWrap, shadow('md')]}>
                  <View style={[hs.statsBar, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    <View style={[hs.rim, { borderTopColor: 'rgba(255,255,255,0.80)' }]} />
                    <StatBlock value={allEvents.length} label="Total" color={colors.foreground} colors={colors} />
                    <View style={[hs.divider, { backgroundColor: colors.border }]} />
                    <StatBlock value={upcomingCount} label={language === 'fr' ? 'À venir' : 'Upcoming'} color={colors.plum} colors={colors} />
                    <View style={[hs.divider, { backgroundColor: colors.border }]} />
                    <StatBlock value={doneCount} label={language === 'fr' ? 'Terminés' : 'Completed'} color={colors.sage} colors={colors} />
                  </View>
                </View>
              )}

              {/* View toggle + status filter pills row */}
              <View style={hs.controlsRow}>
                <ViewToggle
                  view={view}
                  onChange={(v) => {
                    setView(v);
                    setSelectedDay(null);
                    setSearch('');
                    setToneFilter(null);
                  }}
                  colors={colors}
                  language={language}
                />
              </View>
              {view === 'list' && (
                <View style={hs.filterRowBelow}>
                  {FILTERS.map((f) => {
                    const isActive = filter === f.key;
                    return (
                      <TouchableOpacity key={f.key} onPress={() => setFilter(f.key)} activeOpacity={0.75}
                        style={[hs.pill, isActive ? accentShadow('sm') : shadow('xs'),
                          { backgroundColor: isActive ? colors.plum : colors.muted, borderColor: isActive ? colors.plum : colors.border }]}
                      >
                        <Text style={[hs.pillText, { fontFamily: SANS_MEDIUM, color: isActive ? '#FBF5FB' : colors.mutedForeground }]}>{f.key === 'all' ? (language === 'fr' ? 'Tous' : 'All') : f.key === 'upcoming' ? (language === 'fr' ? 'À venir' : 'Upcoming') : (language === 'fr' ? 'Terminés' : 'Completed')}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}

              {/* Search bar + tone chips (list view only) */}
              {view === 'list' && (
                <>
                  {/* Search input */}
                  <View style={[hs.searchWrap, shadow('xs'), { backgroundColor: colors.card, borderColor: colors.border }]}>
                    <View style={[hs.rim, { borderTopColor: 'rgba(255,255,255,0.60)' }]} />
                    <Feather name="search" size={14} color={colors.mutedForeground} />
                    <TextInput
                      value={search}
                      onChangeText={setSearch}
                      placeholder={language === 'fr' ? 'Rechercher un événement…' : 'Search for an event…'}
                      placeholderTextColor={colors.mutedForeground}
                      style={[hs.searchInput, { fontFamily: SANS, color: colors.foreground }]}
                      returnKeyType="search"
                      clearButtonMode="while-editing"
                      autoCorrect={false}
                    />
                    {search.length > 0 && (
                      <TouchableOpacity
                        onPress={() => setSearch('')}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      >
                        <Feather name="x-circle" size={14} color={colors.mutedForeground} />
                      </TouchableOpacity>
                    )}
                  </View>

                  {/* Tone / colour chips */}
                  <View style={hs.toneRow}>
                    {TONE_FILTERS.map((t) => {
                      const isActive = toneFilter === t.key;
                      const dotColor = t.key === 'gold' ? colors.gold : t.key === 'rose' ? colors.rose : colors.sage;
                      return (
                        <TouchableOpacity
                          key={t.key}
                          onPress={() => setToneFilter(isActive ? null : t.key)}
                          activeOpacity={0.75}
                          style={[
                            hs.toneChip,
                            isActive
                              ? { backgroundColor: dotColor + '22', borderColor: dotColor + '88' }
                              : { backgroundColor: colors.muted, borderColor: colors.border },
                          ]}
                        >
                          <View style={[hs.toneDot, { backgroundColor: dotColor }]} />
                          <Text style={[hs.toneLabel, { fontFamily: SANS_MEDIUM, color: isActive ? dotColor : colors.mutedForeground }]}>
                            {t.key === 'gold' ? (language === 'fr' ? 'Or' : 'Gold') : t.key === 'rose' ? 'Rose' : (language === 'fr' ? 'Sauge' : 'Sage')}
                          </Text>
                          {isActive && (
                            <Feather name="x" size={10} color={dotColor} />
                          )}
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </>
              )}

              {/* ── Calendar grid (calendar view only) ── */}
              {view === 'calendar' && (
                <View style={[hs.calCard, shadow('md'), { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <View style={[hs.rim, { borderTopColor: 'rgba(255,255,255,0.65)' }]} />
                  <View style={{ padding: 14 }}>
                    <MonthNavigator
                      year={calYear} month={calMonth}
                      onPrev={handlePrevMonth} onNext={handleNextMonth}
                      colors={colors}
                      locale={locale}
                    />
                    <CalendarGrid
                      year={calYear} month={calMonth}
                      events={allEvents}
                      selectedDay={selectedDay}
                      onSelectDay={setSelectedDay}
                      colors={colors}
                    />
                  </View>

                  {/* Selected day banner */}
                  {selectedDay && (
                    <View style={[hs.dayBanner, { borderTopColor: colors.border, backgroundColor: colors.plumBg }]}>
                      <Feather name="calendar" size={13} color={colors.plum} />
                      <Text style={[hs.dayBannerText, { fontFamily: SANS_SEMIBOLD, color: colors.plum }]}>
                        {new Date(selectedDay + 'T12:00:00').toLocaleDateString(locale, { weekday: 'long', day: 'numeric', month: 'long' })}
                      </Text>
                      <TouchableOpacity
                        onPress={() => {
                          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                          setAddSheetInitialDate(selectedDay);
                          setShowAdd(true);
                        }}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        style={[hs.dayBannerAdd, { backgroundColor: colors.plum }]}
                      >
                        <Feather name="plus" size={12} color="#FBF5FB" />
                        <Text style={[hs.dayBannerAddText, { fontFamily: SANS_SEMIBOLD }]}>{language === 'fr' ? 'Ajouter' : 'Add'}</Text>
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => setSelectedDay(null)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                        <Feather name="x" size={14} color={colors.plum} />
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              )}

              {/* Calendar month subtitle (no day selected) */}
              {view === 'calendar' && !selectedDay && (
                <Text style={[hs.calSubtitle, { fontFamily: SANS, color: colors.mutedForeground }]}>
                  {filtered.length === 0
                    ? (language === 'fr' ? 'Aucun événement ce mois-ci' : 'No events this month')
                    : (language === 'fr' ? `${filtered.length} événement${filtered.length > 1 ? 's' : ''} ce mois` : `${filtered.length} event${filtered.length > 1 ? 's' : ''} this month`)}
                </Text>
              )}
            </View>
          </View>
        }
        ListEmptyComponent={
          isLoading ? (
            <View style={hs.loading}><ActivityIndicator color={colors.accent} /></View>
          ) : (
            <View style={hs.emptyWrap}>
              <EmptyState
                icon={view === 'list' && (search || toneFilter) ? 'search' : 'calendar'}
                title={
                  view === 'calendar'
                    ? selectedDay ? (language === 'fr' ? 'Journée libre' : 'Free day') : (language === 'fr' ? 'Mois sans événements' : 'Month without events')
                    : search.trim()
                      ? (language === 'fr' ? 'Aucun résultat' : 'No results')
                      : toneFilter
                        ? (language === 'fr' ? 'Aucun événement de cette couleur' : 'No events in this color')
                        : filter === 'done' ? (language === 'fr' ? 'Aucun événement terminé' : 'No completed events') : (language === 'fr' ? 'Aucun événement' : 'No events')
                }
                subtitle={
                  view === 'calendar'
                    ? calEmptySubtitle
                    : search.trim()
                      ? (language === 'fr' ? `Aucun événement ne correspond à « ${search.trim()} ».` : `No event matches “${search.trim()}”.`)
                      : toneFilter
                        ? 'Essayez une autre couleur ou effacez le filtre.'
                        : filter === 'all' ? (language === 'fr' ? 'Ajoutez votre premier événement avec le bouton +.' : 'Add your first event with the + button.') : undefined
                }
              />
            </View>
          )
        }
        renderSectionHeader={({ section }) => (
          <View style={{ paddingHorizontal: 16 }}>
            <Text style={[hs.monthSep, { fontFamily: SANS_SEMIBOLD, color: colors.goldDim }]}>{section.title}</Text>
          </View>
        )}
        renderItem={({ item, index, section }) => {
          const isFirst = index === 0;
          const isLast = index === section.data.length - 1;
          return (
            <View style={[{ paddingHorizontal: 16 }, isFirst && hs.cardStart, isLast && hs.cardEnd]}>
              {isFirst && (
                <View style={[hs.cardTopBorder, { borderColor: colors.border, backgroundColor: colors.card, ...shadow('md') }]} />
              )}
              <View style={[hs.itemInner, { backgroundColor: colors.card, borderLeftColor: colors.border, borderRightColor: colors.border, borderLeftWidth: StyleSheet.hairlineWidth, borderRightWidth: StyleSheet.hairlineWidth }]}>
                {isFirst && <View style={[hs.rimLight, { borderTopColor: 'rgba(255,255,255,0.60)' }]} />}
                <EventRow
                  item={item}
                  isFirst={isFirst}
                  isLast={isLast}
                  colors={colors}
                  onToggle={handleToggle}
                  onPress={handleRowPress}
                  locale={locale}
                />
                {!isLast && <View style={[hs.separator, { backgroundColor: colors.border }]} />}
              </View>
              {isLast && (
                <View style={[hs.cardBottomBorder, { borderColor: colors.border, backgroundColor: colors.card }]} />
              )}
            </View>
          );
        }}
      />

      <EventAddSheet
        visible={showAdd}
        onClose={() => { setShowAdd(false); setAddSheetInitialDate(null); }}
        weddingId={wId}
        initialDate={addSheetInitialDate}
        onCreated={() => {
          queryClient.invalidateQueries({ queryKey: EVENTS_QUERY_KEY });
          setShowAdd(false);
          setAddSheetInitialDate(null);
        }}
      />

      <EventDetailSheet
        visible={!!selectedEvent}
        onClose={() => setSelectedEvent(null)}
        event={selectedEvent}
        weddingId={wId}
        onUpdated={() => {
          queryClient.invalidateQueries({ queryKey: EVENTS_QUERY_KEY });
        }}
        onDeleted={() => {
          queryClient.invalidateQueries({ queryKey: EVENTS_QUERY_KEY });
        }}
      />

      {/* Tour */}
       <TourSheet visible={tourVisible} onClose={closeTour} steps={language === 'fr' ? TOUR_STEPS : TOUR_STEPS_EN} />
    </>
  );
}

const hs = StyleSheet.create({
  hero: { paddingHorizontal: 20, paddingBottom: 22, overflow: 'hidden' },
  heroSheen: { ...StyleSheet.absoluteFillObject, height: 80 },
  goldBar: { position: 'absolute', top: 0, left: 0, right: 0, height: 1.5, backgroundColor: 'rgba(200,170,112,0.35)' },
  eye: { fontSize: 9, letterSpacing: 2, marginBottom: 4 },
  heroTitle: { fontSize: 34, lineHeight: 34 },
  statsWrap: { borderRadius: 12, marginBottom: 14, overflow: 'hidden' },
  statsBar: { flexDirection: 'row', borderRadius: 12, borderWidth: StyleSheet.hairlineWidth, padding: 14, alignItems: 'center', overflow: 'hidden' },
  rim: { position: 'absolute', left: 0, right: 0, top: 0, height: 1, borderTopWidth: 1 },
  divider: { width: StyleSheet.hairlineWidth, height: 32 },
  statBlock: { flex: 1, alignItems: 'center', gap: 2 },
  statValue: { fontSize: 26, lineHeight: 26 },
  statLabel: { fontSize: 9, letterSpacing: 0.5 },
  // Controls row: toggle left, pills right
  controlsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, gap: 8, flexWrap: 'wrap' },
  heroTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  heroAddBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, minHeight: 34, borderRadius: 9, paddingHorizontal: 10, backgroundColor: 'rgba(255,255,255,0.14)', borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(200,170,112,0.45)' },
  heroAddText: { color: '#FBF5FB', fontSize: 10 },
  filterRowBelow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap', marginBottom: 14 },
  listActions: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 8, flexWrap: 'wrap' },
  filterRow: { flexDirection: 'row', gap: 6 },
  pill: { borderRadius: 20, borderWidth: StyleSheet.hairlineWidth, paddingHorizontal: 14, paddingVertical: 7 },
  pillText: { fontSize: 11 },
  listAddBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, minHeight: 32, borderRadius: 9, borderWidth: StyleSheet.hairlineWidth, paddingHorizontal: 10 },
  listAddText: { color: '#FBF5FB', fontSize: 10 },
  // Calendar card
  calCard: { borderRadius: 12, borderWidth: StyleSheet.hairlineWidth, overflow: 'hidden', marginBottom: 4 },
  dayBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, paddingVertical: 10, borderTopWidth: StyleSheet.hairlineWidth },
  dayBannerText: { flex: 1, fontSize: 12, textTransform: 'capitalize' },
  dayBannerAdd: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5 },
  dayBannerAddText: { fontSize: 11, color: '#FBF5FB' },
  calSubtitle: { fontSize: 11, marginBottom: 10, marginTop: 2 },
  // Month section header
  monthSep: { fontSize: 8, letterSpacing: 1.4, marginTop: 16, marginBottom: 8 },
  // Card framing
  cardStart: {}, cardEnd: { marginBottom: 4 },
  cardTopBorder: { height: 1, borderTopLeftRadius: 10, borderTopRightRadius: 10, borderTopWidth: StyleSheet.hairlineWidth, borderLeftWidth: StyleSheet.hairlineWidth, borderRightWidth: StyleSheet.hairlineWidth, borderBottomWidth: 0 },
  cardBottomBorder: { height: 1, borderBottomLeftRadius: 10, borderBottomRightRadius: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderLeftWidth: StyleSheet.hairlineWidth, borderRightWidth: StyleSheet.hairlineWidth, borderTopWidth: 0 },
  itemInner: {},
  rimLight: { position: 'absolute', left: 0, right: 0, top: 0, height: 1, borderTopWidth: 1 },
  separator: { height: StyleSheet.hairlineWidth, marginLeft: 72 },
  loading: { padding: 40, alignItems: 'center' },
  emptyWrap: { flex: 1, minHeight: 300 },
  // Search bar
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === 'ios' ? 10 : 8,
    marginBottom: 10,
    overflow: 'hidden',
  },
  searchInput: { flex: 1, fontSize: 13, padding: 0 },
  // Tone chips
  toneRow: { flexDirection: 'row', gap: 6, marginBottom: 14 },
  toneChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  toneDot: { width: 7, height: 7, borderRadius: 3.5 },
  toneLabel: { fontSize: 11 },
});
