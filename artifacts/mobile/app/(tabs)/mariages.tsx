import {
  FlatList, View, Text, StyleSheet, TouchableOpacity,
  ActivityIndicator, Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useListWeddings } from '@workspace/api-client-react';
import { useWedding } from '@/context/WeddingContext';
import { useColors } from '@/hooks/useColors';
import { SERIF, SANS, SANS_MEDIUM, SANS_SEMIBOLD } from '@/constants/fonts';
import { daysUntil } from '@/utils/format';
import { shadow, accentShadow } from '@/utils/shadow';
import { EmptyState } from '@/components/EmptyState';

export default function MariagesScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { selectedWeddingId, selectWedding } = useWedding();
  const topPad = Platform.OS === 'web' ? 67 : insets.top;

  const { data: weddings, isLoading, refetch, isRefetching } = useListWeddings();

  const handleSelect = (id: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    selectWedding(id);
  };

  if (isLoading) {
    return (
      <View style={[ss.center, { backgroundColor: colors.background, paddingTop: topPad }]}>
        <ActivityIndicator color={colors.accent} size="large" />
      </View>
    );
  }

  return (
    <FlatList
      data={weddings ?? []}
      keyExtractor={(item) => String(item.id)}
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{ paddingBottom: 100, flexGrow: 1 }}
      refreshing={isRefetching}
      onRefresh={refetch}
      showsVerticalScrollIndicator={false}
      ListHeaderComponent={
        <View style={[ss.header, { paddingTop: topPad + 20 }]}>
          <Text style={[ss.eye, { fontFamily: SANS_SEMIBOLD, color: colors.goldDim }]}>THE NUPTIAL PLAN</Text>
          <Text style={[ss.title, { fontFamily: SERIF, color: colors.foreground }]}>Vos mariages</Text>
        </View>
      }
      ListEmptyComponent={
        <View style={ss.emptyWrap}>
          <EmptyState icon="heart" title="Aucun mariage" subtitle="Ajoutez votre premier mariage depuis l'application web." />
        </View>
      }
      renderItem={({ item }) => {
        const isActive = item.id === selectedWeddingId;
        const days = Math.max(0, daysUntil(item.weddingDate));
        const av = (item.names ?? '').split(/[\s&]+/).map((w: string) => w[0]).join('').toUpperCase().slice(0, 2);
        const cardShadow = isActive ? accentShadow('lg') : shadow('sm');

        return (
          <TouchableOpacity
            onPress={() => handleSelect(item.id)}
            activeOpacity={0.85}
            style={[ss.wcard, { marginHorizontal: 16, marginBottom: 14 }, cardShadow]}
          >
            <LinearGradient
              colors={isActive
                ? [colors.navyLight, colors.navyDark]
                : ['rgba(255,255,255,0.60)', colors.card]}
              style={[ss.wcardInner, { borderColor: isActive ? colors.gold + 'aa' : colors.border }]}
            >
              {/* Rim highlight */}
              <View style={[ss.rim, { borderTopColor: isActive ? 'rgba(200,170,112,0.35)' : 'rgba(255,255,255,0.70)' }]} />

              <View style={ss.wcardTop}>
                <View style={[
                  ss.avatar,
                  { backgroundColor: isActive ? 'rgba(200,170,112,0.18)' : 'rgba(255,255,255,0.70)' },
                  shadow('xs'),
                ]}>
                  <Text style={[ss.avatarText, { fontFamily: SERIF, color: isActive ? colors.gold : colors.foreground }]}>{av}</Text>
                </View>
                <View style={ss.wcardInfo}>
                  <Text style={[ss.wcardNames, { fontFamily: SERIF, color: isActive ? '#FBF5FB' : colors.foreground }]}>
                    {item.names}
                  </Text>
                  <Text style={[ss.wcardVenue, { fontFamily: SANS, color: isActive ? '#DEC0DE' : colors.mutedForeground }]} numberOfLines={1}>
                    {item.venue}
                  </Text>
                </View>
                {isActive && (
                  <View style={[ss.activeBadge, { backgroundColor: colors.gold }, shadow('xs')]}>
                    <Feather name="check" size={11} color={colors.navy} />
                  </View>
                )}
              </View>

              <View style={[ss.wcardFooter, { borderTopColor: isActive ? 'rgba(255,255,255,0.10)' : colors.border }]}>
                <View style={ss.footerItem}>
                  <Feather name="calendar" size={12} color={isActive ? '#c8aa70' : colors.accent} />
                  <Text style={[ss.footerText, { fontFamily: SANS, color: isActive ? '#c8aa70' : colors.mutedForeground }]}>
                    {new Date(item.weddingDate).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </Text>
                </View>
                <View style={[
                  ss.daysBadge,
                  { backgroundColor: isActive ? 'rgba(200,170,112,0.18)' : 'rgba(255,255,255,0.70)' },
                  shadow('xs'),
                ]}>
                  <Text style={[ss.daysNum, { fontFamily: SERIF, color: isActive ? colors.gold : colors.foreground }]}>{days}</Text>
                  <Text style={[ss.daysLabel, { fontFamily: SANS_MEDIUM, color: isActive ? '#bdc8c4' : colors.mutedForeground }]}>JOURS</Text>
                </View>
              </View>
            </LinearGradient>
          </TouchableOpacity>
        );
      }}
    />
  );
}

const ss = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: { paddingHorizontal: 20, paddingBottom: 16 },
  eye: { fontSize: 9, letterSpacing: 2, marginBottom: 4 },
  title: { fontSize: 34, lineHeight: 34 },
  emptyWrap: { flex: 1, minHeight: 300 },
  wcard: { borderRadius: 10 },
  wcardInner: { borderRadius: 10, borderWidth: StyleSheet.hairlineWidth, padding: 16, overflow: 'hidden' },
  rim: { position: 'absolute', left: 0, right: 0, top: 0, height: 1, borderTopWidth: 1 },
  wcardTop: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 14 },
  avatar: { width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 18 },
  wcardInfo: { flex: 1 },
  wcardNames: { fontSize: 18, lineHeight: 20, marginBottom: 2 },
  wcardVenue: { fontSize: 11 },
  activeBadge: { width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  wcardFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 12 },
  footerItem: { flexDirection: 'row', alignItems: 'center', gap: 5, flex: 1 },
  footerText: { fontSize: 11 },
  daysBadge: { alignItems: 'center', paddingHorizontal: 12, paddingVertical: 5, borderRadius: 6 },
  daysNum: { fontSize: 22, lineHeight: 22 },
  daysLabel: { fontSize: 7, letterSpacing: 1 },
});
