import React, { useMemo } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import { useListEvents, useListWeddings } from '@workspace/api-client-react';
import { useWedding } from '@/context/WeddingContext';
import { useColors } from '@/hooks/useColors';
import { SERIF, SANS, SANS_MEDIUM, SANS_SEMIBOLD } from '@/constants/fonts';

export default function JourJScreen() {
  const colors = useColors();
  const { selectedWeddingId } = useWedding();
  const { data: weddings } = useListWeddings();
  const wedding = weddings?.find((item) => item.id === selectedWeddingId) ?? weddings?.[0];
  const { data: events, isLoading, refetch, isRefetching } = useListEvents(wedding?.id ?? 0);
  const today = new Date().toISOString().slice(0, 10);
  const dayEvents = useMemo(() => (events ?? []).filter((event) => event.eventDate.slice(0, 10) === today), [events, today]);

  return (
    <FlatList
      data={dayEvents}
      keyExtractor={(item) => String(item.id)}
      refreshing={isRefetching}
      onRefresh={refetch}
      contentContainerStyle={ss.list}
      ListHeaderComponent={
        <LinearGradient colors={[colors.plumDark, colors.plum, colors.plumLight]} style={ss.hero}>
          <Text style={[ss.eyebrow, { color: colors.gold, fontFamily: SANS_MEDIUM }]}>LE GRAND JOUR</Text>
          <Text style={[ss.title, { color: '#FBF5FB', fontFamily: SERIF }]}>Jour-J</Text>
          <Text style={[ss.subtitle, { color: '#DEC0DE', fontFamily: SANS }]}>{wedding?.names ?? 'Votre mariage'}</Text>
          <View style={ss.dateRow}><Feather name="calendar" size={14} color={colors.gold} /><Text style={[ss.date, { color: '#FBF5FB', fontFamily: SANS_SEMIBOLD }]}>{new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}</Text></View>
        </LinearGradient>
      }
      ListEmptyComponent={
        isLoading ? <ActivityIndicator color={colors.plum} style={{ marginTop: 40 }} /> :
        <View style={[ss.empty, { backgroundColor: colors.card, borderColor: colors.border }]}><Feather name="sun" size={28} color={colors.goldDim} /><Text style={[ss.emptyTitle, { color: colors.foreground, fontFamily: SERIF }]}>Aucun événement aujourd’hui</Text><Text style={[ss.emptyBody, { color: colors.mutedForeground, fontFamily: SANS }]}>Les événements du jour apparaîtront ici pour vous accompagner pendant la célébration.</Text></View>
      }
      renderItem={({ item }) => (
        <View style={[ss.event, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={[ss.time, { backgroundColor: colors.plum + '12' }]}><Text style={[ss.timeText, { color: colors.plum, fontFamily: SANS_SEMIBOLD }]}>{item.eventTime || '—'}</Text></View>
          <View style={{ flex: 1 }}><Text style={[ss.eventTitle, { color: colors.foreground, fontFamily: SERIF }]}>{item.title}</Text>{item.location ? <Text style={[ss.eventMeta, { color: colors.mutedForeground, fontFamily: SANS }]}>{item.location}</Text> : null}</View>
          <Feather name={item.completed ? 'check-circle' : 'circle'} size={18} color={item.completed ? colors.sage : colors.mutedForeground} />
        </View>
      )}
    />
  );
}

const ss = StyleSheet.create({
  list: { paddingBottom: 140, flexGrow: 1 },
  hero: { paddingHorizontal: 22, paddingTop: 30, paddingBottom: 28, borderBottomLeftRadius: 26, borderBottomRightRadius: 26 },
  eyebrow: { fontSize: 9, letterSpacing: 2, marginBottom: 8 },
  title: { fontSize: 42, lineHeight: 44 },
  subtitle: { fontSize: 12, marginTop: 8 },
  dateRow: { flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 22 },
  date: { fontSize: 12, textTransform: 'capitalize' },
  event: { marginHorizontal: 16, marginTop: 10, padding: 14, borderRadius: 14, borderWidth: StyleSheet.hairlineWidth, flexDirection: 'row', alignItems: 'center', gap: 12 },
  time: { minWidth: 54, paddingVertical: 8, borderRadius: 8, alignItems: 'center' },
  timeText: { fontSize: 11 },
  eventTitle: { fontSize: 21 },
  eventMeta: { fontSize: 11, marginTop: 3 },
  empty: { margin: 16, padding: 28, borderRadius: 14, borderWidth: 1, alignItems: 'center' },
  emptyTitle: { fontSize: 24, marginTop: 12, textAlign: 'center' },
  emptyBody: { fontSize: 11, lineHeight: 18, textAlign: 'center', marginTop: 8 },
});