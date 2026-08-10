import { useState } from 'react';
import {
  FlatList, View, Text, StyleSheet, Modal, ScrollView,
  ActivityIndicator, Platform, TouchableOpacity, Alert,
} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import * as XLSX from 'xlsx';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { Feather } from '@expo/vector-icons';
import type { Guest } from '@workspace/api-client-react';
import {
  useListWeddings, useListGuests, useGetGuestStats,
  useImportGuests, getListGuestsQueryKey, getGetGuestStatsQueryKey,
} from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import { useWedding } from '@/context/WeddingContext';
import { useColors } from '@/hooks/useColors';
import { useTour } from '@/hooks/useTour';
import { SERIF, SANS, SANS_MEDIUM, SANS_SEMIBOLD } from '@/constants/fonts';
import { rsvpLabel } from '@/utils/format';
import { shadow, accentShadow } from '@/utils/shadow';
import { StatusBadge } from '@/components/StatusBadge';
import { EmptyState } from '@/components/EmptyState';
import { GuestDetailSheet } from '@/components/GuestDetailSheet';
import { TourSheet } from '@/components/TourSheet';

// ── Excel parsing ──────────────────────────────────────────────────────────────
type RsvpStatus = 'confirmed' | 'pending' | 'declined';
interface ParsedGuest {
  name: string;
  email?: string;
  tableNumber?: string;
  dietaryRequirements?: string;
  rsvpStatus: RsvpStatus;
  notes?: string;
}

const COL_MAP: Record<string, keyof ParsedGuest> = {
  nom: 'name', name: 'name', 'nom complet': 'name', prenom: 'name', prénom: 'name',
  email: 'email', 'e-mail': 'email', mail: 'email', courriel: 'email',
  table: 'tableNumber', 'numero de table': 'tableNumber', 'numéro de table': 'tableNumber', 'table number': 'tableNumber',
  regime: 'dietaryRequirements', 'regime alimentaire': 'dietaryRequirements', régime: 'dietaryRequirements', dietary: 'dietaryRequirements', restrictions: 'dietaryRequirements',
  rsvp: 'rsvpStatus', statut: 'rsvpStatus', status: 'rsvpStatus', 'statut rsvp': 'rsvpStatus',
  notes: 'notes', note: 'notes', commentaire: 'notes',
};

const RSVP_MAP: Record<string, RsvpStatus> = {
  confirme: 'confirmed', confirmed: 'confirmed', oui: 'confirmed', yes: 'confirmed',
  decline: 'declined', declined: 'declined', non: 'declined', no: 'declined',
  'en attente': 'pending', pending: 'pending', attente: 'pending',
};

function normalizeStr(s: string) {
  return s.toLowerCase().trim().normalize('NFD').replace(/\p{Diacritic}/gu, '').replace(/[_\-]/g, ' ');
}

function parseSheetRows(data: unknown[][]): { guests: ParsedGuest[]; skipped: number } {
  if (!data.length) return { guests: [], skipped: 0 };
  const headers = data[0].map((h) => normalizeStr(String(h ?? '')));
  const colIdx: Record<number, keyof ParsedGuest> = {};
  headers.forEach((h, i) => { const f = COL_MAP[h]; if (f) colIdx[i] = f; });

  const guests: ParsedGuest[] = [];
  let skipped = 0;
  for (let r = 1; r < data.length; r++) {
    const row = data[r] as unknown[];
    const obj: Partial<ParsedGuest> = {};
    Object.entries(colIdx).forEach(([i, field]) => {
      const val = String(row[Number(i)] ?? '').trim();
      if (val) (obj as Record<string, unknown>)[field] = val;
    });
    if (!obj.name) { skipped++; continue; }
    const rsvpRaw = normalizeStr(String(obj.rsvpStatus ?? ''));
    obj.rsvpStatus = RSVP_MAP[rsvpRaw] ?? 'pending';
    guests.push(obj as ParsedGuest);
  }
  return { guests, skipped };
}

// ── Tour & filter types ────────────────────────────────────────────────────────
const TOUR_STEPS = [
  { icon: 'users', title: 'Gestion des invités', description: 'Gérez la liste complète de vos invités et suivez les réponses RSVP en temps réel.' },
  { icon: 'bar-chart-2', title: 'Statistiques RSVP', description: 'Les chiffres en haut affichent le récapitulatif : total, confirmés, en attente et déclinés.' },
  { icon: 'filter', title: 'Filtrer par statut', description: 'Appuyez sur un filtre — Confirmés, En attente ou Déclinés — pour afficher uniquement les invités correspondants.' },
  { icon: 'upload', title: 'Importer depuis Excel', description: 'Appuyez sur l\'icône import dans le héro pour charger un fichier .xlsx ou .csv directement depuis votre téléphone.' },
];

type Filter = 'all' | 'confirmed' | 'pending' | 'declined';
const FILTERS: { key: Filter; label: string }[] = [
  { key: 'all', label: 'Tous' },
  { key: 'confirmed', label: 'Confirmés' },
  { key: 'pending', label: 'En attente' },
  { key: 'declined', label: 'Déclinés' },
];

const RSVP_LABEL: Record<string, string> = { confirmed: 'Confirmé', pending: 'En attente', declined: 'Décliné' };
const AVATAR_COLORS = ['#ebe2d4', '#dce4e5', '#e2dceb', '#dce8df', '#f0e2cb'];

// ── Screen ────────────────────────────────────────────────────────────────────
export default function InvitesScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { selectedWeddingId } = useWedding();
  const queryClient = useQueryClient();
  const topPad = Platform.OS === 'web' ? 67 : insets.top;
  const { tourVisible, openTour, closeTour } = useTour('tour:invites');
  const [filter, setFilter] = useState<Filter>('all');
  const [selectedGuest, setSelectedGuest] = useState<Guest | null>(null);

  // Import state
  const [importModalVisible, setImportModalVisible] = useState(false);
  const [importRows, setImportRows] = useState<ParsedGuest[]>([]);
  const [importSkipped, setImportSkipped] = useState(0);
  const [importing, setImporting] = useState(false);

  const { data: weddings } = useListWeddings();
  const activeWedding = weddings?.find((w) => w.id === selectedWeddingId) ?? weddings?.[0];
  const wId = activeWedding?.id ?? 0;
  const { data: guests, isLoading, refetch, isRefetching } = useListGuests(wId);
  const { data: stats } = useGetGuestStats(wId);
  const importGuestsMutation = useImportGuests();

  const filtered = (guests ?? []).filter((g) => filter === 'all' || g.rsvpStatus === filter);

  const handleGuestPress = (guest: Guest) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedGuest(guest);
  };

  const handlePickFile = async () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      const result = await DocumentPicker.getDocumentAsync({
        type: [
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'application/vnd.ms-excel',
          'text/csv',
          'text/comma-separated-values',
          '*/*',
        ],
        copyToCacheDirectory: true,
      });
      if (result.canceled || !result.assets?.[0]) return;

      const asset = result.assets[0];
      const base64 = await FileSystem.readAsStringAsync(asset.uri, { encoding: FileSystem.EncodingType.Base64 });
      const wb = XLSX.read(base64, { type: 'base64' });
      const ws = wb.Sheets[wb.SheetNames[0]!];
      const data = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, defval: '' });
      const { guests: parsed, skipped } = parseSheetRows(data);

      if (!parsed.length) {
        Alert.alert('Fichier vide', "Aucun invité trouvé. Vérifiez que votre fichier contient une colonne « Nom ».");
        return;
      }

      setImportRows(parsed);
      setImportSkipped(skipped);
      setImportModalVisible(true);
    } catch {
      Alert.alert('Erreur', 'Impossible de lire ce fichier. Vérifiez qu\'il s\'agit d\'un fichier Excel (.xlsx) ou CSV.');
    }
  };

  const handleImport = () => {
    if (!wId || !importRows.length) return;
    setImporting(true);
    importGuestsMutation.mutate(
      { weddingId: wId, data: { guests: importRows } },
      {
        onSuccess: (result) => {
          queryClient.invalidateQueries({ queryKey: getListGuestsQueryKey(wId) });
          queryClient.invalidateQueries({ queryKey: getGetGuestStatsQueryKey(wId) });
          setImportModalVisible(false);
          setImportRows([]);
          setImporting(false);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          Alert.alert(
            'Import réussi',
            `${result.created} invité${result.created > 1 ? 's' : ''} importé${result.created > 1 ? 's' : ''}${result.skipped > 0 ? `\n${result.skipped} ligne${result.skipped > 1 ? 's' : ''} ignorée${result.skipped > 1 ? 's' : ''} (nom manquant)` : ''}`,
          );
        },
        onError: () => {
          setImporting(false);
          Alert.alert('Erreur', "L'import a échoué. Veuillez réessayer.");
        },
      }
    );
  };

  return (
    <>
      <FlatList
        data={filtered}
        keyExtractor={(item) => String(item.id)}
        style={{ flex: 1, backgroundColor: colors.background }}
        contentContainerStyle={{ paddingBottom: 100, flexGrow: 1 }}
        refreshing={isRefetching}
        onRefresh={refetch}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View>
            {/* ── Hero gradient header ── */}
            <LinearGradient
              colors={[colors.plumDark, colors.plum, colors.plumLight]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[ss.hero, { paddingTop: topPad + 20 }]}
            >
              <View style={{ position: 'absolute', top: -20, right: -20, width: 100, height: 100, borderRadius: 50, backgroundColor: colors.rose + '22' }} pointerEvents="none" />
              <View style={{ position: 'absolute', bottom: 0, left: 20, width: 70, height: 70, borderRadius: 35, backgroundColor: colors.sage + '18' }} pointerEvents="none" />
              <LinearGradient colors={['rgba(255,255,255,0.08)', 'transparent']} style={ss.heroSheen} pointerEvents="none" />
              <View style={ss.goldBar} />

              <View style={ss.heroTop}>
                <View>
                  <Text style={[ss.eye, { fontFamily: SANS_MEDIUM, color: '#C8A96E' }]}>LA CÉLÉBRATION</Text>
                  <Text style={[ss.title, { fontFamily: SERIF, color: '#FBF5FB' }]}>Gestion des invités</Text>
                </View>
                {/* Import button */}
                <TouchableOpacity
                  onPress={handlePickFile}
                  activeOpacity={0.75}
                  style={ss.importBtn}
                  accessibilityLabel="Importer depuis Excel"
                >
                  <Feather name="upload" size={15} color="#C8A96E" />
                  <Text style={[ss.importBtnText, { fontFamily: SANS_SEMIBOLD }]}>Importer</Text>
                </TouchableOpacity>
              </View>
            </LinearGradient>

            <View style={{ paddingHorizontal: 16, paddingTop: 16 }}>
              {/* Stats bar */}
              {stats && (
                <View style={[ss.statsWrap, shadow('md')]}>
                  <View style={[ss.statsBar, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    <View style={[ss.rim, { borderTopColor: 'rgba(255,255,255,0.80)' }]} />
                    <StatBlock value={stats.total} label="Total" color={colors.foreground} colors={colors} />
                    <View style={[ss.statDivider, { backgroundColor: colors.border }]} />
                    <StatBlock value={stats.confirmed} label="Confirmés" color={colors.success} colors={colors} />
                    <View style={[ss.statDivider, { backgroundColor: colors.border }]} />
                    <StatBlock value={stats.pending} label="En attente" color={colors.warning} colors={colors} />
                    <View style={[ss.statDivider, { backgroundColor: colors.border }]} />
                    <StatBlock value={stats.declined} label="Déclinés" color={colors.mutedForeground} colors={colors} />
                  </View>
                </View>
              )}

              {/* Filter pills */}
              <View style={ss.filterRow}>
                {FILTERS.map((f) => {
                  const isActive = filter === f.key;
                  return (
                    <TouchableOpacity
                      key={f.key}
                      onPress={() => setFilter(f.key)}
                      activeOpacity={0.75}
                      style={[ss.filterPill, isActive ? accentShadow('sm') : shadow('xs'), { backgroundColor: isActive ? colors.plum : colors.muted, borderColor: isActive ? colors.plum : colors.border }]}
                    >
                      <Text style={[ss.filterText, { fontFamily: SANS_MEDIUM, color: isActive ? '#FBF5FB' : colors.mutedForeground }]}>{f.label}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          </View>
        }
        ListEmptyComponent={
          isLoading ? (
            <View style={ss.loading}><ActivityIndicator color={colors.accent} /></View>
          ) : (
            <View style={ss.emptyWrap}>
              <EmptyState icon="users" title="Aucun invité" subtitle="Appuyez sur « Importer » pour charger un fichier Excel, ou ajoutez des invités depuis l'application web." />
            </View>
          )
        }
        renderItem={({ item, index }) => {
          const { label, tone } = rsvpLabel(item.rsvpStatus);
          const av = item.name.split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2);
          return (
            <TouchableOpacity
              onPress={() => handleGuestPress(item)}
              activeOpacity={0.75}
              style={[ss.guestRow, shadow('sm'), { backgroundColor: colors.card, borderColor: colors.border, marginHorizontal: 16, marginBottom: 8 }]}
            >
              <View style={[ss.rim, { borderTopColor: 'rgba(255,255,255,0.65)' }]} />
              <View style={[ss.av, { backgroundColor: AVATAR_COLORS[index % AVATAR_COLORS.length] }, shadow('xs')]}>
                <Text style={[ss.avText, { fontFamily: SERIF, color: colors.plumDark }]}>{av}</Text>
              </View>
              <View style={ss.guestInfo}>
                <Text style={[ss.guestName, { fontFamily: SANS_SEMIBOLD, color: colors.foreground }]} numberOfLines={1}>{item.name}</Text>
                <Text style={[ss.guestMeta, { fontFamily: SANS, color: colors.mutedForeground }]}>
                  {[item.tableNumber ? `Table ${item.tableNumber}` : null, item.dietaryRequirements].filter(Boolean).join(' · ') || '—'}
                </Text>
              </View>
              <View style={ss.guestRight}>
                <StatusBadge label={label} tone={tone} />
                <View style={{ height: 4 }} />
                <Feather name="chevron-right" size={13} color={colors.goldDim} />
              </View>
            </TouchableOpacity>
          );
        }}
      />

      <GuestDetailSheet visible={selectedGuest !== null} onClose={() => setSelectedGuest(null)} guest={selectedGuest} />
      <TourSheet visible={tourVisible} onClose={closeTour} steps={TOUR_STEPS} />

      {/* ── Import preview modal ─────────────────────────────────────────────── */}
      <Modal
        visible={importModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setImportModalVisible(false)}
      >
        <View style={[ss.modalContainer, { backgroundColor: colors.background, paddingTop: insets.top + 16 }]}>
          {/* Modal header */}
          <View style={[ss.modalHeader, { borderBottomColor: colors.border }]}>
            <View>
              <Text style={[ss.modalTitle, { fontFamily: SERIF, color: colors.foreground }]}>Importer des invités</Text>
              <Text style={[ss.modalSub, { fontFamily: SANS, color: colors.mutedForeground }]}>
                {importRows.length} invité{importRows.length > 1 ? 's' : ''} détecté{importRows.length > 1 ? 's' : ''}
                {importSkipped > 0 ? ` · ${importSkipped} ignoré${importSkipped > 1 ? 's' : ''}` : ''}
              </Text>
            </View>
            <TouchableOpacity onPress={() => setImportModalVisible(false)} style={ss.modalClose} activeOpacity={0.7}>
              <Feather name="x" size={20} color={colors.mutedForeground} />
            </TouchableOpacity>
          </View>

          {/* Preview list */}
          <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, gap: 8 }}>
            {importRows.map((g, i) => (
              <View key={i} style={[ss.previewRow, shadow('xs'), { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={[ss.rim, { borderTopColor: 'rgba(255,255,255,0.65)' }]} />
                <View style={[ss.previewAv, { backgroundColor: AVATAR_COLORS[i % AVATAR_COLORS.length] }]}>
                  <Text style={[ss.avText, { fontFamily: SERIF, color: colors.plumDark, fontSize: 12 }]}>
                    {g.name.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2)}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[ss.guestName, { fontFamily: SANS_SEMIBOLD, color: colors.foreground }]} numberOfLines={1}>{g.name}</Text>
                  <Text style={[ss.guestMeta, { fontFamily: SANS, color: colors.mutedForeground }]} numberOfLines={1}>
                    {[g.email, g.tableNumber ? `Table ${g.tableNumber}` : null, g.dietaryRequirements].filter(Boolean).join(' · ') || '—'}
                  </Text>
                </View>
                <View style={[ss.rsvpPill, { backgroundColor: g.rsvpStatus === 'confirmed' ? colors.success + '22' : g.rsvpStatus === 'declined' ? '#e5534b22' : colors.warning + '22' }]}>
                  <Text style={[ss.rsvpPillText, { fontFamily: SANS_SEMIBOLD, color: g.rsvpStatus === 'confirmed' ? colors.success : g.rsvpStatus === 'declined' ? '#e5534b' : colors.warning }]}>
                    {RSVP_LABEL[g.rsvpStatus]}
                  </Text>
                </View>
              </View>
            ))}
          </ScrollView>

          {/* Confirm button */}
          <View style={[ss.modalFooter, { borderTopColor: colors.border, paddingBottom: Math.max(insets.bottom, 20) }]}>
            <TouchableOpacity
              onPress={handleImport}
              disabled={importing}
              activeOpacity={0.8}
              style={[ss.confirmBtn, { opacity: importing ? 0.6 : 1 }]}
            >
              <LinearGradient colors={[colors.plumDark, colors.plum]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={ss.confirmGrad}>
                {importing ? (
                  <ActivityIndicator color="#FBF5FB" size="small" />
                ) : (
                  <>
                    <Feather name="download" size={16} color="#FBF5FB" />
                    <Text style={[ss.confirmText, { fontFamily: SANS_SEMIBOLD }]}>
                      Importer {importRows.length} invité{importRows.length > 1 ? 's' : ''}
                    </Text>
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
}

function StatBlock({ value, label, color, colors }: { value: number; label: string; color: string; colors: ReturnType<typeof useColors> }) {
  return (
    <View style={ss.statBlock}>
      <Text style={[ss.statValue, { fontFamily: SERIF, color }]}>{value}</Text>
      <Text style={[ss.statLabel, { fontFamily: SANS_MEDIUM, color: colors.mutedForeground }]}>{label}</Text>
    </View>
  );
}

const ss = StyleSheet.create({
  hero: { paddingHorizontal: 20, paddingBottom: 22, overflow: 'hidden' },
  heroSheen: { ...StyleSheet.absoluteFillObject, height: 80 },
  goldBar: { position: 'absolute', top: 0, left: 0, right: 0, height: 1.5, backgroundColor: 'rgba(200,170,112,0.35)' },
  heroTop: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' },
  eye: { fontSize: 9, letterSpacing: 2, marginBottom: 4 },
  title: { fontSize: 34, lineHeight: 34 },
  importBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(255,255,255,0.12)', borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(200,170,112,0.40)', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8 },
  importBtnText: { fontSize: 11, color: '#C8A96E', letterSpacing: 0.3 },
  statsWrap: { borderRadius: 12, marginBottom: 14, overflow: 'hidden' },
  statsBar: { flexDirection: 'row', borderRadius: 12, borderWidth: StyleSheet.hairlineWidth, padding: 14, alignItems: 'center', overflow: 'hidden' },
  rim: { position: 'absolute', left: 0, right: 0, top: 0, height: 1, borderTopWidth: 1 },
  statBlock: { flex: 1, alignItems: 'center', gap: 2 },
  statDivider: { width: StyleSheet.hairlineWidth, height: 32 },
  statValue: { fontSize: 26, lineHeight: 26 },
  statLabel: { fontSize: 9, letterSpacing: 0.5 },
  filterRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap', marginBottom: 8 },
  filterPill: { borderRadius: 20, borderWidth: StyleSheet.hairlineWidth, paddingHorizontal: 14, paddingVertical: 7 },
  filterText: { fontSize: 11 },
  loading: { padding: 40, alignItems: 'center' },
  emptyWrap: { flex: 1, minHeight: 300 },
  guestRow: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 10, borderWidth: StyleSheet.hairlineWidth, padding: 12, overflow: 'hidden' },
  av: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  avText: { fontSize: 15 },
  guestInfo: { flex: 1 },
  guestName: { fontSize: 13, marginBottom: 2 },
  guestMeta: { fontSize: 10 },
  guestRight: { alignItems: 'center' },
  // Modal
  modalContainer: { flex: 1 },
  modalHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', paddingHorizontal: 20, paddingBottom: 16, borderBottomWidth: StyleSheet.hairlineWidth },
  modalTitle: { fontSize: 26, lineHeight: 26, marginBottom: 4 },
  modalSub: { fontSize: 11 },
  modalClose: { padding: 4 },
  previewRow: { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 10, borderWidth: StyleSheet.hairlineWidth, padding: 12, overflow: 'hidden' },
  previewAv: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  rsvpPill: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4 },
  rsvpPillText: { fontSize: 9, letterSpacing: 0.3 },
  modalFooter: { paddingHorizontal: 16, paddingTop: 12, borderTopWidth: StyleSheet.hairlineWidth },
  confirmBtn: { borderRadius: 14, overflow: 'hidden' },
  confirmGrad: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 16 },
  confirmText: { fontSize: 13, color: '#FBF5FB', letterSpacing: 0.3 },
});
