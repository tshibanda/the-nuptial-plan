import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator, Alert, Linking, Platform, RefreshControl, ScrollView, StyleSheet,
  Text, TouchableOpacity, View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import type { CalendarEvent, Vendor } from '@workspace/api-client-react';
import {
  getListEventsQueryKey, useDeleteEvent, useListEvents, useListVendors,
  useListWeddings, useUpdateEvent,
} from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import { useWedding } from '@/context/WeddingContext';
import { useColors } from '@/hooks/useColors';
import { SERIF, SANS, SANS_MEDIUM, SANS_SEMIBOLD } from '@/constants/fonts';
import { EventAddSheet } from '@/components/EventAddSheet';

type Tab = 'runsheet' | 'prestataires' | 'checklist';
type EventStatus = 'terminé' | 'en_cours' | 'en_retard' | 'à_venir';

const TONES: Record<string, string> = {
  plum: '#5D2D5D', gold: '#C8A96E', rose: '#CC8C94',
  sage: '#6B8C72', lavender: '#9B89C4', blue: '#6B8FC0',
};

function sortEvents(events: CalendarEvent[]) {
  return [...events].sort((a, b) =>
    a.eventDate.localeCompare(b.eventDate) ||
    (a.eventTime || '99:99').localeCompare(b.eventTime || '99:99'));
}

function statusOf(event: CalendarEvent): EventStatus {
  if (event.completed) return 'terminé';
  const today = new Date().toISOString().slice(0, 10);
  if (event.eventDate < today) return 'en_retard';
  if (event.eventDate === today && event.eventTime) {
    const [hour, minute] = event.eventTime.split(':').map(Number);
    const current = new Date();
    const eventTime = new Date();
    eventTime.setHours(hour, minute, 0, 0);
    if (current >= eventTime) return 'en_cours';
  }
  return 'à_venir';
}

const STATUS_META: Record<EventStatus, { label: string; color: string }> = {
  terminé: { label: 'Terminé', color: '#4A7157' },
  en_cours: { label: 'En cours', color: '#A87532' },
  en_retard: { label: 'En retard', color: '#9D6246' },
  à_venir: { label: 'À venir', color: '#8C858C' },
};

function formatDate(date: string) {
  return new Date(`${date.slice(0, 10)}T12:00:00`).toLocaleDateString('fr-FR', {
    weekday: 'long', day: 'numeric', month: 'long',
  });
}

function initials(name: string) {
  return name.split(/\s+/).map((word) => word[0]).join('').slice(0, 2).toUpperCase();
}

export default function JourJScreen() {
  const colors = useColors();
  const { selectedWeddingId } = useWedding();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<Tab>('runsheet');
  const [editEvent, setEditEvent] = useState<CalendarEvent | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [exporting, setExporting] = useState(false);

  const { data: weddings } = useListWeddings();
  const wedding = weddings?.find((item) => item.id === selectedWeddingId) ?? weddings?.[0];
  const weddingId = wedding?.id ?? 0;
  const eventsQuery = useListEvents(weddingId);
  const vendorsQuery = useListVendors(weddingId);
  const events = useMemo(() => sortEvents(eventsQuery.data ?? []), [eventsQuery.data]);
  const vendors = vendorsQuery.data ?? [];
  const completedCount = events.filter((event) => event.completed).length;
  const progress = events.length ? Math.round((completedCount / events.length) * 100) : 0;

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: getListEventsQueryKey(weddingId) });
  };
  const updateEvent = useUpdateEvent();
  const deleteEvent = useDeleteEvent();

  const toggleEvent = (event: CalendarEvent) => {
    updateEvent.mutate({ weddingId, id: event.id, data: { completed: !event.completed } }, { onSuccess: invalidate });
  };

  const removeEvent = (event: CalendarEvent) => {
    Alert.alert('Supprimer cette étape ?', `"${event.title}" sera supprimée du déroulé.`, [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Supprimer', style: 'destructive', onPress: () => deleteEvent.mutate({ weddingId, id: event.id }, { onSuccess: invalidate }) },
    ]);
  };

  const exportPdf = async () => {
    if (!wedding || events.length === 0 || exporting) return;
    setExporting(true);
    try {
      const rows = events.map((event) => `
        <tr>
          <td>${event.eventTime?.slice(0, 5) ?? '—'}</td>
          <td><strong>${event.title}</strong><br/><small>${event.location ?? ''}${event.actors ? ` · ${event.actors}` : ''}</small></td>
          <td>${event.completed ? '✓ Terminé' : 'À venir'}</td>
        </tr>`).join('');
      const html = `<html><head><meta name="viewport" content="width=device-width, initial-scale=1"/><style>
        body{font-family:Arial,sans-serif;color:#3C1A3C;padding:28px}h1{font-family:Georgia,serif;font-size:30px;margin:0 0 4px}h2{font-size:12px;color:#8a6530;text-transform:uppercase;letter-spacing:2px;margin-top:28px}p{font-size:12px;color:#777}table{width:100%;border-collapse:collapse;margin-top:12px}td{padding:10px 6px;border-bottom:1px solid #eadfe8;font-size:11px;vertical-align:top}td:first-child{width:52px;color:#5D2D5D;font-family:Georgia,serif;font-size:16px}td:last-child{width:70px;color:#6B8C72;font-size:10px}small{color:#888;font-size:9px}</style></head><body>
        <h2>Grand jour</h2><h1>Jour J</h1><p>${wedding.names} · ${wedding.weddingDate}${wedding.venue ? ` · ${wedding.venue}` : ''}</p>
        <h2>Déroulé de la célébration</h2><table>${rows}</table>
        <p style="margin-top:28px;text-align:right">${completedCount}/${events.length} étapes terminées</p>
      </body></html>`;
      if (Platform.OS === 'web') {
        const win = window.open('', '_blank');
        if (win) { win.document.write(html); win.document.close(); win.focus(); win.print(); }
      } else {
        const { uri } = await Print.printToFileAsync({ html, base64: false });
        if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(uri, { mimeType: 'application/pdf', dialogTitle: 'Partager le déroulé Jour J', UTI: 'com.adobe.pdf' });
        else await Print.printAsync({ uri });
      }
    } catch {
      Alert.alert('Erreur d’export', 'Impossible de générer le PDF. Veuillez réessayer.');
    } finally {
      setExporting(false);
    }
  };

  const grouped = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    events.forEach((event) => map.set(event.eventDate, [...(map.get(event.eventDate) ?? []), event]));
    return Array.from(map.entries());
  }, [events]);

  const timeGroups: [string, CalendarEvent[]][] = [
    ['Matinée', events.filter((event) => !event.eventTime || event.eventTime < '12:00')],
    ['Après-midi', events.filter((event) => !!event.eventTime && event.eventTime >= '12:00' && event.eventTime < '18:00')],
    ['Soirée', events.filter((event) => !!event.eventTime && event.eventTime >= '18:00')],
  ];

  const renderEvent = (event: CalendarEvent, showDate = false) => {
    const status = statusOf(event);
    const meta = STATUS_META[status];
    const accent = status === 'en_cours' ? meta.color : TONES[event.tone ?? 'plum'] ?? TONES.plum;
    return (
      <View key={event.id} style={[ss.eventCard, { backgroundColor: colors.card, borderColor: colors.border, opacity: status === 'terminé' ? 0.68 : 1 }]}>
        <View style={[ss.accentBar, { backgroundColor: accent }]} />
        {showDate && <Text style={[ss.eventDate, { color: colors.goldDim, fontFamily: SANS_SEMIBOLD }]}>{formatDate(event.eventDate)}</Text>}
        <View style={ss.eventRow}>
          <View style={ss.timeCol}><Text style={[ss.eventTime, { color: accent, fontFamily: SERIF }]}>{event.eventTime?.slice(0, 5) || '—'}</Text></View>
          <View style={ss.eventMain}>
            <View style={ss.eventTitleRow}>
              <Text numberOfLines={2} style={[ss.eventTitle, { color: colors.foreground, fontFamily: SANS_SEMIBOLD, textDecorationLine: status === 'terminé' ? 'line-through' : 'none' }]}>{event.title}</Text>
              <View style={[ss.statusPill, { backgroundColor: meta.color + '18' }]}><Text style={[ss.statusText, { color: meta.color, fontFamily: SANS_MEDIUM }]}>{meta.label}</Text></View>
            </View>
            {event.location ? <View style={ss.metaRow}><Feather name="map-pin" size={10} color={colors.plum + '88'} /><Text style={[ss.metaText, { color: colors.mutedForeground, fontFamily: SANS }]}>{event.location}</Text></View> : null}
            {event.actors ? <View style={ss.metaRow}><Feather name="users" size={10} color={colors.plum + '88'} /><Text style={[ss.metaText, { color: colors.mutedForeground, fontFamily: SANS }]}>{event.actors}</Text></View> : null}
            {event.detail ? <Text style={[ss.detail, { color: colors.mutedForeground, fontFamily: SANS }]}>{event.detail}</Text> : null}
          </View>
          <View style={ss.eventActions}>
            <TouchableOpacity onPress={() => { setEditEvent(event); setEditOpen(true); }} hitSlop={8}><Feather name="edit-2" size={14} color={colors.mutedForeground} /></TouchableOpacity>
            <TouchableOpacity onPress={() => removeEvent(event)} hitSlop={8}><Feather name="trash-2" size={14} color={colors.rose} /></TouchableOpacity>
            <TouchableOpacity onPress={() => toggleEvent(event)} hitSlop={8}><Feather name={event.completed ? 'check-circle' : 'circle'} size={21} color={event.completed ? colors.sage : colors.mutedForeground} /></TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  return (
    <>
      <ScrollView
        style={{ flex: 1, backgroundColor: colors.background }}
        contentContainerStyle={ss.list}
        refreshControl={<RefreshControl refreshing={eventsQuery.isRefetching || vendorsQuery.isRefetching} onRefresh={() => { void eventsQuery.refetch(); void vendorsQuery.refetch(); }} tintColor={colors.plum} />}
        showsVerticalScrollIndicator={false}
      >
        <LinearGradient colors={[colors.plumDark, colors.plum, colors.plumLight]} style={ss.hero}>
          <Text style={[ss.eyebrow, { color: colors.gold, fontFamily: SANS_MEDIUM }]}>GRAND JOUR</Text>
          <View style={ss.heroTitleRow}>
            <View style={{ flex: 1 }}>
              <Text style={[ss.title, { color: '#FBF5FB', fontFamily: SERIF }]}>Jour J</Text>
              <Text style={[ss.subtitle, { color: '#DEC0DE', fontFamily: SANS }]}>{wedding?.names ?? 'Aucun mariage sélectionné'}</Text>
            </View>
            <View style={ss.heroActions}>
              <TouchableOpacity onPress={exportPdf} disabled={exporting || events.length === 0} style={[ss.exportButton, { opacity: exporting || events.length === 0 ? 0.55 : 1 }]}><Feather name="file-text" size={13} color={colors.gold} /><Text style={[ss.exportText, { fontFamily: SANS_SEMIBOLD }]}>{exporting ? 'Export…' : 'PDF'}</Text></TouchableOpacity>
              <TouchableOpacity onPress={() => { setEditEvent(null); setEditOpen(true); }} style={ss.addButton}><Feather name="plus" size={14} color="#FBF5FB" /><Text style={[ss.addText, { fontFamily: SANS_SEMIBOLD }]}>Ajouter</Text></TouchableOpacity>
            </View>
          </View>
          {wedding && <View style={ss.weddingMeta}><Feather name="calendar" size={13} color={colors.gold} /><Text style={[ss.metaLight, { fontFamily: SANS }]}>{formatDate(wedding.weddingDate)}{wedding.venue ? ` · ${wedding.venue}` : ''}</Text></View>}
        </LinearGradient>

        <View style={[ss.progressCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={ss.progressHeader}><Text style={[ss.progressLabel, { color: colors.foreground, fontFamily: SANS_SEMIBOLD }]}>Avancement du programme</Text><Text style={[ss.progressValue, { color: colors.foreground, fontFamily: SERIF }]}>{completedCount}<Text style={ss.progressTotal}>/{events.length}</Text></Text></View>
          <View style={[ss.progressTrack, { backgroundColor: colors.muted }]}><View style={[ss.progressFill, { width: `${progress}%`, backgroundColor: colors.plum }]} /></View>
          <Text style={[ss.progressCaption, { color: colors.mutedForeground, fontFamily: SANS }]}>{progress}% complété</Text>
        </View>

        <View style={[ss.tabs, { backgroundColor: colors.muted, borderColor: colors.border }]}>
          {([
            ['runsheet', 'clipboard', 'Runsheet'],
            ['prestataires', 'user', 'Prestataires'],
            ['checklist', 'check', 'Checklist'],
          ] as const).map(([key, icon, label]) => (
            <TouchableOpacity key={key} onPress={() => setTab(key)} style={[ss.tab, tab === key && { backgroundColor: colors.plum }]}><Feather name={icon} size={13} color={tab === key ? '#fff' : colors.mutedForeground} /><Text style={[ss.tabText, { color: tab === key ? '#fff' : colors.mutedForeground, fontFamily: SANS_SEMIBOLD }]}>{label}</Text></TouchableOpacity>
          ))}
        </View>

        {tab === 'runsheet' && (
          events.length === 0
            ? <Empty icon="clipboard" title="Aucun événement planifié" text="Ajoutez les étapes importantes de votre grand jour." colors={colors} />
            : <View style={ss.section}>{grouped.map(([date, dayEvents]) => <View key={date}><Text style={[ss.dayLabel, { color: colors.goldDim, fontFamily: SANS_SEMIBOLD }]}>{formatDate(date)}</Text>{dayEvents.map((event) => renderEvent(event))}</View>)}</View>
        )}
        {tab === 'prestataires' && (
          vendors.length === 0
            ? <Empty icon="user" title="Aucun prestataire enregistré" text="Ajoutez votre équipe depuis la page Prestataires." colors={colors} />
            : <View style={ss.section}>{vendors.map((vendor: Vendor) => <View key={vendor.id} style={[ss.vendorCard, { backgroundColor: colors.card, borderColor: colors.border }]}><View style={[ss.vendorAvatar, { backgroundColor: colors.gold + '20', borderColor: colors.gold + '55' }]}><Text style={[ss.vendorInitials, { color: colors.goldDim, fontFamily: SERIF }]}>{initials(vendor.name)}</Text></View><View style={{ flex: 1 }}><Text style={[ss.vendorName, { color: colors.foreground, fontFamily: SANS_SEMIBOLD }]}>{vendor.name}</Text>{vendor.category ? <Text style={[ss.vendorCategory, { color: colors.mutedForeground, fontFamily: SANS }]}>{vendor.category}</Text> : null}{vendor.contactName ? <View style={ss.metaRow}><Feather name="user" size={10} color={colors.plum + '88'} /><Text style={[ss.metaText, { color: colors.mutedForeground, fontFamily: SANS }]}>{vendor.contactName}</Text></View> : null}{vendor.contactEmail ? <TouchableOpacity onPress={() => void Linking.openURL(`mailto:${vendor.contactEmail}`)} style={ss.metaRow}><Feather name="mail" size={10} color={colors.plum} /><Text style={[ss.metaText, { color: colors.plum, fontFamily: SANS }]}>{vendor.contactEmail}</Text></TouchableOpacity> : null}</View></View>)}</View>
        )}
        {tab === 'checklist' && (
          <View style={ss.section}>{timeGroups.every(([, group]) => group.length === 0) ? <Empty icon="check" title="Aucune tâche à afficher" text="Les étapes du déroulé apparaîtront ici." colors={colors} /> : timeGroups.map(([label, group]) => group.length ? <View key={label} style={ss.checkGroup}><View style={ss.checkHeader}><Text style={[ss.dayLabel, { color: colors.goldDim, fontFamily: SANS_SEMIBOLD }]}>{label}</Text><Text style={[ss.count, { color: colors.mutedForeground, fontFamily: SANS }]}>{group.filter((event) => event.completed).length}/{group.length}</Text></View>{group.map((event) => <TouchableOpacity key={event.id} onPress={() => toggleEvent(event)} style={[ss.checkRow, { backgroundColor: colors.card, borderColor: colors.border }]}><Feather name={event.completed ? 'check-circle' : 'circle'} size={20} color={event.completed ? colors.sage : colors.mutedForeground} /><Text style={[ss.checkTitle, { color: event.completed ? colors.mutedForeground : colors.foreground, fontFamily: SANS, textDecorationLine: event.completed ? 'line-through' : 'none' }]}>{event.title}</Text>{event.eventTime ? <Text style={[ss.checkTime, { color: colors.mutedForeground, fontFamily: SANS }]}>{event.eventTime.slice(0, 5)}</Text> : null}</TouchableOpacity>)}</View> : null)}</View>
        )}
      </ScrollView>
      <EventAddSheet visible={editOpen} onClose={() => setEditOpen(false)} weddingId={weddingId} initialEvent={editEvent} onCreated={() => { setEditOpen(false); invalidate(); }} />
    </>
  );
}

function Empty({ icon, title, text, colors }: { icon: string; title: string; text: string; colors: ReturnType<typeof useColors> }) {
  return <View style={[ss.empty, { backgroundColor: colors.card, borderColor: colors.border }]}><Feather name={icon as any} size={28} color={colors.mutedForeground} /><Text style={[ss.emptyTitle, { color: colors.foreground, fontFamily: SERIF }]}>{title}</Text><Text style={[ss.emptyBody, { color: colors.mutedForeground, fontFamily: SANS }]}>{text}</Text></View>;
}

const ss = StyleSheet.create({
  list: { paddingBottom: 230, flexGrow: 1 },
  hero: { paddingHorizontal: 20, paddingTop: 30, paddingBottom: 24, borderBottomLeftRadius: 26, borderBottomRightRadius: 26 },
  eyebrow: { fontSize: 9, letterSpacing: 2, marginBottom: 8 },
  heroTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  heroActions: { alignItems: 'flex-end', gap: 7 },
  title: { fontSize: 42, lineHeight: 44 },
  subtitle: { fontSize: 12, marginTop: 6 },
  addButton: { flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: 9, paddingHorizontal: 10, minHeight: 34, backgroundColor: 'rgba(255,255,255,0.14)', borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(200,170,112,0.45)' },
  addText: { color: '#FBF5FB', fontSize: 10 },
  exportButton: { flexDirection: 'row', alignItems: 'center', gap: 5, minHeight: 30, paddingHorizontal: 9, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.10)', borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(200,170,112,0.40)' },
  exportText: { color: '#C8A96E', fontSize: 10 },
  weddingMeta: { flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 18 },
  metaLight: { flex: 1, color: '#F7EAF4', fontSize: 11, textTransform: 'capitalize' },
  progressCard: { margin: 16, marginBottom: 12, padding: 15, borderRadius: 14, borderWidth: StyleSheet.hairlineWidth },
  progressHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 9 },
  progressLabel: { fontSize: 12 },
  progressValue: { fontSize: 23 },
  progressTotal: { fontSize: 13, color: '#8C858C' },
  progressTrack: { height: 8, borderRadius: 4, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 4 },
  progressCaption: { fontSize: 10, textAlign: 'right', marginTop: 5 },
  tabs: { marginHorizontal: 16, marginBottom: 12, padding: 4, borderRadius: 14, borderWidth: StyleSheet.hairlineWidth, flexDirection: 'row', gap: 4 },
  tab: { flex: 1, minHeight: 38, borderRadius: 10, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 5 },
  tabText: { fontSize: 10 },
  section: { marginHorizontal: 16 },
  dayLabel: { fontSize: 10, letterSpacing: 1.4, textTransform: 'uppercase', marginTop: 14, marginBottom: 7 },
  eventCard: { borderRadius: 13, borderWidth: StyleSheet.hairlineWidth, overflow: 'hidden', marginBottom: 8, paddingVertical: 12, paddingRight: 10 },
  accentBar: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 3 },
  eventDate: { marginLeft: 14, marginBottom: 5, fontSize: 9, textTransform: 'capitalize' },
  eventRow: { flexDirection: 'row', alignItems: 'flex-start', paddingLeft: 12, gap: 8 },
  timeCol: { width: 38, alignItems: 'flex-end', paddingTop: 2 },
  eventTime: { fontSize: 17 },
  eventMain: { flex: 1, minWidth: 0 },
  eventTitleRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 6 },
  eventTitle: { flex: 1, fontSize: 13, lineHeight: 17 },
  statusPill: { borderRadius: 10, paddingHorizontal: 6, paddingVertical: 3 },
  statusText: { fontSize: 8 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 5 },
  metaText: { flex: 1, fontSize: 10 },
  detail: { fontSize: 10, lineHeight: 15, marginTop: 5, fontStyle: 'italic' },
  eventActions: { alignItems: 'center', gap: 10, paddingTop: 1 },
  vendorCard: { borderRadius: 14, borderWidth: StyleSheet.hairlineWidth, padding: 14, marginBottom: 9, flexDirection: 'row', gap: 12 },
  vendorAvatar: { width: 42, height: 42, borderRadius: 13, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  vendorInitials: { fontSize: 15 },
  vendorName: { fontSize: 13 },
  vendorCategory: { fontSize: 10, marginTop: 2, marginBottom: 4 },
  checkGroup: { marginBottom: 16 },
  checkHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  count: { fontSize: 10 },
  checkRow: { minHeight: 48, borderWidth: StyleSheet.hairlineWidth, borderRadius: 11, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 5 },
  checkTitle: { flex: 1, fontSize: 12 },
  checkTime: { fontSize: 10 },
  empty: { margin: 16, padding: 30, borderRadius: 14, borderWidth: 1, alignItems: 'center' },
  emptyTitle: { fontSize: 24, marginTop: 12, textAlign: 'center' },
  emptyBody: { fontSize: 11, lineHeight: 18, textAlign: 'center', marginTop: 8 },
});