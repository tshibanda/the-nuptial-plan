import { useState } from 'react';
import {
  SectionList, View, Text, StyleSheet,
  ActivityIndicator, Platform, TouchableOpacity,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import { Feather } from '@expo/vector-icons';
import { useQueryClient } from '@tanstack/react-query';
import type { CalendarEvent } from '@workspace/api-client-react';
import { useListWeddings, useListEvents, useUpdateEvent, getListEventsQueryKey } from '@workspace/api-client-react';
import { useWedding } from '@/context/WeddingContext';
import { useColors } from '@/hooks/useColors';
import { SERIF, SANS, SANS_MEDIUM, SANS_SEMIBOLD } from '@/constants/fonts';
import { formatDateParts, formatDateShort } from '@/utils/format';
import { shadow, accentShadow } from '@/utils/shadow';
import { EmptyState } from '@/components/EmptyState';
import { EventAddSheet } from '@/components/EventAddSheet';

type Filter = 'all' | 'upcoming' | 'done';

const FILTERS: { key: Filter; label: string }[] = [
  { key: 'all', label: 'Tous' },
  { key: 'upcoming', label: 'À venir' },
  { key: 'done', label: 'Terminés' },
];

interface Section {
  title: string;   // month label e.g. "AOÛT 2026"
  data: CalendarEvent[];
}

function buildSections(events: CalendarEvent[]): Section[] {
  const sorted = [...events].sort(
    (a, b) => new Date(a.eventDate).getTime() - new Date(b.eventDate).getTime()
  );
  const map = new Map<string, CalendarEvent[]>();
  for (const evt of sorted) {
    const key = new Date(evt.eventDate).toLocaleDateString('fr-FR', {
      month: 'long', year: 'numeric',
    }).toUpperCase();
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(evt);
  }
  return Array.from(map.entries()).map(([title, data]) => ({ title, data }));
}

// ── Tone dot ─────────────────────────────────────────────────────────────────
function ToneDot({ tone, colors }: { tone?: string | null; colors: ReturnType<typeof useColors> }) {
  const map: Record<string, string> = {
    gold: colors.gold,
    rose: colors.rose,
    sage: colors.sage,
  };
  const c = (tone && map[tone]) ?? 'transparent';
  if (c === 'transparent') return null;
  return <View style={[td.dot, { backgroundColor: c }]} />;
}
const td = StyleSheet.create({ dot: { width: 6, height: 6, borderRadius: 3 } });

// ── Event row inside a card ────────────────────────────────────────────────────
function EventRow({
  item,
  isFirst,
  isLast,
  colors,
  onToggle,
}: {
  item: CalendarEvent;
  isFirst: boolean;
  isLast: boolean;
  colors: ReturnType<typeof useColors>;
  onToggle: (item: CalendarEvent) => void;
}) {
  const { day, month } = formatDateParts(item.eventDate);
  const isCompleted = item.completed ?? false;

  return (
    <View
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
          {formatDateShort(item.eventDate)}
        </Text>
      </View>

      {/* Complete toggle */}
      <TouchableOpacity
        onPress={() => onToggle(item)}
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
    </View>
  );
}

const er = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  firstRow: { paddingTop: 14 },
  lastRow: { paddingBottom: 14 },
  dateBadge: {
    width: 46,
    height: 46,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  day: { fontSize: 20, lineHeight: 20 },
  monthTxt: { fontSize: 7, letterSpacing: 0.8, marginTop: 1 },
  info: { flex: 1, gap: 2 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  title: { fontSize: 13, flex: 1 },
  strikethrough: { textDecorationLine: 'line-through' },
  meta: { fontSize: 10 },
  dateStr: { fontSize: 9, letterSpacing: 0.3, marginTop: 1 },
  checkBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  checkEmpty: { width: 8, height: 8, borderRadius: 4 },
});

// ── Stat block (for glassmorphic bar) ─────────────────────────────────────────
function StatBlock({
  value, label, color, colors,
}: {
  value: number; label: string; color: string; colors: ReturnType<typeof useColors>;
}) {
  return (
    <View style={hs.statBlock}>
      <Text style={[hs.statValue, { fontFamily: SERIF, color }]}>{value}</Text>
      <Text style={[hs.statLabel, { fontFamily: SANS_MEDIUM, color: colors.mutedForeground }]}>
        {label}
      </Text>
    </View>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────
export default function EvenementsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { selectedWeddingId } = useWedding();
  const topPad = Platform.OS === 'web' ? 67 : insets.top;
  const [filter, setFilter] = useState<Filter>('all');
  const [showAdd, setShowAdd] = useState(false);
  const queryClient = useQueryClient();

  const { data: weddings } = useListWeddings();
  const activeWedding = weddings?.find((w) => w.id === selectedWeddingId) ?? weddings?.[0];
  const wId = activeWedding?.id ?? 0;

  const { data: events, isLoading, refetch, isRefetching } = useListEvents(wId);

  // Use the generated key getter so cache reads/writes target the same entry as useListEvents
  const EVENTS_QUERY_KEY = getListEventsQueryKey(wId);

  const { mutate: updateEvent } = useUpdateEvent({
    mutation: {
      onMutate: async ({ id, data: patch }) => {
        await queryClient.cancelQueries({ queryKey: EVENTS_QUERY_KEY });
        const prev = queryClient.getQueryData(EVENTS_QUERY_KEY);
        queryClient.setQueryData(
          EVENTS_QUERY_KEY,
          (old: CalendarEvent[] | undefined) =>
            old?.map((e) => (e.id === id ? { ...e, ...patch } : e)) ?? old
        );
        return { prev };
      },
      onError: (_err, _vars, context: any) => {
        if (context?.prev !== undefined) {
          queryClient.setQueryData(EVENTS_QUERY_KEY, context.prev);
        }
      },
      onSettled: () => {
        queryClient.invalidateQueries({ queryKey: EVENTS_QUERY_KEY });
      },
    },
  });

  const handleToggle = (item: CalendarEvent) => {
    Haptics.impactAsync(
      item.completed ? Haptics.ImpactFeedbackStyle.Light : Haptics.ImpactFeedbackStyle.Medium
    );
    updateEvent({ weddingId: wId, id: item.id, data: { completed: !item.completed } });
  };

  const allEvents = events ?? [];
  const filtered = allEvents.filter((e) => {
    if (filter === 'upcoming') return !e.completed;
    if (filter === 'done') return e.completed;
    return true;
  });

  const sections = buildSections(filtered);
  const upcomingCount = allEvents.filter((e) => !e.completed).length;
  const doneCount = allEvents.filter((e) => !!e.completed).length;

  return (
    <>
      <SectionList
        sections={sections}
        keyExtractor={(item) => String(item.id)}
        style={{ flex: 1, backgroundColor: colors.background }}
        contentContainerStyle={{ paddingBottom: 100, flexGrow: 1 }}
        refreshing={isRefetching}
        onRefresh={refetch}
        showsVerticalScrollIndicator={false}
        stickySectionHeadersEnabled={false}
        ListHeaderComponent={
          <View>
            {/* ── Hero gradient header ── */}
            <LinearGradient
              colors={[colors.plumDark, colors.plum, colors.plumLight]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[hs.hero, { paddingTop: topPad + 20 }]}
            >
              {/* Ambient blobs */}
              <View
                style={{ position: 'absolute', top: -20, right: -20, width: 110, height: 110, borderRadius: 55, backgroundColor: colors.gold + '20' }}
                pointerEvents="none"
              />
              <View
                style={{ position: 'absolute', bottom: 0, left: 10, width: 80, height: 80, borderRadius: 40, backgroundColor: colors.sage + '18' }}
                pointerEvents="none"
              />
              <LinearGradient
                colors={['rgba(255,255,255,0.08)', 'transparent']}
                style={hs.heroSheen}
                pointerEvents="none"
              />
              <View style={hs.goldBar} />

              <Text style={[hs.eye, { fontFamily: SANS_MEDIUM, color: '#C8A96E' }]}>
                LA CÉLÉBRATION
              </Text>
              <Text style={[hs.heroTitle, { fontFamily: SERIF, color: '#FBF5FB' }]}>Agenda</Text>
            </LinearGradient>

            <View style={{ paddingHorizontal: 16, paddingTop: 16 }}>
              {/* Stats bar */}
              {allEvents.length > 0 && (
                <View style={[hs.statsWrap, shadow('md')]}>
                  <BlurView
                    intensity={Platform.OS === 'web' ? 0 : 85}
                    tint="light"
                    style={[
                      hs.statsBar,
                      {
                        backgroundColor:
                          Platform.OS === 'web' ? colors.card + 'ee' : 'rgba(248,245,239,0.80)',
                        borderColor: 'rgba(255,255,255,0.65)',
                      },
                    ]}
                  >
                    <View style={[hs.rim, { borderTopColor: 'rgba(255,255,255,0.80)' }]} />
                    <StatBlock value={allEvents.length} label="Total" color={colors.foreground} colors={colors} />
                    <View style={[hs.divider, { backgroundColor: colors.border }]} />
                    <StatBlock value={upcomingCount} label="À venir" color={colors.plum} colors={colors} />
                    <View style={[hs.divider, { backgroundColor: colors.border }]} />
                    <StatBlock value={doneCount} label="Terminés" color={colors.sage} colors={colors} />
                  </BlurView>
                </View>
              )}

              {/* Filter pills */}
              <View style={hs.filterRow}>
                {FILTERS.map((f) => {
                  const isActive = filter === f.key;
                  return (
                    <TouchableOpacity
                      key={f.key}
                      onPress={() => setFilter(f.key)}
                      activeOpacity={0.75}
                      style={[
                        hs.pill,
                        isActive ? accentShadow('sm') : shadow('xs'),
                        {
                          backgroundColor: isActive ? colors.plum : 'rgba(255,255,255,0.70)',
                          borderColor: isActive ? colors.plum : colors.border,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          hs.pillText,
                          { fontFamily: SANS_MEDIUM, color: isActive ? '#FBF5FB' : colors.mutedForeground },
                        ]}
                      >
                        {f.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          </View>
        }
        ListEmptyComponent={
          isLoading ? (
            <View style={hs.loading}>
              <ActivityIndicator color={colors.accent} />
            </View>
          ) : (
            <View style={hs.emptyWrap}>
              <EmptyState
                icon="calendar"
                title={filter === 'done' ? 'Aucun événement terminé' : 'Aucun événement'}
                subtitle={
                  filter === 'all'
                    ? 'Ajoutez votre premier événement avec le bouton +.'
                    : undefined
                }
              />
            </View>
          )
        }
        renderSectionHeader={({ section }) => (
          <View style={{ paddingHorizontal: 16 }}>
            <Text style={[hs.monthSep, { fontFamily: SANS_SEMIBOLD, color: colors.goldDim }]}>
              {section.title}
            </Text>
          </View>
        )}
        renderItem={({ item, index, section }) => {
          const isFirst = index === 0;
          const isLast = index === section.data.length - 1;
          return (
            <View style={[{ paddingHorizontal: 16 }, isFirst && hs.cardStart, isLast && hs.cardEnd]}>
              {isFirst && (
                <View
                  style={[
                    hs.cardTopBorder,
                    {
                      borderColor: colors.border,
                      backgroundColor: colors.card,
                      ...shadow('md'),
                    },
                  ]}
                />
              )}
              <View
                style={[
                  hs.itemInner,
                  {
                    backgroundColor: colors.card,
                    borderLeftColor: colors.border,
                    borderRightColor: colors.border,
                    borderLeftWidth: StyleSheet.hairlineWidth,
                    borderRightWidth: StyleSheet.hairlineWidth,
                  },
                ]}
              >
                {isFirst && (
                  <View style={[hs.rimLight, { borderTopColor: 'rgba(255,255,255,0.60)' }]} />
                )}
                <EventRow
                  item={item}
                  isFirst={isFirst}
                  isLast={isLast}
                  colors={colors}
                  onToggle={handleToggle}
                />
                {!isLast && (
                  <View
                    style={[hs.separator, { backgroundColor: colors.border }]}
                  />
                )}
              </View>
              {isLast && (
                <View
                  style={[
                    hs.cardBottomBorder,
                    {
                      borderColor: colors.border,
                      backgroundColor: colors.card,
                    },
                  ]}
                />
              )}
            </View>
          );
        }}
      />

      {/* FAB */}
      <View
        style={[
          hs.fab,
          accentShadow('lg'),
          {
            backgroundColor: colors.plum,
            bottom: Platform.OS === 'web' ? 94 : insets.bottom + 84,
          },
        ]}
        pointerEvents="box-none"
      >
        <TouchableOpacity
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setShowAdd(true);
          }}
          activeOpacity={0.82}
          style={hs.fabInner}
        >
          <Feather name="plus" size={22} color="#FBF5FB" />
        </TouchableOpacity>
      </View>

      <EventAddSheet
        visible={showAdd}
        onClose={() => setShowAdd(false)}
        weddingId={wId}
        onCreated={() => {
          queryClient.invalidateQueries({ queryKey: EVENTS_QUERY_KEY });
          setShowAdd(false);
        }}
      />
    </>
  );
}

const hs = StyleSheet.create({
  hero: { paddingHorizontal: 20, paddingBottom: 22, overflow: 'hidden' },
  heroSheen: { ...StyleSheet.absoluteFillObject, height: 80 },
  goldBar: {
    position: 'absolute',
    top: 0, left: 0, right: 0,
    height: 1.5,
    backgroundColor: 'rgba(200,170,112,0.35)',
  },
  eye: { fontSize: 9, letterSpacing: 2, marginBottom: 4 },
  heroTitle: { fontSize: 34, lineHeight: 34 },
  statsWrap: { borderRadius: 12, marginBottom: 14, overflow: 'hidden' },
  statsBar: {
    flexDirection: 'row',
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 14,
    alignItems: 'center',
    overflow: 'hidden',
  },
  rim: { position: 'absolute', left: 0, right: 0, top: 0, height: 1, borderTopWidth: 1 },
  divider: { width: StyleSheet.hairlineWidth, height: 32 },
  statBlock: { flex: 1, alignItems: 'center', gap: 2 },
  statValue: { fontSize: 26, lineHeight: 26 },
  statLabel: { fontSize: 9, letterSpacing: 0.5 },
  filterRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap', marginBottom: 12 },
  pill: {
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  pillText: { fontSize: 11 },
  monthSep: { fontSize: 8, letterSpacing: 1.4, marginTop: 16, marginBottom: 8 },
  // Card rendering using separate top/bottom border views + side borders per item
  cardStart: {},
  cardEnd: { marginBottom: 4 },
  cardTopBorder: {
    height: 1,
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderLeftWidth: StyleSheet.hairlineWidth,
    borderRightWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: 0,
  },
  cardBottomBorder: {
    height: 1,
    borderBottomLeftRadius: 10,
    borderBottomRightRadius: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderLeftWidth: StyleSheet.hairlineWidth,
    borderRightWidth: StyleSheet.hairlineWidth,
    borderTopWidth: 0,
  },
  itemInner: {},
  rimLight: {
    position: 'absolute',
    left: 0, right: 0, top: 0,
    height: 1,
    borderTopWidth: 1,
  },
  separator: { height: StyleSheet.hairlineWidth, marginLeft: 72 },
  loading: { padding: 40, alignItems: 'center' },
  emptyWrap: { flex: 1, minHeight: 300 },
  fab: {
    position: 'absolute',
    right: 20,
    width: 52,
    height: 52,
    borderRadius: 26,
    overflow: 'hidden',
  },
  fabInner: {
    width: 52,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
