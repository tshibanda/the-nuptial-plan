import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Linking, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import { useAuth, useUser } from '@clerk/expo';
import { useListWeddings } from '@workspace/api-client-react';
import { useColors } from '@/hooks/useColors';
import { SANS, SANS_MEDIUM, SANS_SEMIBOLD, SERIF } from '@/constants/fonts';
import { PremiumBadge } from '@/components/PremiumBadge';
import { PremiumPageGate } from '@/components/PremiumPageGate';
import { useSubscription } from '@/lib/subscription';
import { getApiUrl } from '@/lib/apiUrl';

const DEMO_OWNER_ID = 'user_3HyOEsScTvQuzvLFDB5bbaGbDoq';
const DEMO_EMAIL = 'thenuptialplan@yopmail.com';
const SOCIALS_ACCESS_EMAIL = 'e.tshibanda78@gmail.com';
type PlatformName = 'instagram' | 'facebook' | 'tiktok';
type Social = { platform: PlatformName; handle: string; status: 'connected' | 'needs_reauth' | 'disconnected'; followers: number; reach: number; engagement: number; posts: number };
type Reservation = { id: string; client: string; email: string; date: string; venue: string; service: string; budget: number; status: 'new' | 'meeting' | 'booked'; link: string };
type Appointment = { id: string; title: string; date: string; time: string; venue: string; wedding?: string; reminder: boolean };

type RemoteSocialAccount = {
  platform: string;
  handle: string;
  status: string;
  statsCache: { followers?: number; reach?: number; engagement?: number; posts?: number; lastPost?: string } | null;
};

const socialDemo: Social[] = [
  { platform: 'instagram', handle: '@atelier.claire', status: 'connected', followers: 8420, reach: 28600, engagement: 7.8, posts: 18 },
  { platform: 'facebook', handle: 'Atelier Claire Wedding Planner', status: 'needs_reauth', followers: 3180, reach: 9400, engagement: 4.1, posts: 9 },
  { platform: 'tiktok', handle: '', status: 'disconnected', followers: 0, reach: 0, engagement: 0, posts: 0 },
];
const reservationDemo: Reservation[] = [
  { id: 'res-1', client: 'Élodie & Marc', email: 'elodie.marc@example.test', date: '2027-06-12', venue: 'Domaine des Lumières', service: 'Organisation complète', budget: 48000, status: 'new', link: 'https://thenuptialplan.app/r/atelier-elodie-marc' },
  { id: 'res-2', client: 'Nora & Yanis', email: 'nora.yanis@example.test', date: '2027-09-04', venue: 'Château de Vaux-le-Vicomte', service: 'Coordination Jour J', budget: 32000, status: 'meeting', link: 'https://thenuptialplan.app/r/atelier-nora-yanis' },
  { id: 'res-3', client: 'Agathe & Gaspard', email: 'agathe.gaspard@example.test', date: '2026-05-15', venue: 'La Ferme du Petit Moulin', service: 'Conception & décoration', budget: 27000, status: 'booked', link: 'https://thenuptialplan.app/r/atelier-agathe-gaspard' },
];
const appointmentDemo: Appointment[] = [
  { id: 'apt-1', title: "Point d'avancement Camille & Thomas", date: '2026-08-20', time: '10:00', venue: 'Visioconférence', wedding: 'Camille & Thomas', reminder: true },
  { id: 'apt-2', title: 'Visite technique du lieu', date: '2026-08-22', time: '14:30', venue: 'Château de Vaux-le-Vicomte', wedding: 'Inès & Julien', reminder: true },
  { id: 'apt-3', title: 'Rendez-vous découverte', date: '2026-08-21', time: '15:00', venue: 'Visioconférence', reminder: true },
];

const BASE_PLATFORMS: Social[] = [
  { platform: 'instagram', handle: '', status: 'disconnected', followers: 0, reach: 0, engagement: 0, posts: 0 },
  { platform: 'facebook', handle: '', status: 'disconnected', followers: 0, reach: 0, engagement: 0, posts: 0 },
  { platform: 'tiktok', handle: '', status: 'disconnected', followers: 0, reach: 0, engagement: 0, posts: 0 },
];

function mergeRemoteAccounts(remote: RemoteSocialAccount[]): Social[] {
  return BASE_PLATFORMS.map((b) => {
    const r = remote.find((a) => a.platform === b.platform);
    if (!r) return b;
    const s = r.statsCache ?? {};
    return {
      platform: b.platform,
      handle: r.handle,
      status: (r.status as Social['status']) ?? 'connected',
      followers: s.followers ?? 0,
      reach: s.reach ?? 0,
      engagement: s.engagement ?? 0,
      posts: s.posts ?? 0,
    };
  });
}

function useDemoStorage<T>(key: string, initial: T, enabled: boolean) {
  const [value, setValue] = useState(initial);
  useEffect(() => { if (enabled) void AsyncStorage.getItem(`tnp-studio-${key}`).then((saved) => { if (saved) setValue(JSON.parse(saved)); else void AsyncStorage.setItem(`tnp-studio-${key}`, JSON.stringify(initial)); }); }, [enabled, key]);
  const persist = (next: T) => { setValue(next); void AsyncStorage.setItem(`tnp-studio-${key}`, JSON.stringify(next)); };
  return [value, persist] as const;
}
function usePremiumDemo() { const { user } = useUser(); const { isActive } = useSubscription(); return { demo: user?.id === DEMO_OWNER_ID || user?.primaryEmailAddress?.emailAddress === DEMO_EMAIL, isPremium: isActive }; }
function Hero({ eyebrow, title, body, action }: { eyebrow: string; title: string; body: string; action?: React.ReactNode }) { const colors = useColors(); return <LinearGradient colors={[colors.plumDark, colors.plum, colors.plumLight]} style={styles.hero}><View style={styles.heroRow}><View style={{ flex: 1 }}><Text style={[styles.eyebrow, { color: colors.gold, fontFamily: SANS_MEDIUM }]}>{eyebrow}</Text><Text style={[styles.title, { color: '#fff', fontFamily: SERIF }]}>{title}</Text></View>{action}</View><Text style={[styles.body, { color: '#F7EAF4', fontFamily: SANS }]}>{body}</Text></LinearGradient>; }
function Card({ children }: { children: React.ReactNode }) { const colors = useColors(); return <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>{children}</View>; }
function Metric({ label, value, colors }: { label: string; value: string; colors: ReturnType<typeof useColors> }) { return <View style={[styles.metric, { backgroundColor: colors.card, borderLeftColor: colors.gold }]}><Text style={[styles.small, { color: colors.mutedForeground, fontFamily: SANS }]}>{label}</Text><Text style={[styles.metricValue, { color: colors.foreground, fontFamily: SERIF }]}>{value}</Text></View>; }

export function SocialsScreen() {
  const colors = useColors();
  const { demo, isPremium } = usePremiumDemo();
  const { user } = useUser();
  const canUseSocials = user?.primaryEmailAddress?.emailAddress?.trim().toLowerCase() === SOCIALS_ACCESS_EMAIL;
  const { getToken } = useAuth();
  const [demoItems] = useDemoStorage('socials', socialDemo, demo);
  const [liveItems, setLiveItems] = useState<Social[]>(BASE_PLATFORMS);
  const [selected, setSelected] = useState<PlatformName>('instagram');
  const [syncing, setSyncing] = useState(false);
  const [draft, setDraft] = useState('');

  const items = demo ? demoItems : liveItems;
  const account = items.find((item) => item.platform === selected)!;
  const request = useCallback(async (path: string, init?: RequestInit) => {
    const token = await getToken();
    const headers = new Headers(init?.headers);
    if (token) headers.set('Authorization', `Bearer ${token}`);
    return fetch(getApiUrl(path), { ...init, headers });
  }, [getToken]);

  const loadAccounts = useCallback(async () => {
    if (demo) return;
    try {
      const res = await request('social/accounts');
      if (res.ok) {
        const remote = await res.json() as RemoteSocialAccount[];
        setLiveItems(mergeRemoteAccounts(remote));
      }
    } catch { /* network unavailable */ }
  }, [demo, request]);

  useEffect(() => { void loadAccounts(); }, [loadAccounts]);

  const connect = async () => {
    if (demo) {
      Alert.alert(`Connecter ${selected}`, 'Disponible sur votre compte personnel.');
      return;
    }
    // Create a signed provider URL with the Clerk bearer token before opening
    // the external browser. The OAuth state, not a browser cookie, identifies
    // the returning planner.
    const start = await request('social/oauth/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ platform: selected }),
    });
    if (!start.ok) {
      const body = await start.json().catch(() => ({ error: 'Connexion indisponible' })) as { error?: string };
      Alert.alert('Connexion impossible', body.error ?? 'Connexion indisponible');
      return;
    }
    const { url: oauthUrl } = await start.json() as { url: string };
    const canOpen = await Linking.canOpenURL(oauthUrl);
    if (canOpen) {
      // Register before leaving the app: the server uses the app's mobile://
      // callback URL after a successful provider authorization.
      const sub = Linking.addEventListener('url', () => { void loadAccounts(); sub.remove(); });
      await Linking.openURL(oauthUrl);
    } else {
      Alert.alert("Impossible d'ouvrir le navigateur");
    }
  };

  const handleSync = async () => {
    setSyncing(true);
    try {
      await request(`social/accounts/${selected}/sync`, { method: 'POST' });
      await loadAccounts();
    } finally {
      setSyncing(false);
    }
  };

  const handleDisconnect = () => {
    Alert.alert(`Déconnecter ${selected}`, 'Voulez-vous retirer ce compte ?', [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Déconnecter', style: 'destructive', onPress: async () => {
          await request(`social/accounts/${selected}`, { method: 'DELETE' });
          await loadAccounts();
        },
      },
    ]);
  };

  if (!canUseSocials) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, backgroundColor: colors.background }}>
        <Feather name="lock" size={28} color={colors.mutedForeground} />
        <Text style={{ marginTop: 14, fontSize: 26, color: colors.foreground, fontFamily: SERIF }}>Mes réseaux</Text>
        <Text style={{ marginTop: 8, textAlign: 'center', fontSize: 12, color: colors.mutedForeground, fontFamily: SANS }}>
          Cette page est actuellement en développement.
        </Text>
      </View>
    );
  }
  if (!isPremium) return <PremiumPageGate featureLabel="votre espace Réseaux" />;

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.background }} contentContainerStyle={styles.content}>
      <Hero eyebrow="MON STUDIO" title="Mes réseaux" body="Analysez votre visibilité et préparez votre communication depuis un seul espace." />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pills}>
        {items.map((item) => (
          <TouchableOpacity key={item.platform} onPress={() => setSelected(item.platform)} style={[styles.pill, { borderColor: selected === item.platform ? colors.plum : colors.border, backgroundColor: selected === item.platform ? colors.plum + '12' : colors.card }]}>
            <Feather name={item.platform === 'instagram' ? 'instagram' : item.platform === 'facebook' ? 'facebook' : 'video'} size={15} color={colors.plum} />
            <Text style={[styles.small, { color: colors.foreground, fontFamily: SANS_SEMIBOLD }]}>{item.platform[0].toUpperCase() + item.platform.slice(1)}</Text>
            <View style={[styles.statusDot, { backgroundColor: item.status === 'connected' ? '#4B754D' : item.status === 'needs_reauth' ? '#9A7530' : colors.border }]} />
          </TouchableOpacity>
        ))}
      </ScrollView>
      <View style={styles.metrics}>
        <Metric label="Abonnés" value={account.followers.toLocaleString('fr-FR')} colors={colors} />
        <Metric label={selected === 'tiktok' ? 'Vues récentes' : 'Portée 28 jours'} value={account.reach.toLocaleString('fr-FR')} colors={colors} />
        <Metric label="Engagement" value={`${account.engagement.toFixed(1)} %`} colors={colors} />
        <Metric label={selected === 'tiktok' ? 'Vidéos récentes' : 'Posts 28 jours'} value={String(account.posts)} colors={colors} />
      </View>
      <Card>
        <View style={styles.sectionHeader}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.sectionTitle, { color: colors.foreground, fontFamily: SERIF }]}>{account.handle || 'Compte à connecter'}</Text>
            <Text style={[styles.small, { color: colors.mutedForeground, fontFamily: SANS }]}>
              {account.status === 'connected' ? 'Statistiques synchronisées' : account.status === 'needs_reauth' ? 'Autorisation à renouveler' : 'Aucun compte autorisé'}
            </Text>
          </View>
          {account.status !== 'connected' ? (
            <TouchableOpacity onPress={connect} style={[styles.button, { backgroundColor: colors.plum }]}>
              <Text style={[styles.buttonText, { fontFamily: SANS_SEMIBOLD }]}>{account.status === 'needs_reauth' ? 'Reconnecter' : 'Connecter'}</Text>
            </TouchableOpacity>
          ) : !demo ? (
            <View style={{ gap: 8 }}>
              <TouchableOpacity onPress={handleSync} disabled={syncing} style={[styles.button, { backgroundColor: colors.plum + '20', borderWidth: 1, borderColor: colors.plum }]}>
                <Text style={[styles.buttonText, { fontFamily: SANS_SEMIBOLD, color: colors.plum }]}>{syncing ? '…' : 'Sync'}</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleDisconnect} style={[styles.button, { backgroundColor: 'transparent', borderWidth: 1, borderColor: colors.border }]}>
                <Text style={[styles.buttonText, { fontFamily: SANS_SEMIBOLD, color: colors.mutedForeground }]}>Retirer</Text>
              </TouchableOpacity>
            </View>
          ) : null}
        </View>
        <TextInput value={draft} onChangeText={setDraft} placeholder="Préparer une publication…" placeholderTextColor={colors.mutedForeground} style={[styles.input, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.background }]} />
        <TouchableOpacity onPress={() => { if (draft.trim()) { Alert.alert('Publication planifiée', draft.trim()); setDraft(''); } }} style={[styles.buttonWide, { backgroundColor: colors.plum }]}>
          <Feather name="send" size={14} color="#fff" />
          <Text style={[styles.buttonText, { fontFamily: SANS_SEMIBOLD }]}>Ajouter au calendrier éditorial</Text>
        </TouchableOpacity>
      </Card>
    </ScrollView>
  );
}

export function ReservationsScreen() {
  const colors = useColors(); const { demo, isPremium } = usePremiumDemo(); const [items, persist] = useDemoStorage('reservations', reservationDemo, demo); const [adding, setAdding] = useState(false); const [client, setClient] = useState(''); const statuses = { new: 'Nouveau', meeting: 'RDV à venir', booked: 'Réservé' };
  if (!isPremium) return <PremiumPageGate featureLabel="votre espace Réservations" />;
 return <ScrollView style={{ flex: 1, backgroundColor: colors.background }} contentContainerStyle={styles.content}><Hero eyebrow="MON STUDIO" title="Mes réservations" body="Suivez les demandes de devis et partagez un lien clair avec chaque couple." action={<TouchableOpacity onPress={() => setAdding(!adding)} style={styles.heroAction}><Feather name={adding ? 'x' : 'plus'} size={15} color="#fff" /><Text style={[styles.heroActionText, { fontFamily: SANS_SEMIBOLD }]}>{adding ? 'Fermer' : 'Ajouter'}</Text></TouchableOpacity>} />{adding && <Card><TextInput value={client} onChangeText={setClient} placeholder="Nom du couple *" placeholderTextColor={colors.mutedForeground} style={[styles.input, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.background }]} /><TouchableOpacity onPress={() => { if (!client.trim()) return; const slug = client.toLowerCase().replace(/[^a-z0-9]+/g, '-'); persist([{ id: String(Date.now()), client: client.trim(), email: '', date: '', venue: '', service: 'Organisation complète', budget: 0, status: 'new', link: `https://thenuptialplan.app/r/${slug}` }, ...items]); setClient(''); setAdding(false); }} style={[styles.buttonWide, { backgroundColor: colors.plum }]}><Text style={[styles.buttonText, { fontFamily: SANS_SEMIBOLD }]}>Créer la demande</Text></TouchableOpacity></Card>}<View style={{ gap: 10 }}>{items.map((item) => <Card key={item.id}><View style={styles.sectionHeader}><View style={{ flex: 1 }}><Text style={[styles.sectionTitle, { color: colors.foreground, fontFamily: SERIF }]}>{item.client}</Text><Text style={[styles.small, { color: colors.mutedForeground, fontFamily: SANS }]}>{item.service} · {item.email || 'Email à renseigner'}</Text></View><TouchableOpacity onPress={() => persist(items.map((entry) => entry.id === item.id ? { ...entry, status: entry.status === 'new' ? 'meeting' : entry.status === 'meeting' ? 'booked' : 'new' } : entry))} style={[styles.status, { backgroundColor: colors.plum + '14' }]}><Text style={[styles.small, { color: colors.plum, fontFamily: SANS_SEMIBOLD }]}>{statuses[item.status]}</Text></TouchableOpacity></View><Text style={[styles.detail, { color: colors.mutedForeground, fontFamily: SANS }]}>{item.date || 'Date à préciser'} · {item.venue || 'Lieu à préciser'} · {item.budget ? `${item.budget.toLocaleString('fr-FR')} €` : 'Budget à préciser'}</Text><TouchableOpacity onPress={() => Alert.alert('Lien client', item.link)} style={styles.linkButton}><Feather name="link-2" size={13} color={colors.plum} /><Text style={[styles.small, { color: colors.plum, fontFamily: SANS_SEMIBOLD }]}>Partager le lien de suivi</Text></TouchableOpacity></Card>)}</View></ScrollView>;
}

export function AppointmentsScreen() {
  const colors = useColors(); const { demo, isPremium } = usePremiumDemo(); const { data: weddings = [] } = useListWeddings(); const [items, persist] = useDemoStorage('appointments', appointmentDemo, demo); if (!isPremium) return <PremiumPageGate featureLabel="votre espace Rendez-vous" />;
  const linked = weddings.slice(0, 4).map((wedding) => ({ id: `wedding-${wedding.id}`, title: `Point d'avancement ${wedding.names}`, date: wedding.weddingDate, time: '10:00', venue: wedding.venue, wedding: wedding.names, reminder: true })); const all = [...items, ...linked.filter((event) => !items.some((item) => item.id === event.id))].sort((a, b) => `${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`));
  return <ScrollView style={{ flex: 1, backgroundColor: colors.background }} contentContainerStyle={styles.content}><Hero eyebrow="MON STUDIO" title="Mes rendez-vous" body="Retrouvez les rendez-vous commerciaux et les échéances de tous vos dossiers au même endroit." /><View style={styles.metrics}><Metric label="Rendez-vous suivis" value={String(all.length)} colors={colors} /><Metric label="Rappels 24 h" value={String(all.filter((item) => item.reminder).length)} colors={colors} /></View><Card><View style={styles.sectionHeader}><Text style={[styles.sectionTitle, { color: colors.foreground, fontFamily: SERIF }]}>Prochaines échéances</Text><View style={[styles.status, { backgroundColor: '#E5F1E6' }]}><Text style={[styles.small, { color: '#4B754D', fontFamily: SANS_SEMIBOLD }]}>Synchronisé</Text></View></View>{all.map((item) => <View key={item.id} style={[styles.appointment, { borderBottomColor: colors.border }]}><View style={[styles.dateBadge, { backgroundColor: colors.plum + '12' }]}><Text style={[styles.small, { color: colors.plum, fontFamily: SANS_SEMIBOLD }]}>{item.date.slice(5)}</Text><Text style={[styles.time, { color: colors.foreground, fontFamily: SERIF }]}>{item.time}</Text></View><View style={{ flex: 1 }}><Text style={[styles.detailTitle, { color: colors.foreground, fontFamily: SANS_SEMIBOLD }]}>{item.title}</Text><Text style={[styles.small, { color: colors.mutedForeground, fontFamily: SANS }]}>{item.venue}{item.wedding ? ` · ${item.wedding}` : ''}</Text></View><TouchableOpacity onPress={() => persist(items.map((entry) => entry.id === item.id ? { ...entry, reminder: !entry.reminder } : entry))} style={[styles.reminder, { backgroundColor: item.reminder ? '#F7EEDB' : colors.background }]}><Feather name="clock" size={12} color={item.reminder ? '#9A7530' : colors.mutedForeground} /></TouchableOpacity></View>)}</Card></ScrollView>;
}

const styles = StyleSheet.create({ content: { paddingBottom: 150, gap: 14 }, hero: { padding: 24, paddingTop: Platform.OS === 'web' ? 86 : 30, paddingBottom: 28, borderBottomLeftRadius: 24, borderBottomRightRadius: 24 }, heroRow: { flexDirection: 'row', alignItems: 'center', gap: 12 }, heroAction: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 8, borderRadius: 9, backgroundColor: 'rgba(255,255,255,0.14)' }, heroActionText: { color: '#fff', fontSize: 10 }, eyebrow: { fontSize: 9, letterSpacing: 1.6, marginBottom: 7 }, title: { fontSize: 34, lineHeight: 39 }, body: { marginTop: 12, fontSize: 13, lineHeight: 20 }, pills: { gap: 9, paddingHorizontal: 16 }, pill: { flexDirection: 'row', alignItems: 'center', gap: 7, borderWidth: 1, borderRadius: 20, paddingHorizontal: 13, paddingVertical: 9 }, statusDot: { width: 7, height: 7, borderRadius: 4 }, metrics: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, paddingHorizontal: 16 }, metric: { width: '47%', minHeight: 80, borderLeftWidth: 3, borderRadius: 12, padding: 13 }, metricValue: { marginTop: 5, fontSize: 23 }, card: { marginHorizontal: 16, padding: 16, borderWidth: 1, borderRadius: 16 }, sectionHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 }, sectionTitle: { fontSize: 23 }, small: { fontSize: 11, lineHeight: 17 }, input: { minHeight: 44, borderWidth: 1, borderRadius: 9, paddingHorizontal: 12, fontSize: 12, marginTop: 13 }, button: { paddingHorizontal: 11, paddingVertical: 9, borderRadius: 8 }, buttonWide: { minHeight: 42, marginTop: 12, borderRadius: 9, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 7 }, buttonText: { color: '#fff', fontSize: 11 }, status: { paddingHorizontal: 8, paddingVertical: 6, borderRadius: 8 }, detail: { marginTop: 14, fontSize: 11, lineHeight: 18 }, linkButton: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 13 }, appointment: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 13, borderBottomWidth: StyleSheet.hairlineWidth }, dateBadge: { width: 59, borderRadius: 10, padding: 7, alignItems: 'center' }, time: { fontSize: 16, marginTop: 2 }, detailTitle: { fontSize: 12, marginBottom: 3 }, reminder: { width: 30, height: 30, borderRadius: 9, alignItems: 'center', justifyContent: 'center' } });
