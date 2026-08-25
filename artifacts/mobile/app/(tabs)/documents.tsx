import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, FlatList, Linking, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import { useAuth } from '@clerk/expo';
import { useListContracts, useListVendors, useListWeddings } from '@workspace/api-client-react';
import { useWedding } from '@/context/WeddingContext';
import { useColors } from '@/hooks/useColors';
import { SANS, SANS_MEDIUM, SANS_SEMIBOLD, SERIF } from '@/constants/fonts';
import { PremiumBadge } from '@/components/PremiumBadge';
import { PremiumPageGate } from '@/components/PremiumPageGate';
import { usePremiumGate } from '@/hooks/usePremiumGate';
import { useLocalization } from '@/context/LocalizationContext';

type WeddingDocument = {
  id: number;
  entityType: string;
  entityId: number | null;
  name: string;
  objectPath: string;
  contentType: string | null;
  size: number | null;
  createdAt: string;
};

const apiBase = () => {
  const domain = process.env.EXPO_PUBLIC_DOMAIN;
  return domain ? `https://${domain}` : '';
};

function formatSize(bytes: number | null, language: string) {
  if (!bytes) return '—';
  const units = language === 'fr' ? ['o', 'Ko', 'Mo'] : ['B', 'KB', 'MB'];
  if (bytes < 1024) return `${bytes} ${units[0]}`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} ${units[1]}`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} ${units[2]}`;
}

function formatDate(value: string, locale: string) {
  return new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(value));
}

function DocumentRow({ doc, onDelete, onOpen, colors, language, locale }: {
  doc: WeddingDocument;
  onDelete: () => void;
  onOpen: () => void;
  colors: ReturnType<typeof useColors>;
  language: 'fr' | 'en';
  locale: string;
}) {
  return (
    <View style={[styles.row, { borderBottomColor: colors.border }]}>
      <View style={[styles.fileIcon, { backgroundColor: colors.goldLight }]}>
        <Feather name="paperclip" size={14} color={colors.goldDim} />
      </View>
      <View style={styles.rowInfo}>
        <Text style={[styles.fileName, { color: colors.foreground, fontFamily: SANS_SEMIBOLD }]} numberOfLines={1}>{doc.name}</Text>
        <Text style={[styles.fileMeta, { color: colors.mutedForeground, fontFamily: SANS }]}>{formatDate(doc.createdAt, locale)} · {formatSize(doc.size, language)}</Text>
      </View>
      <TouchableOpacity onPress={onOpen} accessibilityLabel={`${language === 'fr' ? 'Ouvrir' : 'Open'} ${doc.name}`} style={styles.rowAction}>
        <Feather name="download" size={15} color={colors.mutedForeground} />
      </TouchableOpacity>
      <TouchableOpacity onPress={onDelete} accessibilityLabel={`${language === 'fr' ? 'Supprimer' : 'Delete'} ${doc.name}`} style={styles.rowAction}>
        <Feather name="trash-2" size={15} color={colors.mutedForeground} />
      </TouchableOpacity>
    </View>
  );
}

export default function DocumentsScreen() {
  const { language, locale } = useLocalization();
  const tr = useMemo(() => language === 'fr' ? {
    network: 'Erreur réseau', docs: 'Documents', loadError: 'Impossible de charger vos documents.',
    upload: 'Téléversement', uploadError: 'Impossible d’ajouter ce fichier.', deleteTitle: 'Supprimer le document ?',
    cancel: 'Annuler', delete: 'Supprimer', deleteError: 'Suppression impossible.', gate: 'votre coffre-fort de documents',
    select: 'Sélectionnez un mariage', eye: 'DOSSIER DU MARIAGE', title: 'Documents', vault: 'dans votre coffre-fort numérique.',
    sending: 'Envoi en cours…', add: 'Ajouter un fichier', general: 'Dossier général', vendors: 'Prestataires (divers)',
    contracts: 'Contrats (divers)', vendor: 'Prestataire', contract: 'Contrat', emptyTitle: 'Dossier vide', emptyBody: 'Ajoutez vos contrats, plans et fichiers importants.',
  } : {
    network: 'Network error', docs: 'Documents', loadError: 'Unable to load your documents.',
    upload: 'Upload', uploadError: 'Unable to add this file.', deleteTitle: 'Delete document?',
    cancel: 'Cancel', delete: 'Delete', deleteError: 'Unable to delete this document.', gate: 'your document vault',
    select: 'Select a wedding', eye: 'WEDDING FILE', title: 'Documents', vault: 'in your digital vault.',
    sending: 'Uploading…', add: 'Add a file', general: 'General folder', vendors: 'Vendors (miscellaneous)',
    contracts: 'Contracts (miscellaneous)', vendor: 'Vendor', contract: 'Contract', emptyTitle: 'Empty folder', emptyBody: 'Add your contracts, plans and important files.',
  }, [language]);
  const colors = useColors();
  const { isPremium } = usePremiumGate();
  const { getToken } = useAuth();
  const { selectedWeddingId } = useWedding();
  const { data: weddings = [] } = useListWeddings();
  const { data: vendors = [] } = useListVendors(selectedWeddingId ?? weddings[0]?.id ?? 0);
  const { data: contracts = [] } = useListContracts(selectedWeddingId ?? weddings[0]?.id ?? 0);
  const weddingId = selectedWeddingId ?? weddings[0]?.id ?? null;
  const [documents, setDocuments] = useState<WeddingDocument[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);

  const request = useCallback(async (path: string, init?: RequestInit) => {
    const token = await getToken();
    const headers = new Headers(init?.headers);
    if (token) headers.set('Authorization', `Bearer ${token}`);
    const response = await fetch(`${apiBase()}${path}`, { ...init, headers });
    if (!response.ok) throw new Error(tr.network);
    return response;
  }, [getToken, tr.network]);

  const loadDocuments = useCallback(async () => {
    if (!weddingId || !isPremium) return;
    setLoading(true);
    try {
      const response = await request(`/api/weddings/${weddingId}/documents`);
      setDocuments(await response.json() as WeddingDocument[]);
    } catch {
      Alert.alert(tr.docs, tr.loadError);
    } finally {
      setLoading(false);
    }
  }, [isPremium, request, weddingId, tr.docs, tr.loadError]);

  useEffect(() => { void loadDocuments(); }, [loadDocuments]);

  const grouped = useMemo(() => {
    const sections: Array<{ title: string; docs: WeddingDocument[] }> = [
      { title: tr.general, docs: documents.filter((doc) => doc.entityType === 'wedding') },
    ];
    vendors.forEach((vendor) => {
      const docs = documents.filter((doc) => doc.entityType === 'vendor' && doc.entityId === vendor.id);
      if (docs.length) sections.push({ title: `${tr.vendor} — ${vendor.name}`, docs });
    });
    const vendorOrphans = documents.filter((doc) => doc.entityType === 'vendor' && !vendors.some((vendor) => vendor.id === doc.entityId));
    if (vendorOrphans.length) sections.push({ title: tr.vendors, docs: vendorOrphans });
    contracts.forEach((contract) => {
      const docs = documents.filter((doc) => doc.entityType === 'contract' && doc.entityId === contract.id);
      if (docs.length) sections.push({ title: `${tr.contract} — ${contract.vendorName}`, docs });
    });
    const contractOrphans = documents.filter((doc) => doc.entityType === 'contract' && !contracts.some((contract) => contract.id === doc.entityId));
    if (contractOrphans.length) sections.push({ title: tr.contracts, docs: contractOrphans });
    return sections;
  }, [contracts, documents, vendors, tr]);

  const upload = async () => {
    if (!weddingId || uploading) return;
    const picked = await DocumentPicker.getDocumentAsync({ copyToCacheDirectory: true, multiple: false });
    if (picked.canceled || !picked.assets[0]) return;
    const file = picked.assets[0];
    setUploading(true);
    try {
      const metadataResponse = await request('/api/storage/uploads/request-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: file.name, size: file.size ?? 0, contentType: file.mimeType ?? 'application/octet-stream', weddingId }),
      });
      const metadata = await metadataResponse.json() as { uploadURL: string; objectPath: string };
      const fileResponse = await fetch(file.uri);
      const blob = await fileResponse.blob();
      const uploadResponse = await fetch(metadata.uploadURL, { method: 'PUT', body: blob, headers: { 'Content-Type': file.mimeType ?? 'application/octet-stream' } });
      if (!uploadResponse.ok) throw new Error('Upload failed');
      await request(`/api/weddings/${weddingId}/documents`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: file.name, objectPath: metadata.objectPath, contentType: file.mimeType, size: file.size, entityType: 'wedding' }),
      });
      await loadDocuments();
    } catch {
      Alert.alert(tr.upload, tr.uploadError);
    } finally {
      setUploading(false);
    }
  };

  const remove = (doc: WeddingDocument) => {
    if (!weddingId) return;
    Alert.alert(tr.deleteTitle, doc.name, [
      { text: tr.cancel, style: 'cancel' },
      { text: tr.delete, style: 'destructive', onPress: () => void request(`/api/weddings/${weddingId}/documents/${doc.id}`, { method: 'DELETE' }).then(loadDocuments).catch(() => Alert.alert(tr.docs, tr.deleteError)) },
    ]);
  };

  if (!isPremium) return <PremiumPageGate featureLabel={tr.gate} />;
  if (!weddingId) return <View style={[styles.emptyPage, { backgroundColor: colors.background }]}><Text style={[styles.emptyTitle, { color: colors.mutedForeground, fontFamily: SERIF }]}>{tr.select}</Text></View>;

  return (
    <FlatList
      data={grouped}
      keyExtractor={(section) => section.title}
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={styles.list}
      // iOS otherwise adjusts the list offset automatically when the tab
      // becomes active, which makes the Documents page appear to scroll on
      // its own.
      contentInsetAdjustmentBehavior="never"
      automaticallyAdjustContentInsets={false}
      scrollsToTop={false}
      refreshing={loading}
      onRefresh={() => void loadDocuments()}
      ListHeaderComponent={
        <>
          <LinearGradient colors={[colors.plumDark, colors.plum, colors.plumLight]} style={styles.hero}>
            <Text style={[styles.eyebrow, { color: colors.gold, fontFamily: SANS_MEDIUM }]}>{tr.eye}</Text>
            <View style={styles.titleRow}>
              <Text style={[styles.title, { color: '#FBF5FB', fontFamily: SERIF }]}>{tr.title}</Text>
              <PremiumBadge />
            </View>
            <Text style={[styles.heroBody, { color: '#F7EAF4', fontFamily: SANS }]}>{documents.length} {language === 'fr' ? `fichier${documents.length !== 1 ? 's' : ''}` : `file${documents.length !== 1 ? 's' : ''}`} {tr.vault}</Text>
          </LinearGradient>
          <TouchableOpacity onPress={() => void upload()} disabled={uploading} style={[styles.uploadButton, { backgroundColor: colors.gold }]}>
            <Feather name="upload" size={15} color="#3C1A3C" />
            <Text style={[styles.uploadText, { fontFamily: SANS_SEMIBOLD }]}>{uploading ? tr.sending : tr.add}</Text>
          </TouchableOpacity>
        </>
      }
      renderItem={({ item }) => (
        <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.sectionHeader}>
            <View style={[styles.sectionIcon, { backgroundColor: colors.plumBg }]}><Feather name="folder" size={15} color={colors.plum} /></View>
            <Text style={[styles.sectionTitle, { color: colors.foreground, fontFamily: SERIF }]}>{item.title}</Text>
            <Text style={[styles.count, { color: colors.mutedForeground, fontFamily: SANS }]}>{item.docs.length}</Text>
          </View>
          {item.docs.map((doc) => (
            <DocumentRow
              key={doc.id}
              doc={doc}
              colors={colors}
              language={language}
              locale={locale}
              onDelete={() => remove(doc)}
              onOpen={() => void Linking.openURL(`${apiBase()}/api/storage${doc.objectPath}`)}
            />
          ))}
        </View>
      )}
      ListEmptyComponent={<View style={styles.empty}><Feather name="folder" size={30} color={colors.goldDim} /><Text style={[styles.emptyTitle, { color: colors.mutedForeground, fontFamily: SERIF }]}>{tr.emptyTitle}</Text><Text style={[styles.emptyBody, { color: colors.mutedForeground, fontFamily: SANS }]}>{tr.emptyBody}</Text></View>}
    />
  );
}

const styles = StyleSheet.create({
  list: { paddingBottom: 160 },
  hero: { padding: 24, paddingTop: Platform.OS === 'web' ? 86 : 30, paddingBottom: 28, borderBottomLeftRadius: 26, borderBottomRightRadius: 26 },
  eyebrow: { fontSize: 10, letterSpacing: 1.8, marginBottom: 9 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  title: { fontSize: 40, lineHeight: 44 },
  heroBody: { marginTop: 13, fontSize: 13, lineHeight: 20 },
  uploadButton: { alignSelf: 'flex-end', flexDirection: 'row', alignItems: 'center', gap: 7, marginHorizontal: 18, marginTop: -20, paddingHorizontal: 14, minHeight: 40, borderRadius: 10 },
  uploadText: { color: '#3C1A3C', fontSize: 11 },
  section: { marginHorizontal: 16, marginTop: 18, borderWidth: 1, borderRadius: 16, overflow: 'hidden' },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 16 },
  sectionIcon: { width: 31, height: 31, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  sectionTitle: { flex: 1, fontSize: 22 },
  count: { fontSize: 11 },
  row: { minHeight: 61, flexDirection: 'row', alignItems: 'center', gap: 10, borderTopWidth: StyleSheet.hairlineWidth, paddingHorizontal: 14 },
  fileIcon: { width: 29, height: 29, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  rowInfo: { flex: 1 },
  fileName: { fontSize: 12 },
  fileMeta: { marginTop: 3, fontSize: 10 },
  rowAction: { padding: 8 },
  emptyPage: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  empty: { alignItems: 'center', padding: 42 },
  emptyTitle: { marginTop: 12, fontSize: 23 },
  emptyBody: { marginTop: 7, textAlign: 'center', fontSize: 12, lineHeight: 18 },
});