import { useState, useEffect, useMemo, ReactNode } from 'react';
import { NuptiaChat } from '@/components/nuptia/nuptia-chat';
import { useUser, useClerk } from '@clerk/react';
import { Link, useLocation } from 'wouter';
import {
  Bell,
  CalendarDays,
  ChevronDown,
  FileText,
  Home,
  LogOut,
  Menu,
  Paperclip,
  Plus,
  Search,
  Settings,
  Trash2,
  Users,
  WalletCards,
  X,
  CreditCard,
  UserCircle2,
  Heart,
} from 'lucide-react';
import {
  useListWeddings,
  useCreateWedding,
  useDeleteWedding,
  getListWeddingsQueryKey,
  useListPayments,
  useGetWeddingSummary,
} from '@workspace/api-client-react';
import { useActiveWedding } from '@/lib/wedding-context';
import { formatDateShort, calculateDaysUntil } from '@/lib/format';
import { useQueryClient } from '@tanstack/react-query';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useToast } from '@/hooks/use-toast';

const navItems = [
  { label: 'Aperçu', icon: Home, path: '/' },
  { label: 'Calendrier', icon: CalendarDays, path: '/calendrier' },
  { label: 'Prestataires', icon: Users, path: '/prestataires' },
  { label: 'Invités', icon: UserCircle2, path: '/invites' },
  { label: 'Budget', icon: WalletCards, path: '/budget' },
  { label: 'Contrats', icon: FileText, path: '/contrats' },
  { label: 'Paiements', icon: CreditCard, path: '/paiements' },
  { label: 'Documents', icon: Paperclip, path: '/documents' },
  { label: 'Jour J',    icon: Heart,     path: '/jour-j'    },
];

const CURRENCIES = [
  { code: 'EUR', label: 'Euro (€)', symbol: '€' },
  { code: 'GBP', label: 'Livre sterling (£)', symbol: '£' },
  { code: 'USD', label: 'Dollar américain ($)', symbol: '$' },
  { code: 'CHF', label: 'Franc suisse (CHF)', symbol: 'CHF' },
];

const newWeddingSchema = z.object({
  partner1: z.string().min(1, 'Entrez le prénom du premier marié'),
  partner2: z.string().min(1, 'Entrez le prénom du second marié'),
  currency: z.string().min(1),
  weddingDate: z.string().min(1, 'La date est requise'),
  venue: z.string().min(1, 'Le lieu est requis'),
  totalBudget: z.number().min(0),
  guestCount: z.number().min(0).int(),
  notes: z.string().optional(),
});
type NewWeddingData = z.infer<typeof newWeddingSchema>;

function CreateWeddingDialog({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: (id: number) => void;
}) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const createWedding = useCreateWedding();
  const form = useForm<NewWeddingData>({
    resolver: zodResolver(newWeddingSchema),
    defaultValues: { partner1: '', partner2: '', currency: 'EUR', weddingDate: '', venue: '', totalBudget: 0, guestCount: 0, notes: '' },
  });

  const onSubmit = (data: NewWeddingData) => {
    const names = `${data.partner1.trim()} & ${data.partner2.trim()}`;
    createWedding.mutate(
      { data: { names, partner1: data.partner1.trim(), partner2: data.partner2.trim(), currency: data.currency, weddingDate: data.weddingDate, venue: data.venue, totalBudget: Math.round(data.totalBudget * 100), guestCount: data.guestCount, notes: data.notes } },
      {
        onSuccess: (wedding) => {
          queryClient.invalidateQueries({ queryKey: getListWeddingsQueryKey() });
          toast({ title: 'Mariage créé', description: wedding.names });
          form.reset();
          onCreated(wedding.id);
          onClose();
        },
        onError: () => {
          toast({ title: 'Erreur', description: 'Impossible de créer le mariage.', variant: 'destructive' });
        },
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="font-serif text-2xl text-primary">
            <span className="flex items-center gap-2"><Heart size={18} className="text-accent" /> Nouveau mariage</span>
          </DialogTitle>
          <DialogDescription>Ajoutez un nouveau dossier de mariage à votre studio.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="partner1"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Prénom — marié·e 1</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Sophie" data-testid="input-wedding-partner1" />
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
                    <FormLabel>Prénom — marié·e 2</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="James" data-testid="input-wedding-partner2" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="currency"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Devise</FormLabel>
                  <FormControl>
                    <select
                      {...field}
                      className="w-full border border-border bg-card px-3 py-2 text-[12px] text-foreground focus:outline-none focus:border-ring rounded-md"
                      data-testid="select-wedding-currency"
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
              name="weddingDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Date du mariage</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} data-testid="input-wedding-date" />
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
                  <FormLabel>Lieu</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="The Orangery at Wychwood" data-testid="input-wedding-venue" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="totalBudget"
                render={({ field }) => {
                  const currencyCode = form.watch('currency');
                  const symbol = CURRENCIES.find((c) => c.code === currencyCode)?.symbol ?? currencyCode;
                  return (
                  <FormItem>
                    <FormLabel>Budget total ({symbol})</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={0}
                        {...field}
                        onChange={(e) => field.onChange(Number(e.target.value))}
                        data-testid="input-wedding-budget"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                  );
                }}
              />
              <FormField
                control={form.control}
                name="guestCount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nombre d'invités</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={0}
                        {...field}
                        onChange={(e) => field.onChange(Number(e.target.value))}
                        data-testid="input-wedding-guest-count"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes (facultatif)</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Style, thème, informations clés…" data-testid="input-wedding-notes" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="flex gap-2 pt-2">
              <Button type="button" variant="outline" className="flex-1" onClick={onClose} data-testid="button-cancel-wedding">
                Annuler
              </Button>
              <Button
                type="submit"
                className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90"
                disabled={createWedding.isPending}
                data-testid="button-create-wedding"
              >
                {createWedding.isPending ? 'Création…' : 'Créer le dossier'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const [location, navigate] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [sidebarUserMenuOpen, setSidebarUserMenuOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [deleteWeddingId, setDeleteWeddingId] = useState<number | null>(null);
  const [deletingWedding, setDeletingWedding] = useState(false);

  const { user } = useUser();
  const { signOut, session } = useClerk();

  // Derived identity values with graceful fallbacks
  const userFullName = user
    ? [user.firstName, user.lastName].filter(Boolean).join(' ') || user.username || 'Planificateur'
    : 'Planificateur';
  const userFirstName = user?.firstName || userFullName.split(' ')[0];
  const userInitials = user
    ? ([user.firstName?.[0], user.lastName?.[0]].filter(Boolean).join('') || userFullName.slice(0, 2)).toUpperCase()
    : '?';
  const userImageUrl = user?.imageUrl ?? null;

  const getToken = () => session?.getToken() ?? Promise.resolve<string | null>(null);
  const handleSignOut = (opts?: { redirectUrl?: string }) => signOut(opts);
  const { activeWeddingId, setActiveWeddingId } = useActiveWedding();
  const { data: weddings = [], isLoading } = useListWeddings();
  const { data: payments = [] } = useListPayments(activeWeddingId ?? 0);
  const deleteWedding = useDeleteWedding();
  const queryClient = useQueryClient();

  const handleDeleteWedding = () => {
    if (!deleteWeddingId) return;
    setDeletingWedding(true);
    deleteWedding.mutate(
      { id: deleteWeddingId },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListWeddingsQueryKey() });
          const remaining = weddings.filter((w) => w.id !== deleteWeddingId);
          setActiveWeddingId(remaining.length > 0 ? remaining[0]!.id : null);
          setDeleteWeddingId(null);
          setDeletingWedding(false);
        },
        onError: () => setDeletingWedding(false),
      },
    );
  };
  const { data: weddingSummary } = useGetWeddingSummary(activeWeddingId ?? 0);

  const activeWedding = weddings.find((w) => w.id === activeWeddingId);

  const notifications = useMemo(() => {
    if (!activeWeddingId) return [];
    type Notif = { id: string; urgency: 'high' | 'medium' | 'low'; title: string; body: string; route: string };
    const items: Notif[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Overdue payments
    (payments as Array<{ id: number; status: string; description?: string | null; dueDate: string; amountCents: number }>)
      .filter(p => p.status === 'overdue')
      .forEach(p => {
        items.push({ id: `overdue-${p.id}`, urgency: 'high', title: 'Paiement en retard', body: p.description ?? 'Échéance dépassée', route: '/paiements' });
      });

    // Pending payments due within 7 days
    (payments as Array<{ id: number; status: string; description?: string | null; dueDate: string; amountCents: number }>)
      .filter(p => p.status === 'pending')
      .forEach(p => {
        const days = Math.ceil((new Date(p.dueDate).getTime() - today.getTime()) / 86_400_000);
        if (days >= 0 && days <= 7) {
          items.push({
            id: `soon-${p.id}`,
            urgency: days <= 3 ? 'high' : 'medium',
            title: days === 0 ? 'Paiement dû aujourd\'hui' : `Paiement dans ${days} j`,
            body: p.description ?? '',
            route: '/paiements',
          });
        }
      });

    // Budget threshold
    if (weddingSummary && (weddingSummary as { budgetTotal: number; budgetSpent: number }).budgetTotal > 0) {
      const s = weddingSummary as { budgetTotal: number; budgetSpent: number; totalGuests: number; confirmedGuests: number };
      const pct = s.budgetSpent / s.budgetTotal;
      if (pct >= 0.95)
        items.push({ id: 'budget-critical', urgency: 'high', title: 'Budget presque épuisé', body: `${Math.round(pct * 100)}% du budget engagé`, route: '/budget' });
      else if (pct >= 0.80)
        items.push({ id: 'budget-warn', urgency: 'medium', title: 'Budget à surveiller', body: `${Math.round(pct * 100)}% du budget engagé`, route: '/budget' });

      // Many unconfirmed guests
      const pending = s.totalGuests - s.confirmedGuests;
      if (s.totalGuests > 0 && pending / s.totalGuests > 0.3)
        items.push({ id: 'guests-pending', urgency: 'low', title: `${pending} invité${pending > 1 ? 's' : ''} sans réponse`, body: 'Relancez les invitations en attente', route: '/invites' });
    }

    return items;
  }, [activeWeddingId, payments, weddingSummary]);

  // Auto-select first wedding if none selected
  useEffect(() => {
    if (!activeWeddingId && weddings.length > 0 && !isLoading) {
      setActiveWeddingId(weddings[0].id);
    }
  }, [activeWeddingId, weddings, isLoading, setActiveWeddingId]);

  return (
    <div className="h-screen overflow-hidden bg-background text-foreground font-sans">
      <CreateWeddingDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={(id) => setActiveWeddingId(id)}
      />

      {/* Delete wedding confirmation dialog */}
      <Dialog open={!!deleteWeddingId} onOpenChange={(o) => { if (!o && !deletingWedding) setDeleteWeddingId(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 font-serif text-xl text-destructive">
              <Trash2 size={17} /> Supprimer le dossier
            </DialogTitle>
            <DialogDescription>
              Cette action est irréversible. Toutes les données liées à ce mariage (prestataires, invités, budget, documents…) seront définitivement supprimées.
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-2 pt-2">
            <Button variant="outline" className="flex-1" onClick={() => setDeleteWeddingId(null)} disabled={deletingWedding}>
              Annuler
            </Button>
            <Button variant="destructive" className="flex-1" onClick={handleDeleteWedding} disabled={deletingWedding}>
              {deletingWedding ? 'Suppression…' : 'Supprimer définitivement'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <div className="flex h-full">
        {/* Sidebar */}
        <aside
          className={`fixed inset-y-0 left-0 z-30 w-[285px] -translate-x-full sidebar-gradient text-sidebar-foreground transition-transform duration-300 md:sticky md:top-0 md:h-screen md:translate-x-0 md:shrink-0 ${mobileOpen ? 'translate-x-0' : ''}`}
        >
          {/* Botanical watermark */}
          <div className="pointer-events-none absolute -bottom-6 -left-4 w-40 rotate-[15deg] text-sidebar-foreground opacity-[0.04]">
            <svg viewBox="0 0 120 220" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
              <path d="M60 215 Q56 175 52 135 Q48 90 58 48" stroke="currentColor" strokeWidth="1.4" fill="none" opacity="0.7"/>
              <path d="M58 48 Q32 28 18 50 Q12 72 58 68 Z" opacity="0.65"/>
              <path d="M54 85 Q26 68 14 92 Q10 114 54 104 Z" opacity="0.55"/>
              <path d="M52 122 Q78 104 90 128 Q94 150 52 138 Z" opacity="0.60"/>
              <path d="M50 158 Q24 140 14 165 Q10 188 50 174 Z" opacity="0.50"/>
              <circle cx="62" cy="23" r="7" opacity="0.55"/>
            </svg>
          </div>

          <div className="flex h-full flex-col px-7 py-8">
            {/* Logo */}
            <div className="mb-12 flex items-center justify-between">
              <div className="flex items-center gap-3">
                {/* Double-border monogram */}
                <div className="relative flex h-10 w-10 items-center justify-center">
                  <div className="absolute inset-0 rounded-full border border-sidebar-primary/20" />
                  <span className="flex h-8 w-8 items-center justify-center border border-sidebar-primary/70 font-serif text-[22px] text-sidebar-primary"
                    style={{ boxShadow: '0 0 12px rgba(200,169,110,0.25), inset 0 1px 0 rgba(255,255,255,0.15)' }}>
                    N
                  </span>
                </div>
                <div>
                  <p className="font-serif text-[20px] leading-none">The Nuptial Plan</p>
                  <p className="mt-1 text-[8.5px] uppercase tracking-[0.2em] text-sidebar-foreground/40">
                    Pour que rien ne manque à votre bonheur
                  </p>
                </div>
              </div>
              <button className="md:hidden text-sidebar-foreground/50 hover:text-sidebar-foreground" onClick={() => setMobileOpen(false)} data-testid="button-close-sidebar">
                <X size={17} />
              </button>
            </div>
            {/* Decorative separator */}
            <div className="mb-6 h-px w-full bg-gradient-to-r from-transparent via-sidebar-primary/30 to-transparent" />

            {/* Weddings list — scrollable middle zone */}
            <div className="flex-1 overflow-y-auto min-h-0 -mx-7 px-7">
            <p className="mb-4 text-[9px] font-semibold uppercase tracking-[0.22em] text-sidebar-foreground/50">
              Vos mariages
            </p>

            {isLoading ? (
              <div className="text-[11px] text-sidebar-foreground/50">Chargement…</div>
            ) : weddings.length === 0 ? (
              <div className="rounded-2xl border border-sidebar-border/40 bg-white/5 px-4 py-5 text-center">
                <p className="text-[11px] text-sidebar-foreground/50">Aucun mariage pour l'instant.</p>
                <button
                  className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-xl bg-sidebar-primary/80 px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-sidebar-primary-foreground hover:bg-sidebar-primary"
                  onClick={() => setCreateOpen(true)}
                  data-testid="button-first-wedding"
                >
                  <Plus size={12} /> Créer votre premier mariage
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                {weddings.map((w, idx) => {
                  const isActive = w.id === activeWeddingId;
                  const initials = w.names
                    .split('&')[0]
                    .trim()
                    .split(' ')
                    .map((n) => n[0])
                    .join('')
                    .toUpperCase()
                    .slice(0, 2);

                  const daysUntil = calculateDaysUntil(w.weddingDate);

                  // Cycling palette for avatar gradients
                  const avatarStyles = [
                    { bg: 'linear-gradient(135deg, #8A4A8A 0%, #5D2D5D 100%)', color: '#FBF5FB' },
                    { bg: 'linear-gradient(135deg, #CC8C94 0%, #A0606A 100%)', color: '#FFF5F5' },
                    { bg: 'linear-gradient(135deg, #C8A96E 0%, #9A7A40 100%)', color: '#FBF5E8' },
                    { bg: 'linear-gradient(135deg, #649064 0%, #40664A 100%)', color: '#F0FBF0' },
                  ];
                  const av = avatarStyles[idx % avatarStyles.length];

                  return (
                    <div key={w.id} className="group relative">
                      <button
                        onClick={() => {
                          setActiveWeddingId(w.id);
                          setMobileOpen(false);
                        }}
                        className={`w-full rounded-2xl px-4 py-3.5 text-left transition-all duration-200 ${
                          isActive
                            ? 'sidebar-card-active'
                            : 'hover:bg-white/[0.07]'
                        }`}
                        data-testid={`button-wedding-${w.id}`}
                      >
                        <div className="flex items-center gap-3">
                          <span
                            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl font-serif text-[15px]"
                            style={{
                              background: av.bg,
                              color: av.color,
                              boxShadow: isActive
                                ? '0 3px 10px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.20)'
                                : '0 2px 6px rgba(0,0,0,0.25)',
                            }}
                          >
                            {initials}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-[12px] font-semibold text-sidebar-foreground">
                              {w.names}
                            </span>
                            <span className="mt-0.5 block text-[10px] text-sidebar-foreground/45">
                              {formatDateShort(w.weddingDate)}
                            </span>
                          </span>
                          {/* Countdown chip */}
                          {daysUntil > 0 && (
                            <span className="countdown-chip shrink-0">
                              J-{daysUntil}
                            </span>
                          )}
                        </div>
                        {isActive && w.venue && (
                          <p className="ml-12 mt-2 truncate text-[9.5px] text-sidebar-foreground/35">
                            {w.venue}
                          </p>
                        )}
                      </button>
                      {/* Delete button — appears on hover */}
                      <button
                        onClick={(e) => { e.stopPropagation(); setDeleteWeddingId(w.id); }}
                        className="absolute right-2 top-1/2 -translate-y-1/2 flex h-6 w-6 items-center justify-center rounded-lg opacity-0 transition-opacity duration-150 group-hover:opacity-100 hover:bg-red-500/20"
                        title="Supprimer ce dossier"
                        data-testid={`button-delete-wedding-${w.id}`}
                      >
                        <Trash2 size={12} className="text-red-400" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Add wedding button */}
            <button
              className="mt-4 flex items-center gap-2 rounded-xl border border-sidebar-primary/30 px-4 py-2.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-sidebar-primary transition hover:bg-white/[0.07] hover:border-sidebar-primary/50"
              style={{ boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.08)' }}
              onClick={() => setCreateOpen(true)}
              data-testid="button-add-wedding"
            >
              <Plus size={13} /> Ajouter un mariage
            </button>
            </div>{/* end scrollable middle zone */}

            {/* User section */}
            <div className="mt-auto pt-5">
              <div className="mb-3 h-px w-full bg-gradient-to-r from-transparent via-sidebar-foreground/15 to-transparent" />
              <button
                className="flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left transition hover:bg-white/[0.07]"
                data-testid="button-user-menu"
                onClick={() => setSidebarUserMenuOpen((o) => !o)}
              >
                {/* User avatar — photo or initials fallback */}
                {userImageUrl ? (
                  <img
                    src={userImageUrl}
                    alt={userFullName}
                    className="h-9 w-9 shrink-0 rounded-xl object-cover"
                    style={{ boxShadow: '0 3px 10px rgba(0,0,0,0.30), inset 0 1px 0 rgba(255,255,255,0.18)' }}
                  />
                ) : (
                  <span
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl font-serif text-[14px]"
                    style={{
                      background: 'linear-gradient(135deg, #CC8C94 0%, #9A506A 100%)',
                      color: '#FFF0F2',
                      boxShadow: '0 3px 10px rgba(0,0,0,0.30), inset 0 1px 0 rgba(255,255,255,0.18)',
                    }}
                  >
                    {userInitials.slice(0, 1)}
                  </span>
                )}
                <span className="flex-1">
                  <span className="block text-[12px] font-semibold text-sidebar-foreground">{userFullName}</span>
                  <span className="block text-[9.5px] text-sidebar-foreground/40">Wedding planner</span>
                </span>
                <ChevronDown
                  size={13}
                  className={`text-sidebar-foreground/30 transition-transform duration-200 ${sidebarUserMenuOpen ? 'rotate-180' : ''}`}
                />
              </button>

              {sidebarUserMenuOpen && (
                <div className="mt-1 overflow-hidden rounded-2xl border border-sidebar-border/30 bg-white/[0.06] p-1">
                  <button
                    className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-[11px] font-medium text-sidebar-foreground/70 transition hover:bg-white/[0.08]"
                    data-testid="button-sidebar-settings"
                    onClick={() => { setSidebarUserMenuOpen(false); setMobileOpen(false); navigate('/parametres'); }}
                  >
                    <Settings size={13} className="text-sidebar-foreground/40" /> Paramètres
                  </button>
                  <div className="my-1 h-px bg-sidebar-foreground/10" />
                  <button
                    className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-[11px] font-medium text-rose-300/80 transition hover:bg-white/[0.08]"
                    data-testid="button-sidebar-sign-out"
                    onClick={() => { setSidebarUserMenuOpen(false); setMobileOpen(false); handleSignOut(); }}
                  >
                    <LogOut size={13} className="text-rose-300/60" /> Se déconnecter
                  </button>
                </div>
              )}
            </div>
          </div>
        </aside>

        {/* Mobile overlay */}
        {mobileOpen && (
          <button
            aria-label="Fermer le menu"
            className="fixed inset-0 z-20 bg-foreground/30 md:hidden"
            onClick={() => setMobileOpen(false)}
          />
        )}

        {/* Main content */}
        <main className="min-w-0 flex-1 flex flex-col h-full overflow-hidden">
          {/* Header — frosted glass */}
          <header className="relative z-20 flex h-[72px] items-center justify-between header-glass px-5 sm:px-9 lg:px-12"
            style={{ boxShadow: '0 1px 0 rgba(215,200,215,0.55), 0 4px 16px rgba(93,45,93,0.04)' }}>
            {/* Gradient accent line at bottom */}
            <div className="absolute inset-x-0 bottom-0 h-[1.5px] bg-gradient-to-r from-transparent via-[rgba(180,120,180,0.45)] to-transparent" />

            <div className="flex items-center gap-4">
              <button className="md:hidden text-muted-foreground" onClick={() => setMobileOpen(true)} data-testid="button-open-sidebar">
                <Menu size={20} />
              </button>
              <div>
                <p className="eyebrow text-[rgba(168,137,62,0.80)]">
                  {new Date().toLocaleDateString('fr-FR', {
                    weekday: 'long',
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  })}
                </p>
                <p className="mt-1 font-serif text-[16px] leading-none text-foreground/80">
                  Bonjour, <span className="text-primary">{userFirstName}</span>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              {/* Search pill — hidden */}

              {/* Notification bell */}
              <div className="relative">
                <button
                  className="relative flex h-9 w-9 items-center justify-center rounded-full border border-border/50 bg-white/60 text-muted-foreground transition hover:bg-white/80"
                  data-testid="button-notifications"
                  onClick={() => setNotifOpen(!notifOpen)}
                  style={{ boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.80)' }}
                >
                  <Bell size={16} />
                  {notifications.length > 0 ? (
                    <span className="absolute -right-0.5 -top-0.5 flex h-[18px] w-[18px] items-center justify-center rounded-full text-[8px] font-bold text-white"
                      style={{ background: '#D94E4E' }}>
                      {Math.min(notifications.length, 9)}
                    </span>
                  ) : (
                    <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-[#C8A96E]"
                      style={{ boxShadow: '0 0 6px rgba(200,169,110,0.70)' }} />
                  )}
                </button>

                {notifOpen && (
                  <>
                    {/* Invisible backdrop to close on outside click */}
                    <div className="fixed inset-0 z-40" onClick={() => setNotifOpen(false)} />

                    {/* Panel */}
                    <div className="absolute right-0 top-[44px] z-50 w-80 overflow-hidden rounded-2xl border border-border/60 bg-popover/95 shadow-[0_8px_40px_rgba(93,45,93,0.20)] backdrop-blur-md">
                      <div className="flex items-center justify-between border-b border-border/40 px-4 py-3">
                        <p className="text-[12px] font-semibold text-foreground">Notifications</p>
                        {notifications.length > 0 && (
                          <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[9px] font-semibold text-primary">
                            {notifications.length} nouvelle{notifications.length > 1 ? 's' : ''}
                          </span>
                        )}
                      </div>

                      <div className="max-h-[320px] overflow-y-auto">
                        {notifications.length === 0 ? (
                          <div className="flex flex-col items-center py-8 text-center">
                            <span className="mb-2 text-[22px]">✓</span>
                            <p className="text-[12px] font-medium text-foreground/70">Tout est en ordre</p>
                            <p className="text-[10px] text-muted-foreground/60">Aucune action urgente</p>
                          </div>
                        ) : (
                          notifications.map((n) => (
                            <button
                              key={n.id}
                              onClick={() => { setNotifOpen(false); navigate(n.route); }}
                              className="flex w-full items-start gap-3 border-b border-border/20 px-4 py-3 text-left transition last:border-0 hover:bg-muted/40"
                            >
                              <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${
                                n.urgency === 'high'   ? 'bg-[#D94E4E]' :
                                n.urgency === 'medium' ? 'bg-[#C8A96E]' : 'bg-[#6B8C72]'
                              }`} />
                              <div className="min-w-0 flex-1">
                                <p className="text-[11px] font-semibold text-foreground">{n.title}</p>
                                {n.body && <p className="mt-0.5 truncate text-[10px] text-muted-foreground">{n.body}</p>}
                              </div>
                            </button>
                          ))
                        )}
                      </div>
                    </div>
                  </>
                )}
              </div>

              <div className="hidden h-5 w-px bg-border/50 sm:block" />

              {/* Avatar menu */}
              <button
                className="flex items-center gap-2.5 rounded-full border border-border/50 bg-white/60 py-1.5 pl-1.5 pr-3.5 text-[11px] font-semibold text-foreground/75 transition hover:bg-white/80"
                onClick={() => setMenuOpen(!menuOpen)}
                data-testid="button-header-menu"
                style={{ boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.80)' }}
              >
                {userImageUrl ? (
                  <img
                    src={userImageUrl}
                    alt={userFullName}
                    className="h-7 w-7 rounded-full object-cover"
                    style={{ boxShadow: '0 2px 8px rgba(93,45,93,0.35)' }}
                  />
                ) : (
                  <span
                    className="flex h-7 w-7 items-center justify-center rounded-full text-[9px] font-bold text-sidebar-primary-foreground"
                    style={{
                      background: 'linear-gradient(135deg, #8A4A8A 0%, #5D2D5D 60%, #4A2060 100%)',
                      boxShadow: '0 2px 8px rgba(93,45,93,0.35), inset 0 1px 0 rgba(255,255,255,0.22)',
                    }}
                  >
                    {userInitials}
                  </span>
                )}
                <span className="hidden lg:block">{userFullName}</span>
                <ChevronDown size={13} className="text-muted-foreground/60" />
              </button>
              {menuOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
                  <div className="absolute right-6 top-[68px] z-50 w-44 overflow-hidden rounded-2xl border border-border/60 bg-popover/95 p-1.5 shadow-[0_8px_32px_rgba(93,45,93,0.18)] backdrop-blur-md">
                    <button
                      className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-[11px] font-medium text-foreground/75 transition hover:bg-primary/6"
                      data-testid="button-settings"
                      onClick={() => { setMenuOpen(false); navigate('/parametres'); }}
                    >
                      <Settings size={13} className="text-muted-foreground" /> Paramètres
                    </button>
                    <div className="my-1 h-px bg-border/40" />
                    <button
                      className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-[11px] font-medium text-destructive/80 transition hover:bg-destructive/6"
                      data-testid="button-sign-out"
                      onClick={() => { setMenuOpen(false); handleSignOut({ redirectUrl: '/connexion' }); }}
                    >
                      <LogOut size={13} className="text-destructive/70" /> Se déconnecter
                    </button>
                  </div>
                </>
              )}
            </div>
          </header>

          {/* Navigation — floating pill tabs */}
          <div className="nav-tab-bar border-b border-[rgba(200,180,200,0.30)] px-5 py-3 sm:px-9 lg:px-12">
            <div className="flex gap-1 overflow-x-auto">
              {navItems.map(({ label, icon: Icon, path }) => {
                const isActive = location === path;
                return (
                  <Link
                    key={path}
                    href={path}
                    className={`flex shrink-0 items-center gap-1.5 px-4 py-2 text-[11px] font-semibold transition-all duration-200 ${
                      isActive
                        ? 'nav-pill-active'
                        : 'rounded-xl text-muted-foreground hover:bg-primary/[0.06] hover:text-foreground/80'
                    }`}
                    data-testid={`nav-${label.toLowerCase()}`}
                  >
                    <Icon size={13} strokeWidth={isActive ? 2.1 : 1.6} />
                    {label}
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Page content — ambient gradient background */}
          <div className="content-bg flex-1 overflow-y-auto overscroll-contain">
            <div className="mx-auto max-w-[1390px] px-5 pt-9 pb-28 sm:px-9 lg:px-12 lg:pt-12 lg:pb-32">
              {!isLoading && weddings.length === 0 ? (
                <div className="flex min-h-[50vh] flex-col items-center justify-center gap-6 text-center">
                  <div className="relative flex h-20 w-20 items-center justify-center rounded-full"
                    style={{
                      background: 'linear-gradient(145deg, rgba(204,140,148,0.28) 0%, rgba(204,140,148,0.10) 100%)',
                      border: '1px solid rgba(204,140,148,0.35)',
                      boxShadow: '0 6px 24px rgba(204,140,148,0.20), inset 0 1px 0 rgba(255,255,255,0.85)',
                    }}>
                    <Heart size={30} className="text-accent" />
                  </div>
                  <div>
                    <p className="eyebrow mb-3 text-[#a8893e]">Studio nuptial</p>
                    <h2 className="font-serif text-[38px] leading-[0.92] text-foreground">Bienvenue dans<br/>votre studio</h2>
                    <p className="mt-3 text-[13px] text-muted-foreground">
                      Commencez par créer votre premier dossier de mariage.
                    </p>
                  </div>
                  <button
                    className="btn-glow flex items-center gap-2 rounded-xl px-7 py-3 text-[11px] font-semibold uppercase tracking-[0.12em]"
                    onClick={() => setCreateOpen(true)}
                    data-testid="button-create-first-wedding"
                  >
                    <Plus size={14} /> Créer un dossier de mariage
                  </button>
                </div>
              ) : (
                children
              )}
            </div>
          </div>
        </main>
      </div>

      {/* Nuptia — floating AI assistant, available on every page */}
      <NuptiaChat getToken={getToken} />
    </div>
  );
}
