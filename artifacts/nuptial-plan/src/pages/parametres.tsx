import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { LegalFooter } from '@/components/legal-footer';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { PageTour, STORAGE_PREFIX } from '@/components/ui/page-tour';
import {
  User,
  Building2,
  CalendarDays,
  Wallet,
  Users,
  MapPin,
  StickyNote,
  Save,
  Trash2,
  AlertTriangle,
  Globe,
  Sparkles,
  UserCircle2,
  FileText,
  CreditCard,
  FolderOpen,
  PlayCircle,
  RotateCcw,
  BookOpen,
} from 'lucide-react';
import { useUser } from '@clerk/react';
import { useActiveWedding } from '@/lib/wedding-context';
import {
  useGetWedding,
  useUpdateWedding,
  useDeleteWedding,
  useListWeddings,
  getListWeddingsQueryKey,
  getGetWeddingQueryKey,
} from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';

/* ── Constants ── */
const TOUR_PAGES = [
  { key: 'dashboard',     label: 'Aperçu',       route: '/',             icon: Sparkles    },
  { key: 'calendrier',    label: 'Calendrier',   route: '/calendrier',   icon: CalendarDays },
  { key: 'prestataires',  label: 'Prestataires', route: '/prestataires', icon: Users       },
  { key: 'invites',       label: 'Invités',      route: '/invites',      icon: UserCircle2 },
  { key: 'budget',        label: 'Budget',       route: '/budget',       icon: Wallet      },
  { key: 'contrats',      label: 'Contrats',     route: '/contrats',     icon: FileText    },
  { key: 'paiements',     label: 'Paiements',    route: '/paiements',    icon: CreditCard  },
  { key: 'documents',     label: 'Documents',    route: '/documents',    icon: FolderOpen  },
  { key: 'parametres',    label: 'Paramètres',   route: '/parametres',   icon: Building2   },
] as const;

const CURRENCIES = [
  { code: 'EUR', label: 'Euro (€)', symbol: '€' },
  { code: 'GBP', label: 'Livre sterling (£)', symbol: '£' },
  { code: 'USD', label: 'Dollar américain ($)', symbol: '$' },
  { code: 'CHF', label: 'Franc suisse (CHF)', symbol: 'CHF' },
];

const weddingSchema = z.object({
  partner1: z.string().min(1, 'Requis'),
  partner2: z.string().min(1, 'Requis'),
  currency: z.string().min(1),
  weddingDate: z.string().min(1, 'Requis'),
  venue: z.string().min(1, 'Requis'),
  totalBudget: z.number().min(0),
  guestCount: z.number().min(0).int(),
  notes: z.string().optional(),
});
type WeddingForm = z.infer<typeof weddingSchema>;

/* ── Decorative section card ── */
function SettingsSection({
  icon: Icon,
  eyebrow,
  title,
  children,
}: {
  icon: React.ComponentType<{ size?: number; className?: string }>;
  eyebrow: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className="rounded-3xl bg-card/80 p-8"
      style={{
        border: '1px solid rgba(200,180,200,0.35)',
        boxShadow: '0 2px 16px rgba(93,45,93,0.04), inset 0 1px 0 rgba(255,255,255,0.70)',
      }}
    >
      <div className="mb-6 flex items-center gap-3">
        <span
          className="flex h-9 w-9 items-center justify-center rounded-xl"
          style={{
            background: 'linear-gradient(135deg, rgba(93,45,93,0.12) 0%, rgba(93,45,93,0.06) 100%)',
            border: '1px solid rgba(93,45,93,0.18)',
          }}
        >
          <Icon size={16} className="text-primary" />
        </span>
        <div>
          <p className="eyebrow text-[10px] text-[#a8893e]">{eyebrow}</p>
          <h2 className="font-serif text-[20px] leading-none text-foreground">{title}</h2>
        </div>
      </div>
      {children}
    </div>
  );
}

/* ── Main page ── */
export default function Parametres() {
  const { user } = useUser();
  const { activeWeddingId, setActiveWeddingId } = useActiveWedding();
  const [, navigate] = useLocation();
  const { data: wedding, isLoading } = useGetWedding(activeWeddingId ?? 0, {
    query: {
      enabled: !!activeWeddingId,
      queryKey: getGetWeddingQueryKey(activeWeddingId ?? 0),
    },
  });
  const updateWedding = useUpdateWedding();
  const deleteWedding = useDeleteWedding();
  const { data: weddings = [] } = useListWeddings();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [tourTrigger, setTourTrigger] = useState(0);

  const replayTour = (tourKey: string, route: string) => {
    localStorage.removeItem(STORAGE_PREFIX + tourKey);
    if (tourKey === 'parametres') {
      // Same page — force re-open via forceOpen prop on the existing PageTour
      setTourTrigger((t) => t + 1);
    } else {
      navigate(route);
    }
  };

  const resetAllTours = () => {
    TOUR_PAGES.forEach(({ key }) => localStorage.removeItem(STORAGE_PREFIX + key));
    toast({
      title: 'Guides réinitialisés',
      description: 'Chaque guide s\'affichera à nouveau à votre prochaine visite.',
    });
  };

  const form = useForm<WeddingForm>({
    resolver: zodResolver(weddingSchema),
    defaultValues: {
      partner1: '',
      partner2: '',
      currency: 'EUR',
      weddingDate: '',
      venue: '',
      totalBudget: 0,
      guestCount: 0,
      notes: '',
    },
  });

  /* Populate form when wedding data arrives */
  useEffect(() => {
    if (!wedding) return;
    form.reset({
      partner1: wedding.partner1 ?? '',
      partner2: wedding.partner2 ?? '',
      currency: wedding.currency ?? 'EUR',
      weddingDate: wedding.weddingDate ?? '',
      venue: wedding.venue ?? '',
      totalBudget: (wedding.totalBudget ?? 0) / 100,
      guestCount: wedding.guestCount ?? 0,
      notes: wedding.notes ?? '',
    });
  }, [wedding, form]);

  const onSubmit = (data: WeddingForm) => {
    if (!activeWeddingId) return;
    const names = `${data.partner1.trim()} & ${data.partner2.trim()}`;
    updateWedding.mutate(
      {
        id: activeWeddingId,
        data: {
          names,
          partner1: data.partner1.trim(),
          partner2: data.partner2.trim(),
          currency: data.currency,
          weddingDate: data.weddingDate,
          venue: data.venue,
          totalBudget: Math.round(data.totalBudget * 100),
          guestCount: data.guestCount,
          notes: data.notes,
        },
      },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListWeddingsQueryKey() });
          queryClient.invalidateQueries({ queryKey: getGetWeddingQueryKey(activeWeddingId) });
          toast({ title: 'Paramètres sauvegardés', description: names });
        },
        onError: () => {
          toast({ title: 'Erreur', description: 'Impossible de sauvegarder.', variant: 'destructive' });
        },
      }
    );
  };

  const handleDelete = () => {
    if (!activeWeddingId) return;
    setDeleting(true);
    deleteWedding.mutate(
      { id: activeWeddingId },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListWeddingsQueryKey() });
          const remaining = weddings.filter((w) => w.id !== activeWeddingId);
          setActiveWeddingId(remaining.length > 0 ? remaining[0].id : null);
          setDeleteOpen(false);
          toast({ title: 'Dossier supprimé' });
        },
        onError: () => {
          setDeleting(false);
          toast({ title: 'Erreur', description: 'Impossible de supprimer.', variant: 'destructive' });
        },
      }
    );
  };

  if (activeWeddingId && isLoading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <p className="text-[13px] text-muted-foreground">Chargement…</p>
      </div>
    );
  }

  const currencyCode = form.watch('currency');
  const currencySymbol = CURRENCIES.find((c) => c.code === currencyCode)?.symbol ?? currencyCode;

  return (
    <>
      <PageTour
        tourKey="parametres"
        pageTitle="Paramètres"
        pageIcon={Building2}
        forceOpen={tourTrigger}
        steps={[
          { icon: Building2, title: 'Dossier de mariage', body: 'Modifiez à tout moment les informations du mariage actif : noms des mariés, date du mariage, lieu de réception et notes.' },
          { icon: Globe, title: 'Devise', body: 'Changez la devise (€, £, $, CHF) pour adapter l\'affichage budgétaire à votre destination ou aux préférences des mariés.' },
          { icon: Wallet, title: 'Budget & invités', body: 'Mettez à jour le budget global et le nombre d\'invités au fil de l\'évolution du projet pour garder les métriques à jour.' },
          { icon: Save, title: 'Sauvegarder', body: 'N\'oubliez pas de cliquer sur « Sauvegarder les modifications » après chaque changement pour ne rien perdre.' },
        ]}
      />
      {/* Delete confirmation dialog */}
      <Dialog open={deleteOpen} onOpenChange={(o) => { if (!o) setDeleteOpen(false); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 font-serif text-xl text-destructive">
              <AlertTriangle size={18} /> Supprimer le dossier
            </DialogTitle>
            <DialogDescription>
              Cette action est irréversible. Toutes les données liées à ce mariage (prestataires, invités, budget, documents…) seront définitivement supprimées.
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-2 pt-2">
            <Button variant="outline" className="flex-1" onClick={() => setDeleteOpen(false)}>
              Annuler
            </Button>
            <Button
              variant="destructive"
              className="flex-1"
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting ? 'Suppression…' : 'Supprimer définitivement'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Page header */}
      <div className="mb-10">
        <p className="eyebrow mb-2 text-[#a8893e]">Configuration</p>
        <h1 className="font-serif text-[38px] leading-[0.92] text-foreground">Paramètres</h1>
        <p className="mt-2 text-[13px] text-muted-foreground">
          {activeWeddingId
            ? 'Modifiez les informations du dossier de mariage actif.'
            : 'Gérez votre profil et vos guides, puis créez un dossier quand vous serez prêt.'}
        </p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {!activeWeddingId && (
            <div className="rounded-2xl border border-accent/30 bg-accent/10 px-4 py-3 text-[12px] text-muted-foreground">
              Aucun mariage actif. Les informations du dossier apparaîtront ici après la création ou la sélection d’un mariage.
            </div>
          )}
          {/* ── Mariés ── */}
          <SettingsSection icon={User} eyebrow="Identité" title="Les mariés">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="partner1"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-1.5 text-[11px]">
                      Prénom — marié·e 1
                    </FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Sophie" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="partner2"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[11px]">Prénom — marié·e 2</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="James" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </SettingsSection>

          {/* ── Date & lieu ── */}
          <SettingsSection icon={CalendarDays} eyebrow="Logistique" title="Date & lieu">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="weddingDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-1.5 text-[11px]">
                      <CalendarDays size={12} className="text-primary/60" /> Date du mariage
                    </FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="venue"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-1.5 text-[11px]">
                      <MapPin size={12} className="text-primary/60" /> Lieu de réception
                    </FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="The Orangery at Wychwood" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </SettingsSection>

          {/* ── Budget ── */}
          <SettingsSection icon={Wallet} eyebrow="Finances" title="Budget & devise">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <FormField
                control={form.control}
                name="currency"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-1.5 text-[11px]">
                      <Globe size={12} className="text-primary/60" /> Devise
                    </FormLabel>
                    <FormControl>
                      <select
                        {...field}
                        className="w-full rounded-md border border-border bg-card px-3 py-2 text-[12px] text-foreground focus:outline-none focus:border-ring"
                      >
                        {CURRENCIES.map((c) => (
                          <option key={c.code} value={c.code}>{c.label}</option>
                        ))}
                      </select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="totalBudget"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-1.5 text-[11px]">
                      <Wallet size={12} className="text-primary/60" /> Budget total ({currencySymbol})
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={0}
                        {...field}
                        onChange={(e) => field.onChange(Number(e.target.value))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="guestCount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-1.5 text-[11px]">
                      <Users size={12} className="text-primary/60" /> Nombre d'invités
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={0}
                        {...field}
                        onChange={(e) => field.onChange(Number(e.target.value))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </SettingsSection>

          {/* ── Notes ── */}
          <SettingsSection icon={StickyNote} eyebrow="Informations complémentaires" title="Notes">
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-[11px]">Notes libres</FormLabel>
                  <FormControl>
                    <textarea
                      {...field}
                      rows={4}
                      placeholder="Style, thème, contraintes alimentaires, informations clés pour l'équipe…"
                      className="w-full resize-none rounded-md border border-border bg-card px-3 py-2.5 text-[12px] text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:border-ring"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </SettingsSection>

          {/* ── Profil planificateur ── */}
          <SettingsSection icon={User} eyebrow="Compte" title="Profil planificateur">
            {(() => {
              const fullName = user
                ? [user.firstName, user.lastName].filter(Boolean).join(' ') || user.username || 'Planificateur'
                : 'Planificateur';
              const initials = user
                ? ([user.firstName?.[0], user.lastName?.[0]].filter(Boolean).join('') || fullName.slice(0, 2)).toUpperCase()
                : '?';
              const email = user?.primaryEmailAddress?.emailAddress ?? null;
              const imageUrl = user?.imageUrl ?? null;

              return (
                <div className="flex items-center gap-4">
                  {imageUrl ? (
                    <img
                      src={imageUrl}
                      alt={fullName}
                      className="h-14 w-14 shrink-0 rounded-2xl object-cover"
                      style={{ boxShadow: '0 4px 14px rgba(93,45,93,0.25)' }}
                    />
                  ) : (
                    <span
                      className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl font-serif text-[20px]"
                      style={{
                        background: 'linear-gradient(135deg, #8A4A8A 0%, #5D2D5D 55%, #4A2060 100%)',
                        color: '#FBF5FB',
                        boxShadow: '0 4px 14px rgba(93,45,93,0.30), inset 0 1px 0 rgba(255,255,255,0.20)',
                      }}
                    >
                      {initials}
                    </span>
                  )}
                  <div>
                    <p className="text-[14px] font-semibold text-foreground">{fullName}</p>
                    {email && (
                      <p className="text-[11px] text-muted-foreground">{email}</p>
                    )}
                    <p className="mt-1 text-[10px] text-muted-foreground/60">
                      Pour modifier votre profil, rendez-vous sur votre compte Clerk.
                    </p>
                  </div>
                </div>
              );
            })()}
          </SettingsSection>

          {/* ── Guides d'utilisation ── */}
          <SettingsSection icon={BookOpen} eyebrow="Aide" title="Guides d'utilisation">
            <p className="mb-4 text-[12px] text-muted-foreground">
              Chaque page dispose d'un guide illustré. Cliquez sur « Rejouer » pour le revoir, ou réinitialisez-les tous d'un coup.
            </p>
            <div className="space-y-1">
              {TOUR_PAGES.map(({ key, label, route, icon: Icon }) => (
                <div
                  key={key}
                  className="flex items-center justify-between rounded-xl px-3 py-2.5 transition hover:bg-muted/40"
                >
                  <div className="flex items-center gap-2.5">
                    <span
                      className="flex h-7 w-7 items-center justify-center rounded-lg"
                      style={{
                        background: 'linear-gradient(135deg, rgba(93,45,93,0.10) 0%, rgba(93,45,93,0.04) 100%)',
                        border: '1px solid rgba(93,45,93,0.14)',
                      }}
                    >
                      <Icon size={13} className="text-primary/70" />
                    </span>
                    <span className="text-[13px] font-medium text-foreground">{label}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => replayTour(key, route)}
                    className="flex items-center gap-1.5 rounded-lg border border-border/60 px-3 py-1.5 text-[11px] font-medium text-muted-foreground transition hover:border-primary/40 hover:bg-primary/5 hover:text-primary"
                  >
                    <PlayCircle size={12} /> Rejouer
                  </button>
                </div>
              ))}
            </div>
            <div className="mt-4 border-t border-border/40 pt-4">
              <button
                type="button"
                onClick={resetAllTours}
                className="flex items-center gap-2 rounded-xl border border-border/50 px-4 py-2.5 text-[11px] font-semibold text-muted-foreground transition hover:border-primary/40 hover:bg-primary/5 hover:text-primary"
              >
                <RotateCcw size={13} /> Réinitialiser tous les guides
              </button>
            </div>
          </SettingsSection>

          {/* ── Actions ── */}
          <div className="flex items-center justify-between pt-2">
            {/* Danger zone */}
            <button
              type="button"
              onClick={() => setDeleteOpen(true)}
              className="flex items-center gap-2 rounded-xl border border-destructive/30 px-4 py-2.5 text-[11px] font-semibold text-destructive/70 transition hover:border-destructive/60 hover:text-destructive hover:bg-destructive/5"
            >
              <Trash2 size={13} /> Supprimer ce dossier
            </button>

            {/* Save */}
            <Button
              type="submit"
              className="flex items-center gap-2 bg-primary text-primary-foreground hover:bg-primary/90"
              disabled={!activeWeddingId || updateWedding.isPending}
            >
              <Save size={14} />
              {updateWedding.isPending ? 'Sauvegarde…' : 'Sauvegarder les modifications'}
            </Button>
          </div>
        </form>
      </Form>
      <LegalFooter className="pb-2 pt-10" />
    </>
  );
}
