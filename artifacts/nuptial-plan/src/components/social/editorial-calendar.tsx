import { useEffect, useMemo, useState } from 'react';
import { CalendarDays, ChevronLeft, ChevronRight, Clock3, Edit3, Facebook, Instagram, Plus, Trash2, Video } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useLanguage } from '@/lib/i18n';

type Platform = 'facebook' | 'instagram' | 'tiktok';
type EditorialStatus = 'draft' | 'scheduled' | 'published' | 'cancelled';

type EditorialPost = {
  id: string;
  platform: Platform;
  title: string;
  content: string;
  scheduledDate: string;
  scheduledTime: string | null;
  status: EditorialStatus;
  publishedAt: string | null;
  notes: string;
};

type PostForm = Omit<EditorialPost, 'id' | 'publishedAt'>;

const platformNames: Record<Platform, string> = {
  facebook: 'Facebook',
  instagram: 'Instagram',
  tiktok: 'TikTok',
};

const statusNames: Record<EditorialStatus, string> = {
  draft: 'Brouillon',
  scheduled: 'Planifié',
  published: 'Publié',
  cancelled: 'Non publié / annulé',
};

const statusClasses: Record<EditorialStatus, string> = {
  draft: 'bg-[#F3EDF4] text-[#7E567E]',
  scheduled: 'bg-[#F7EEDB] text-[#966F28]',
  published: 'bg-[#E5F1E6] text-[#427146]',
  cancelled: 'bg-muted text-muted-foreground',
};

const DEMO_POSTS: EditorialPost[] = [
  {
    id: 'demo-editorial-1',
    platform: 'instagram',
    title: 'Les détails fleuris de Camille & Thomas',
    content: 'Carrousel inspiration : arches fleuries, papeterie et tables de réception.',
    scheduledDate: '2026-08-14',
    scheduledTime: '18:30',
    status: 'published',
    publishedAt: '2026-08-14T18:42:00.000Z',
    notes: 'Très bon taux de sauvegarde après 24 h.',
  },
  {
    id: 'demo-editorial-2',
    platform: 'facebook',
    title: 'Ouverture des rendez-vous automne',
    content: 'Annonce de créneaux de rendez-vous découverte pour les futurs mariés.',
    scheduledDate: '2026-08-19',
    scheduledTime: '09:00',
    status: 'published',
    publishedAt: '2026-08-19T09:07:00.000Z',
    notes: 'Relancer les messages privés vendredi.',
  },
  {
    id: 'demo-editorial-3',
    platform: 'tiktok',
    title: 'Avant / après : une table d’été',
    content: 'Montage court des préparatifs de la table et du résultat final.',
    scheduledDate: '2026-08-22',
    scheduledTime: '12:15',
    status: 'scheduled',
    publishedAt: null,
    notes: 'Vérifier la musique et les sous-titres avant publication.',
  },
  {
    id: 'demo-editorial-4',
    platform: 'instagram',
    title: 'Conseil mariage : le déroulé du Jour J',
    content: 'Reel avec trois conseils pour profiter pleinement de sa journée.',
    scheduledDate: '2026-08-27',
    scheduledTime: '18:00',
    status: 'draft',
    publishedAt: null,
    notes: '',
  },
  {
    id: 'demo-editorial-5',
    platform: 'facebook',
    title: 'Réception intimiste au domaine',
    content: 'Album photo du mariage de Louise et Adrien.',
    scheduledDate: '2026-08-29',
    scheduledTime: '10:00',
    status: 'cancelled',
    publishedAt: null,
    notes: 'Reporté : attendre les photos finales du photographe.',
  },
];

const inputClass = 'mt-1.5 w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none transition focus:border-primary';

function localDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function dateFromKey(key: string): Date {
  return new Date(`${key}T12:00:00`);
}

function emptyForm(scheduledDate: string): PostForm {
  return {
    platform: 'instagram',
    title: '',
    content: '',
    scheduledDate,
    scheduledTime: '',
    status: 'draft',
    notes: '',
  };
}

function PlatformIcon({ platform }: { platform: Platform }) {
  if (platform === 'instagram') return <Instagram size={13} />;
  if (platform === 'facebook') return <Facebook size={13} />;
  return <Video size={13} />;
}

export function EditorialCalendar({ isDemo }: { isDemo: boolean }) {
  const { toast } = useToast();
  const { language, locale } = useLanguage();
  const en = language === 'en';
  const copy = (fr: string, english: string) => en ? english : fr;
  const statusLabel = (status: EditorialStatus) => ({
    draft: copy('Brouillon', 'Draft'),
    scheduled: copy('Planifié', 'Scheduled'),
    published: copy('Publié', 'Published'),
    cancelled: copy('Non publié / annulé', 'Unpublished / cancelled'),
  })[status];
  const [month, setMonth] = useState(() => new Date());
  const [posts, setPosts] = useState<EditorialPost[]>([]);
  const [loading, setLoading] = useState(!isDemo);
  const [error, setError] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPost, setEditingPost] = useState<EditorialPost | null>(null);
  const [form, setForm] = useState<PostForm>(() => emptyForm(localDateKey(new Date())));
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isDemo) {
      try {
        const saved = localStorage.getItem('tnp-editorial-calendar');
        setPosts(saved ? JSON.parse(saved) as EditorialPost[] : DEMO_POSTS);
        if (!saved) localStorage.setItem('tnp-editorial-calendar', JSON.stringify(DEMO_POSTS));
      } catch {
        setPosts(DEMO_POSTS);
      }
      setLoading(false);
      return;
    }

    let mounted = true;
    setLoading(true);
    fetch('/api/editorial-posts', { credentials: 'include' })
      .then(async (response) => {
        if (!response.ok) throw new Error('Unable to load');
        return response.json() as Promise<EditorialPost[]>;
      })
      .then((data) => {
        if (mounted) {
          setPosts(data);
          setError('');
        }
      })
      .catch(() => {
        if (mounted) setError(copy('Le calendrier n’a pas pu être chargé. Réessayez dans un instant.', 'The calendar could not be loaded. Please try again in a moment.'));
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => { mounted = false; };
  }, [isDemo]);

  const postsByDate = useMemo(() => posts.reduce<Record<string, EditorialPost[]>>((acc, post) => {
    (acc[post.scheduledDate] ??= []).push(post);
    return acc;
  }, {}), [posts]);

  const days = useMemo(() => {
    const year = month.getFullYear();
    const monthIndex = month.getMonth();
    const first = new Date(year, monthIndex, 1);
    const leadingDays = (first.getDay() + 6) % 7;
    const dayCount = new Date(year, monthIndex + 1, 0).getDate();
    const total = Math.ceil((leadingDays + dayCount) / 7) * 7;
    return Array.from({ length: total }, (_, index) => {
      const offset = index - leadingDays + 1;
      const date = new Date(year, monthIndex, offset);
      return { date, inMonth: date.getMonth() === monthIndex };
    });
  }, [month]);

  const counters = useMemo(() => ({
    scheduled: posts.filter((post) => post.status === 'scheduled').length,
    published: posts.filter((post) => post.status === 'published').length,
    draft: posts.filter((post) => post.status === 'draft').length,
  }), [posts]);

  const persistDemo = (next: EditorialPost[]) => {
    setPosts(next);
    localStorage.setItem('tnp-editorial-calendar', JSON.stringify(next));
  };

  const openNewPost = (scheduledDate = localDateKey(new Date())) => {
    setEditingPost(null);
    setForm(emptyForm(scheduledDate));
    setDialogOpen(true);
  };

  const openPost = (post: EditorialPost) => {
    setEditingPost(post);
    setForm({
      platform: post.platform,
      title: post.title,
      content: post.content,
      scheduledDate: post.scheduledDate,
      scheduledTime: post.scheduledTime ?? '',
      status: post.status,
      notes: post.notes,
    });
    setDialogOpen(true);
  };

  const savePost = async () => {
    if (!form.title.trim()) {
      toast({ title: copy('Ajoutez un titre à ce post', 'Add a title to this post'), variant: 'destructive' });
      return;
    }
    setSaving(true);
    const payload = { ...form, title: form.title.trim(), scheduledTime: form.scheduledTime || null };
    try {
      if (isDemo) {
        const nextPost: EditorialPost = editingPost
          ? {
            ...editingPost,
            ...payload,
            publishedAt: payload.status === 'published'
              ? (editingPost.publishedAt ?? new Date().toISOString())
              : null,
          }
          : {
            ...payload,
            id: `demo-editorial-${Date.now()}`,
            publishedAt: payload.status === 'published' ? new Date().toISOString() : null,
          };
        persistDemo(editingPost ? posts.map((post) => post.id === nextPost.id ? nextPost : post) : [...posts, nextPost]);
      } else {
        const response = await fetch(editingPost ? `/api/editorial-posts/${editingPost.id}` : '/api/editorial-posts', {
          method: editingPost ? 'PATCH' : 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (!response.ok) throw new Error('Unable to save');
        const saved = await response.json() as EditorialPost;
        setPosts((current) => editingPost
          ? current.map((post) => post.id === saved.id ? saved : post)
          : [...current, saved]);
      }
      setDialogOpen(false);
      toast({ title: editingPost ? copy('Publication mise à jour', 'Post updated') : copy('Publication ajoutée au calendrier', 'Post added to calendar') });
    } catch {
      toast({ title: copy('Impossible d’enregistrer ce post', 'Unable to save this post'), description: copy('Vérifiez votre connexion puis réessayez.', 'Check your connection and try again.'), variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const changeStatus = async (post: EditorialPost, status: EditorialStatus) => {
    try {
      if (isDemo) {
        const updated = { ...post, status, publishedAt: status === 'published' ? (post.publishedAt ?? new Date().toISOString()) : null };
        persistDemo(posts.map((item) => item.id === post.id ? updated : item));
      } else {
        const response = await fetch(`/api/editorial-posts/${post.id}`, {
          method: 'PATCH',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status }),
        });
        if (!response.ok) throw new Error('Unable to update');
        const updated = await response.json() as EditorialPost;
        setPosts((current) => current.map((item) => item.id === updated.id ? updated : item));
      }
      toast({ title: `${copy('Statut', 'Status')}: ${statusLabel(status)}` });
    } catch {
      toast({ title: copy('Impossible de mettre à jour le statut', 'Unable to update the status'), variant: 'destructive' });
    }
  };

  const deletePost = async (post: EditorialPost) => {
    if (!window.confirm(copy(`Supprimer « ${post.title} » du calendrier ?`, `Remove “${post.title}” from the calendar?`))) return;
    try {
      if (isDemo) {
        persistDemo(posts.filter((item) => item.id !== post.id));
      } else {
        const response = await fetch(`/api/editorial-posts/${post.id}`, { method: 'DELETE', credentials: 'include' });
        if (!response.ok) throw new Error('Unable to delete');
        setPosts((current) => current.filter((item) => item.id !== post.id));
      }
      setDialogOpen(false);
      toast({ title: copy('Publication supprimée', 'Post deleted') });
    } catch {
      toast({ title: copy('Impossible de supprimer ce post', 'Unable to delete this post'), variant: 'destructive' });
    }
  };

  return (
    <section>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow mb-2 text-[#a8893e]">{copy('PLAN DE CONTENU', 'CONTENT PLAN')}</p>
          <h2 className="font-serif text-3xl text-foreground">{copy('Calendrier éditorial', 'Editorial calendar')}</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">{copy('Préparez vos contenus, gardez l’historique de vos publications et marquez simplement ce qui a réellement été publié.', 'Plan your content, keep a history of your posts, and easily mark what was actually published.')}</p>
        </div>
        <button onClick={() => openNewPost()} className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground">
          <Plus size={16} />{copy('Nouveau post', 'New post')}
        </button>
      </div>

      <div className="mb-6 grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-border/70 bg-card px-4 py-3"><p className="text-[11px] text-muted-foreground">{copy('À publier', 'To publish')}</p><p className="mt-1 font-serif text-2xl text-[#966F28]">{counters.scheduled}</p></div>
        <div className="rounded-2xl border border-border/70 bg-card px-4 py-3"><p className="text-[11px] text-muted-foreground">{copy('Déjà publiés', 'Already published')}</p><p className="mt-1 font-serif text-2xl text-[#427146]">{counters.published}</p></div>
        <div className="rounded-2xl border border-border/70 bg-card px-4 py-3"><p className="text-[11px] text-muted-foreground">{copy('À préparer', 'To prepare')}</p><p className="mt-1 font-serif text-2xl text-primary">{counters.draft}</p></div>
      </div>

      {loading ? (
        <div className="rounded-3xl border border-border bg-card p-8 text-sm text-muted-foreground">{copy('Chargement du calendrier…', 'Loading calendar…')}</div>
      ) : error ? (
        <div className="rounded-3xl border border-destructive/30 bg-card p-8 text-sm text-destructive">{error}</div>
      ) : (
        <div className="overflow-hidden rounded-3xl border border-border/70 bg-card shadow-[0_2px_16px_rgba(93,45,93,0.04)]">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/70 px-5 py-4">
            <div className="flex items-center gap-3">
              <CalendarDays size={18} className="text-primary" />
              <h3 className="font-serif text-2xl capitalize text-foreground">{month.toLocaleDateString(locale, { month: 'long', year: 'numeric' })}</h3>
            </div>
            <div className="flex items-center gap-2">
              <button aria-label={copy('Mois précédent', 'Previous month')} onClick={() => setMonth((current) => new Date(current.getFullYear(), current.getMonth() - 1, 1))} className="rounded-lg border border-border p-2 text-muted-foreground hover:border-primary/40"><ChevronLeft size={16} /></button>
              <button onClick={() => setMonth(new Date())} className="rounded-lg border border-border px-3 py-2 text-xs text-muted-foreground hover:border-primary/40">{copy('Aujourd’hui', 'Today')}</button>
              <button aria-label={copy('Mois suivant', 'Next month')} onClick={() => setMonth((current) => new Date(current.getFullYear(), current.getMonth() + 1, 1))} className="rounded-lg border border-border p-2 text-muted-foreground hover:border-primary/40"><ChevronRight size={16} /></button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <div className="min-w-[760px]">
              <div className="grid grid-cols-7 border-b border-border/70 bg-muted/25">
                {(en ? ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] : ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']).map((day) => <p key={day} className="px-3 py-2.5 text-center text-[10px] font-medium uppercase tracking-wide text-muted-foreground">{day}</p>)}
              </div>
              <div className="grid grid-cols-7">
                {days.map(({ date, inMonth }) => {
                  const key = localDateKey(date);
                  const isToday = key === localDateKey(new Date());
                  return (
                    <div key={key} className={`min-h-36 border-b border-r border-border/60 p-2 last:border-r-0 ${inMonth ? 'bg-card' : 'bg-muted/20'}`}>
                      <button onClick={() => openNewPost(key)} className={`flex h-7 w-7 items-center justify-center rounded-full text-xs transition ${isToday ? 'bg-primary font-medium text-primary-foreground' : inMonth ? 'text-foreground hover:bg-primary/10' : 'text-muted-foreground'}`}>{date.getDate()}</button>
                      <div className="mt-1 space-y-1">
                        {(postsByDate[key] ?? []).slice(0, 3).map((post) => (
                          <button key={post.id} onClick={() => openPost(post)} className={`block w-full rounded-md px-2 py-1 text-left text-[10px] leading-4 transition hover:brightness-95 ${statusClasses[post.status]}`}>
                            <span className="flex items-center gap-1"><PlatformIcon platform={post.platform} /><span className="truncate font-medium">{post.scheduledTime ? `${post.scheduledTime} · ` : ''}{post.title}</span></span>
                          </button>
                        ))}
                        {(postsByDate[key]?.length ?? 0) > 3 && <button onClick={() => openNewPost(key)} className="px-1 text-[10px] font-medium text-primary">+{postsByDate[key].length - 3} {copy('autres', 'more')}</button>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
          {!posts.length && <div className="border-t border-border/70 px-6 py-10 text-center"><CalendarDays className="mx-auto text-primary/60" size={26} /><p className="mt-3 font-medium text-foreground">{copy('Votre calendrier est prêt.', 'Your calendar is ready.')}</p><p className="mt-1 text-sm text-muted-foreground">{copy('Ajoutez votre premier post pour visualiser votre plan de contenu.', 'Add your first post to see your content plan.')}</p></div>}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="font-serif text-2xl">{editingPost ? copy('Suivre cette publication', 'Track this post') : copy('Préparer une publication', 'Prepare a post')}</DialogTitle>
            <DialogDescription>{copy('La publication reste manuelle : ce calendrier ne publie pas de contenu sur vos réseaux.', 'Publishing remains manual: this calendar does not publish content to your social networks.')}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 pt-2 sm:grid-cols-2">
            <label className="text-xs font-medium text-foreground">{copy('Plateforme', 'Platform')}
              <select value={form.platform} onChange={(event) => setForm({ ...form, platform: event.target.value as Platform })} className={inputClass}>
                {Object.entries(platformNames).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
            </label>
            <label className="text-xs font-medium text-foreground">{copy('Statut', 'Status')}
              <select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value as EditorialStatus })} className={inputClass}>
                {Object.entries(statusNames).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
            </label>
            <label className="text-xs font-medium text-foreground sm:col-span-2">{copy('Titre du post', 'Post title')} *
              <input value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} placeholder={copy('Ex. Inspirations fleuries pour un mariage d’été', 'E.g. Floral inspiration for a summer wedding')} className={inputClass} />
            </label>
            <label className="text-xs font-medium text-foreground">{copy('Date prévue', 'Scheduled date')}
              <input type="date" value={form.scheduledDate} onChange={(event) => setForm({ ...form, scheduledDate: event.target.value })} className={inputClass} />
            </label>
            <label className="text-xs font-medium text-foreground">{copy('Heure prévue', 'Scheduled time')}
              <input type="time" value={form.scheduledTime ?? ''} onChange={(event) => setForm({ ...form, scheduledTime: event.target.value })} className={inputClass} />
            </label>
            <label className="text-xs font-medium text-foreground sm:col-span-2">{copy('Contenu / légende', 'Content / caption')}
              <textarea value={form.content} onChange={(event) => setForm({ ...form, content: event.target.value })} placeholder={copy('Résumé, angle, légende ou déroulé de votre publication…', 'Summary, angle, caption, or outline for your post…')} className={`${inputClass} min-h-24 resize-y`} />
            </label>
            <label className="text-xs font-medium text-foreground sm:col-span-2">{copy('Notes de suivi', 'Tracking notes')}
              <textarea value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} placeholder={copy('À vérifier, résultats, retour client…', 'To check, results, client feedback…')} className={`${inputClass} min-h-20 resize-y`} />
            </label>
          </div>
          {editingPost && <div className="rounded-xl bg-muted/50 px-3 py-2.5 text-xs text-muted-foreground"><Clock3 size={13} className="mr-1.5 inline text-primary" />{editingPost.publishedAt ? `${copy('Publié le', 'Published on')} ${new Intl.DateTimeFormat(locale, { dateStyle: 'long', timeStyle: 'short' }).format(new Date(editingPost.publishedAt))}` : copy('Pas encore marqué comme publié.', 'Not yet marked as published.')}</div>}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
            <div>{editingPost && <button onClick={() => void deletePost(editingPost)} className="flex items-center gap-1.5 rounded-lg px-2 py-2 text-xs text-destructive hover:bg-destructive/10"><Trash2 size={14} />{copy('Supprimer', 'Delete')}</button>}</div>
            <div className="flex gap-2">
              {editingPost && editingPost.status !== 'published' && <button onClick={() => void changeStatus(editingPost, 'published')} className="rounded-lg border border-[#6A966E] px-3 py-2 text-xs font-medium text-[#427146] hover:bg-[#E5F1E6]">{copy('Marquer comme publié', 'Mark as published')}</button>}
              <button disabled={saving} onClick={() => void savePost()} className="flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-xs font-medium text-primary-foreground disabled:opacity-60"><Edit3 size={13} />{saving ? copy('Enregistrement…', 'Saving…') : copy('Enregistrer', 'Save')}</button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </section>
  );
}