import { useCallback, useEffect, useMemo, useState } from 'react';
import { useUser } from '@clerk/react';
import { useListWeddings } from '@workspace/api-client-react';
import { CalendarDays, Check, ChevronRight, Clock3, Copy, Facebook, Instagram, Link2, Plus, RefreshCw, Send, Share2, TrendingUp, Unlink, Video } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { PremiumPageGate, usePremiumStatus } from '@/components/premium-page-gate';
import { EditorialCalendar } from '@/components/social/editorial-calendar';

const DEMO_OWNER_ID = 'user_3HyOEsScTvQuzvLFDB5bbaGbDoq';
const DEMO_EMAIL = 'thenuptialplan@yopmail.com';
const STORAGE_PREFIX = 'tnp-studio-';
const platformNames = { facebook: 'Facebook', instagram: 'Instagram', tiktok: 'TikTok' } as const;
type Platform = keyof typeof platformNames;
type SocialStatus = 'connected' | 'needs_reauth' | 'disconnected';
type Social = { platform: Platform; handle: string; status: SocialStatus; followers: number; reach: number; engagement: number; posts: number; lastPost: string };
type ReservationStatus = 'new' | 'replied' | 'meeting' | 'booked' | 'declined';
type Reservation = { id: string; client: string; email: string; weddingDate: string; venue: string; service: string; budget: number; status: ReservationStatus; source: string; received: string; notes: string; link: string };
type Appointment = { id: string; title: string; date: string; time: string; venue: string; wedding?: string; type: string; reminder: boolean };

type RemoteSocialAccount = {
  platform: string;
  handle: string;
  status: string;
  statsCache: { followers?: number; reach?: number; engagement?: number; posts?: number; lastPost?: string } | null;
};

const demoSocials: Social[] = [
  { platform: 'instagram', handle: '@atelier.claire', status: 'connected', followers: 8420, reach: 28600, engagement: 7.8, posts: 18, lastPost: '2026-08-16' },
  { platform: 'facebook', handle: 'Atelier Claire Wedding Planner', status: 'needs_reauth', followers: 3180, reach: 9400, engagement: 4.1, posts: 9, lastPost: '2026-08-12' },
  { platform: 'tiktok', handle: '', status: 'disconnected', followers: 0, reach: 0, engagement: 0, posts: 0, lastPost: '' },
];
const disconnectedSocials: Social[] = [
  { platform: 'instagram', handle: '', status: 'disconnected', followers: 0, reach: 0, engagement: 0, posts: 0, lastPost: '' },
  { platform: 'facebook', handle: '', status: 'disconnected', followers: 0, reach: 0, engagement: 0, posts: 0, lastPost: '' },
  { platform: 'tiktok', handle: '', status: 'disconnected', followers: 0, reach: 0, engagement: 0, posts: 0, lastPost: '' },
];
const demoReservations: Reservation[] = [
  { id: 'res-1', client: 'Élodie & Marc', email: 'elodie.marc@example.test', weddingDate: '2027-06-12', venue: 'Domaine des Lumières', service: 'Organisation complète', budget: 48000, status: 'new', source: 'Instagram', received: '2026-08-18', notes: 'Souhaitent une ambiance jardin méditerranéen.', link: 'https://thenuptialplan.app/r/atelier-elodie-marc' },
  { id: 'res-2', client: 'Nora & Yanis', email: 'nora.yanis@example.test', weddingDate: '2027-09-04', venue: 'Château de Vaux-le-Vicomte', service: 'Coordination Jour J', budget: 32000, status: 'meeting', source: 'Recommandation', received: '2026-08-10', notes: 'Visio prévue vendredi à 15h.', link: 'https://thenuptialplan.app/r/atelier-nora-yanis' },
  { id: 'res-3', client: 'Agathe & Gaspard', email: 'agathe.gaspard@example.test', weddingDate: '2026-05-15', venue: 'La Ferme du Petit Moulin', service: 'Conception & décoration', budget: 27000, status: 'booked', source: 'Site web', received: '2026-07-24', notes: 'Dossier signé, à rattacher au mariage Louise & Adrien si besoin.', link: 'https://thenuptialplan.app/r/atelier-agathe-gaspard' },
];
const demoAppointments: Appointment[] = [
  { id: 'apt-1', title: "Point d'avancement Camille & Thomas", date: '2026-08-20', time: '10:00', venue: 'Visioconférence', wedding: 'Camille & Thomas', type: 'Suivi mariage', reminder: true },
  { id: 'apt-2', title: 'Visite technique du lieu', date: '2026-08-22', time: '14:30', venue: 'Château de Vaux-le-Vicomte', wedding: 'Inès & Julien', type: 'Échéance mariage', reminder: true },
  { id: 'apt-3', title: 'Rendez-vous découverte', date: '2026-08-21', time: '15:00', venue: 'Visioconférence', type: 'Demande de devis', reminder: true },
  { id: 'apt-4', title: 'Dégustation traiteur', date: '2026-08-28', time: '12:00', venue: 'Maison Lune', wedding: 'Inès & Julien', type: 'Échéance mariage', reminder: true },
];

function useStudioData<T>(key: string, demo: T, enabled: boolean) {
  const storageKey = STORAGE_PREFIX + key;
  const [value, setValue] = useState<T>(demo);
  useEffect(() => {
    if (!enabled) return;
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) setValue(JSON.parse(saved) as T);
      else localStorage.setItem(storageKey, JSON.stringify(demo));
    } catch { /* Keep the deterministic demo state when storage is unavailable. */ }
  }, [enabled, storageKey]);
  const persist = (next: T) => { setValue(next); localStorage.setItem(storageKey, JSON.stringify(next)); };
  return [value, persist] as const;
}

/** Merge remote social accounts into the local Social[] shape. */
function mergeRemoteAccounts(remote: RemoteSocialAccount[]): Social[] {
  return disconnectedSocials.map((b) => {
    const r = remote.find((a) => a.platform === b.platform);
    if (!r) return b;
    const s = r.statsCache ?? {};
    return {
      platform: b.platform,
      handle: r.handle,
      status: (r.status as SocialStatus) ?? 'connected',
      followers: s.followers ?? 0,
      reach: s.reach ?? 0,
      engagement: s.engagement ?? 0,
      posts: s.posts ?? 0,
      lastPost: s.lastPost ?? '',
    };
  });
}

/** Fetch connected social accounts from the API. */
async function fetchSocialAccounts(): Promise<RemoteSocialAccount[]> {
  const res = await fetch('/api/social/accounts', { credentials: 'include' });
  if (!res.ok) return [];
  return res.json() as Promise<RemoteSocialAccount[]>;
}

/** Trigger a stats sync for one platform. */
async function syncPlatformStats(platform: Platform): Promise<void> {
  await fetch(`/api/social/accounts/${platform}/sync`, { method: 'POST', credentials: 'include' });
}

/** Disconnect a platform. */
async function disconnectPlatform(platform: Platform): Promise<void> {
  await fetch(`/api/social/accounts/${platform}`, { method: 'DELETE', credentials: 'include' });
}

function Header({ eyebrow, title, description }: { eyebrow: string; title: string; description: string }) {
  return <div className="mb-8"><p className="eyebrow mb-2 text-[#a8893e]">{eyebrow}</p><h1 className="font-serif text-[38px] leading-none text-foreground">{title}</h1><p className="mt-3 max-w-2xl text-[13px] leading-6 text-muted-foreground">{description}</p></div>;
}
function ShellCard({ children, className = '' }: { children: React.ReactNode; className?: string }) { return <div className={`rounded-3xl border border-border/70 bg-card/80 p-6 shadow-[0_2px_16px_rgba(93,45,93,0.04)] ${className}`}>{children}</div>; }
function Metric({ label, value, detail, icon: Icon }: { label: string; value: string; detail: string; icon: React.ComponentType<{ size?: number; className?: string }> }) { return <ShellCard><Icon size={17} className="mb-4 text-primary" /><p className="text-[11px] text-muted-foreground">{label}</p><p className="mt-1 font-serif text-3xl text-foreground">{value}</p><p className="mt-1 text-[11px] text-muted-foreground">{detail}</p></ShellCard>; }
function SocialIcon({ platform }: { platform: Platform }) { return platform === 'instagram' ? <Instagram size={18} /> : platform === 'facebook' ? <Facebook size={18} /> : <Video size={18} />; }

export function SocialsPage() {
  const { user } = useUser();
  const { toast } = useToast();
  const { isPremium, loading: premiumLoading } = usePremiumStatus();
  const isDemo = user?.id === DEMO_OWNER_ID || user?.primaryEmailAddress?.emailAddress === DEMO_EMAIL;
  const [demoSocialsState] = useStudioData('socials', demoSocials, isDemo);
  const [selected, setSelected] = useState<Platform>('instagram');
  const [socials, setSocials] = useState<Social[]>(disconnectedSocials);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [activeTab, setActiveTab] = useState<'networks' | 'calendar'>('networks');

  const displaySocials = isDemo ? demoSocialsState : socials;
  const account = displaySocials.find((item) => item.platform === selected)
    ?? disconnectedSocials.find((item) => item.platform === selected)!;

  const loadAccounts = useCallback(async () => {
    if (isDemo) return;
    setLoading(true);
    try {
      const remote = await fetchSocialAccounts();
      setSocials(mergeRemoteAccounts(remote));
    } finally {
      setLoading(false);
    }
  }, [isDemo]);

  // Load accounts on mount and when returning from OAuth
  useEffect(() => {
    void loadAccounts();
    const params = new URLSearchParams(window.location.search);
    const connected = params.get('connected');
    const error = params.get('error');
    if (connected && Object.keys(platformNames).includes(connected)) {
      toast({ title: `${platformNames[connected as Platform]} connecté`, description: 'Vos statistiques réelles sont maintenant disponibles.' });
      // Clean up URL
      const url = new URL(window.location.href);
      url.searchParams.delete('connected');
      url.searchParams.delete('error');
      window.history.replaceState({}, '', url.toString());
    }
    if (error) {
      const errorMessages: Record<string, string> = {
        connection_failed: 'La connexion n’a pas pu être finalisée. Réessayez dans un instant.',
        invalid_callback: 'La réponse du réseau social est incomplète. Relancez la connexion.',
        invalid_state: 'La session de connexion a expiré. Relancez la connexion.',
      };
      toast({
        title: 'Connexion échouée',
        description: errorMessages[error] ?? 'La connexion n’a pas pu être finalisée. Réessayez dans un instant.',
        variant: 'destructive',
      });
      const url = new URL(window.location.href);
      url.searchParams.delete('error');
      window.history.replaceState({}, '', url.toString());
    }
  }, [loadAccounts, toast]);

  const connect = () => {
    if (isDemo) {
      toast({ title: `Connexion ${platformNames[selected]}`, description: 'Disponible sur votre compte personnel.' });
      return;
    }
    // Full-page redirect to the server OAuth start — the server redirects to the provider.
    window.location.href = `/api/social/oauth/start?platform=${selected}`;
  };

  const handleSync = async () => {
    setSyncing(true);
    try {
      await syncPlatformStats(selected);
      await loadAccounts();
      toast({ title: 'Statistiques mises à jour' });
    } catch {
      toast({ title: 'Erreur de synchronisation', variant: 'destructive' });
    } finally {
      setSyncing(false);
    }
  };

  const handleDisconnect = async () => {
    await disconnectPlatform(selected);
    await loadAccounts();
    toast({ title: `${platformNames[selected]} déconnecté` });
  };

  if (!premiumLoading && !isPremium) return <PremiumPageGate featureLabel="votre espace Réseaux" />;
  return <><Header eyebrow="MON STUDIO" title="Mes réseaux" description="Pilotez la visibilité de votre agence, suivez vos contenus et préparez vos prochaines prises de parole." />
    <div className="mb-6 inline-flex rounded-xl border border-border bg-card p-1">
      <button onClick={() => setActiveTab('networks')} className={`rounded-lg px-3 py-2 text-xs font-medium transition ${activeTab === 'networks' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}>Mes comptes</button>
      <button onClick={() => setActiveTab('calendar')} className={`rounded-lg px-3 py-2 text-xs font-medium transition ${activeTab === 'calendar' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}>Calendrier éditorial</button>
    </div>
    {activeTab === 'calendar' ? <EditorialCalendar isDemo={isDemo} /> : <>{loading && <p className="mb-4 text-xs text-muted-foreground">Chargement des comptes…</p>}
    <div className="mb-6 grid gap-4 md:grid-cols-3">{displaySocials.map((item) => <button key={item.platform} onClick={() => setSelected(item.platform)} className={`rounded-2xl border p-4 text-left transition ${selected === item.platform ? 'border-primary bg-primary/5' : 'border-border bg-card hover:border-primary/40'}`}><div className="flex items-center justify-between"><span className="flex items-center gap-2 font-medium text-foreground"><SocialIcon platform={item.platform} />{platformNames[item.platform]}</span><span className={`rounded-full px-2 py-1 text-[10px] ${item.status === 'connected' ? 'bg-[#E5F1E6] text-[#4B754D]' : item.status === 'needs_reauth' ? 'bg-[#F7EEDB] text-[#9A7530]' : 'bg-muted text-muted-foreground'}`}>{item.status === 'connected' ? 'Connecté' : item.status === 'needs_reauth' ? 'À reconnecter' : 'Non connecté'}</span></div><p className="mt-4 text-sm text-muted-foreground">{item.handle || 'Connectez un compte professionnel'}</p></button>)}</div>
     <div className="grid gap-4 md:grid-cols-4"><Metric label="Abonnés" value={account.followers.toLocaleString('fr-FR')} detail={account.handle || 'Compte à connecter'} icon={Share2} /><Metric label={selected === 'tiktok' ? 'Vues des vidéos récentes' : 'Portée sur 28 jours'} value={account.reach.toLocaleString('fr-FR')} detail="Données fournies par la plateforme" icon={TrendingUp} /><Metric label="Engagement" value={`${account.engagement.toFixed(1).replace('.', ',')} %`} detail="Interactions / portée" icon={Check} /><Metric label={selected === 'tiktok' ? 'Vidéos récentes' : 'Posts publiés'} value={String(account.posts)} detail="Sur les 28 derniers jours" icon={Send} /></div>
    <div className="mt-6 grid gap-6 lg:grid-cols-[1.35fr_0.65fr]"><ShellCard><div className="flex items-start justify-between gap-4"><div><p className="eyebrow text-[10px] text-[#a8893e]">ANALYSE</p><h2 className="mt-1 font-serif text-2xl text-foreground">{platformNames[selected]} · performance récente</h2></div><div className="flex gap-2">{account.status === 'connected' && !isDemo && (<><button onClick={handleSync} disabled={syncing} className="flex items-center gap-1 rounded-lg border border-border px-3 py-2 text-xs text-muted-foreground hover:border-primary/40 disabled:opacity-50"><RefreshCw size={13} className={syncing ? 'animate-spin' : ''} />Sync</button><button onClick={handleDisconnect} className="flex items-center gap-1 rounded-lg border border-border px-3 py-2 text-xs text-muted-foreground hover:border-destructive/40"><Unlink size={13} />Déconnecter</button></>)}{account.status !== 'connected' && <button onClick={connect} className="rounded-lg bg-primary px-3 py-2 text-xs font-medium text-primary-foreground">{account.status === 'needs_reauth' ? 'Reconnecter' : 'Connecter le compte'}</button>}</div></div>{account.status === 'connected' ? <div className="mt-6 space-y-4"><div className="flex items-center justify-between border-b border-border/50 pb-3 text-sm"><span className="text-muted-foreground">Compte</span><span className="font-medium text-foreground">{account.handle}</span></div>{account.lastPost && <div className="flex items-center justify-between border-b border-border/50 pb-3 text-sm"><span className="text-muted-foreground">Dernier contenu</span><span className="font-medium text-foreground">{account.lastPost}</span></div>}<div className="flex items-center justify-between text-sm"><span className="text-muted-foreground">Portée 30 j</span><span className="font-medium text-foreground">{account.reach.toLocaleString('fr-FR')}</span></div></div> : <p className="mt-8 rounded-2xl bg-muted/50 p-5 text-sm leading-6 text-muted-foreground">Connectez votre compte {platformNames[selected]} professionnel pour lire les statistiques et autoriser la publication depuis The Nuptial Plan.</p>}</ShellCard>
      <ShellCard><p className="eyebrow text-[10px] text-[#a8893e]">PLANIFIER</p><h2 className="mt-1 font-serif text-2xl text-foreground">Prochaine publication</h2><p className="mt-5 min-h-28 rounded-xl border border-dashed border-border bg-muted/30 p-4 text-sm leading-6 text-muted-foreground">Préparez vos contenus, leurs horaires et leur statut dans le calendrier éditorial. Vous conservez ainsi l’historique réel de chaque publication.</p><button onClick={() => setActiveTab('calendar')} className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-3 py-2.5 text-xs font-medium text-primary-foreground"><Plus size={14} />Ouvrir le calendrier éditorial</button><p className="mt-4 text-[11px] leading-5 text-muted-foreground">La publication vers Facebook, Instagram et TikTok reste manuelle.</p></ShellCard></div></>}
  </>;
}

const statuses: Record<ReservationStatus, string> = { new: 'Nouveau', replied: 'Répondu', meeting: 'RDV à venir', booked: 'Réservé', declined: 'Refusé' };
export function ReservationsPage() {
  const { user } = useUser(); const { toast } = useToast(); const demo = user?.id === DEMO_OWNER_ID || user?.primaryEmailAddress?.emailAddress === DEMO_EMAIL;
  const { isPremium, loading: premiumLoading } = usePremiumStatus();
  const [items, persist] = useStudioData('reservations', demoReservations, demo); const [filter, setFilter] = useState<ReservationStatus | 'all'>('all'); const [adding, setAdding] = useState(false); const [form, setForm] = useState({ client: '', email: '', weddingDate: '', venue: '', service: 'Organisation complète', budget: '' });
  const filtered = filter === 'all' ? items : items.filter((item) => item.status === filter);
  const add = () => { if (!form.client.trim() || !form.email.trim()) return; const slug = form.client.toLowerCase().replace(/[^a-z0-9]+/g, '-'); persist([{ id: `res-${Date.now()}`, client: form.client.trim(), email: form.email.trim(), weddingDate: form.weddingDate, venue: form.venue, service: form.service, budget: Number(form.budget) || 0, status: 'new', source: 'Ajout manuel', received: new Date().toISOString().slice(0, 10), notes: '', link: `https://thenuptialplan.app/r/${slug}` }, ...items]); setForm({ client: '', email: '', weddingDate: '', venue: '', service: 'Organisation complète', budget: '' }); setAdding(false); };
  const copyLink = (link: string) => { void navigator.clipboard?.writeText(link); toast({ title: 'Lien client copié', description: "Vous pouvez l'envoyer au couple." }); };
  if (!premiumLoading && !isPremium) return <PremiumPageGate featureLabel="votre espace Réservations" />;
  return <><Header eyebrow="MON STUDIO" title="Mes réservations" description="Centralisez les demandes de devis, gardez le fil des échanges et partagez un lien de suivi avec vos futurs clients." /><div className="mb-6 flex flex-wrap items-center justify-between gap-3"><div className="flex flex-wrap gap-2">{(['all', 'new', 'meeting', 'booked'] as const).map((value) => <button key={value} onClick={() => setFilter(value)} className={`rounded-full px-3 py-1.5 text-xs ${filter === value ? 'bg-primary text-primary-foreground' : 'border border-border text-muted-foreground'}`}>{value === 'all' ? 'Toutes' : statuses[value]}</button>)}</div><button onClick={() => setAdding(!adding)} className="flex items-center gap-2 rounded-lg bg-primary px-3 py-2 text-xs font-medium text-primary-foreground"><Plus size={14} />Nouvelle demande</button></div>{adding && <ShellCard className="mb-6"><div className="grid gap-3 md:grid-cols-3">{(['client', 'email', 'weddingDate', 'venue', 'budget'] as const).map((key) => <input key={key} value={form[key]} onChange={(event) => setForm({ ...form, [key]: event.target.value })} placeholder={{ client: 'Nom du couple *', email: 'Email *', weddingDate: 'Date du mariage', venue: 'Lieu', budget: 'Budget €' }[key]} className="rounded-lg border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary" />)}<select value={form.service} onChange={(event) => setForm({ ...form, service: event.target.value })} className="rounded-lg border border-border bg-background px-3 py-2.5 text-sm"><option>Organisation complète</option><option>Coordination Jour J</option><option>Conception & décoration</option></select></div><button onClick={add} className="mt-4 rounded-lg bg-primary px-4 py-2 text-xs font-medium text-primary-foreground">Enregistrer la demande</button></ShellCard>}<div className="space-y-3">{filtered.map((item) => <ShellCard key={item.id} className="p-5"><div className="flex flex-wrap items-start justify-between gap-4"><div><div className="flex items-center gap-3"><h2 className="font-serif text-xl text-foreground">{item.client}</h2><span className="rounded-full bg-[#F5EFF5] px-2 py-1 text-[10px] text-primary">{statuses[item.status]}</span></div><p className="mt-1 text-xs text-muted-foreground">{item.service} · {item.source} · reçue le {item.received}</p></div><select value={item.status} onChange={(event) => persist(items.map((entry) => entry.id === item.id ? { ...entry, status: event.target.value as ReservationStatus } : entry))} className="rounded-lg border border-border bg-background px-2 py-1.5 text-xs"><option value="new">Nouveau</option><option value="replied">Répondu</option><option value="meeting">RDV à venir</option><option value="booked">Réservé</option><option value="declined">Refusé</option></select></div><div className="mt-5 grid gap-3 text-sm md:grid-cols-3"><div><span className="block text-[10px] uppercase tracking-wide text-muted-foreground">Mariage</span>{item.weddingDate || 'À préciser'} · {item.venue || 'Lieu à préciser'}</div><div><span className="block text-[10px] uppercase tracking-wide text-muted-foreground">Budget annoncé</span>{item.budget ? `${item.budget.toLocaleString('fr-FR')} €` : 'À préciser'}</div><div><span className="block text-[10px] uppercase tracking-wide text-muted-foreground">Contact</span>{item.email}</div></div><p className="mt-4 rounded-xl bg-muted/40 p-3 text-xs leading-5 text-muted-foreground">{item.notes || 'Aucune note de suivi.'}</p><button onClick={() => copyLink(item.link)} className="mt-4 flex items-center gap-2 text-xs font-medium text-primary"><Copy size={13} />Copier le lien client <ChevronRight size={13} /></button></ShellCard>)}</div></>;
}

export function AppointmentsPage() {
  const { user } = useUser(); const { data: weddings = [] } = useListWeddings(); const demo = user?.id === DEMO_OWNER_ID || user?.primaryEmailAddress?.emailAddress === DEMO_EMAIL; const [items, persist] = useStudioData('appointments', demoAppointments, demo);
  const { isPremium, loading: premiumLoading } = usePremiumStatus();
  const weddingEvents = useMemo(() => weddings.slice(0, 4).map((wedding, index) => ({ id: `wedding-${wedding.id}`, title: `Point d'avancement ${wedding.names}`, date: wedding.weddingDate, time: '10:00', venue: wedding.venue, wedding: wedding.names, type: 'Échéance mariage', reminder: true })), [weddings]);
  const all = [...items, ...weddingEvents.filter((event) => !items.some((item) => item.id === event.id))].sort((a, b) => `${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`));
  const toggleReminder = (id: string) => persist(items.map((item) => item.id === id ? { ...item, reminder: !item.reminder } : item));
  if (!premiumLoading && !isPremium) return <PremiumPageGate featureLabel="votre espace Rendez-vous" />;
  return <><Header eyebrow="MON STUDIO" title="Mes rendez-vous" description="Un agenda global pour vos rendez-vous commerciaux, vos échéances de production et les dates importantes de tous vos mariages." /><div className="mb-6 grid gap-4 md:grid-cols-3"><Metric label="Cette semaine" value={String(all.filter((item) => item.date >= new Date().toISOString().slice(0, 10)).length)} detail="Rendez-vous planifiés" icon={CalendarDays} /><Metric label="Rappels actifs" value={String(all.filter((item) => item.reminder).length)} detail="Notification 24 h avant" icon={Clock3} /><Metric label="Dossiers reliés" value={String(new Set(all.map((item) => item.wedding).filter(Boolean)).size)} detail="Mariages synchronisés" icon={Link2} /></div><ShellCard><div className="mb-5 flex items-center justify-between"><div><p className="eyebrow text-[10px] text-[#a8893e]">AGENDA GLOBAL</p><h2 className="mt-1 font-serif text-2xl text-foreground">Vos prochaines échéances</h2></div><span className="rounded-full bg-[#E5F1E6] px-3 py-1.5 text-[10px] text-[#4B754D]">Synchronisation active</span></div><div className="space-y-2">{all.map((item) => <div key={item.id} className="flex flex-wrap items-center gap-4 rounded-2xl border border-border/60 p-4"><div className="min-w-20 text-center"><p className="text-[10px] uppercase text-muted-foreground">{new Date(`${item.date}T12:00:00`).toLocaleDateString('fr-FR', { weekday: 'short' })}</p><p className="font-serif text-2xl text-primary">{new Date(`${item.date}T12:00:00`).getDate()}</p><p className="text-[10px] text-muted-foreground">{new Date(`${item.date}T12:00:00`).toLocaleDateString('fr-FR', { month: 'short' })}</p></div><div className="flex-1"><p className="font-medium text-foreground">{item.title}</p><p className="mt-1 text-xs text-muted-foreground">{item.time} · {item.venue} · {item.type}</p>{item.wedding && <p className="mt-1 text-xs text-primary">{item.wedding}</p>}</div><button onClick={() => toggleReminder(item.id)} className={`flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-[10px] ${item.reminder ? 'bg-[#F7EEDB] text-[#9A7530]' : 'border border-border text-muted-foreground'}`}><Clock3 size={12} />{item.reminder ? 'Rappel 24 h' : 'Activer rappel'}</button></div>)}</div></ShellCard></>;
}
