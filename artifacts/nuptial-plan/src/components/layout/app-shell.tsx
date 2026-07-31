import { useState, useEffect, ReactNode } from 'react';
import { Link, useLocation } from 'wouter';
import {
  Bell,
  CalendarDays,
  ChevronDown,
  FileText,
  Home,
  Menu,
  Paperclip,
  Plus,
  Search,
  Settings,
  Users,
  WalletCards,
  X,
  CreditCard,
  UserCircle2,
  Heart,
} from 'lucide-react';
import { useListWeddings, useCreateWedding, getListWeddingsQueryKey } from '@workspace/api-client-react';
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
          <DialogTitle className="font-serif text-2xl text-[#263b48]">
            <span className="flex items-center gap-2"><Heart size={18} className="text-[#c8aa70]" /> Nouveau mariage</span>
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
                      className="w-full border border-[#cfc2b2] bg-[#f8f5ef] px-3 py-2 text-[12px] text-[#263b48] focus:outline-none focus:border-[#a88a5d]"
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
                className="flex-1 bg-[#263b48] text-[#f8f3ea] hover:bg-[#344f5c]"
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
  const [location] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const { activeWeddingId, setActiveWeddingId } = useActiveWedding();
  const { data: weddings = [], isLoading } = useListWeddings();

  const activeWedding = weddings.find((w) => w.id === activeWeddingId);

  // Auto-select first wedding if none selected
  useEffect(() => {
    if (!activeWeddingId && weddings.length > 0 && !isLoading) {
      setActiveWeddingId(weddings[0].id);
    }
  }, [activeWeddingId, weddings, isLoading, setActiveWeddingId]);

  return (
    <div className="min-h-[100dvh] bg-background text-foreground font-sans">
      <CreateWeddingDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={(id) => setActiveWeddingId(id)}
      />

      <div className="flex min-h-[100dvh]">
        {/* Sidebar */}
        <aside
          className={`fixed inset-y-0 left-0 z-30 w-[285px] -translate-x-full bg-sidebar text-sidebar-foreground transition-transform duration-300 md:relative md:translate-x-0 ${mobileOpen ? 'translate-x-0' : ''}`}
        >
          <div className="flex h-full flex-col px-7 py-8">
            {/* Logo */}
            <div className="mb-14 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center border border-[#c3a269] font-serif text-[23px] text-[#d7bd88]">
                  N
                </span>
                <div>
                  <p className="font-serif text-[21px] leading-none">The Nuptial Plan</p>
                  <p className="mt-1 text-[9px] uppercase tracking-[0.17em] text-[#aeb8b6]">
                    Atelier de planification nuptiale
                  </p>
                </div>
              </div>
              <button className="md:hidden" onClick={() => setMobileOpen(false)} data-testid="button-close-sidebar">
                <X size={18} />
              </button>
            </div>

            {/* Weddings list */}
            <p className="mb-4 text-[9px] font-semibold uppercase tracking-[0.22em] text-[#9eacaa]">
              Vos mariages
            </p>

            {isLoading ? (
              <div className="text-[11px] text-[#9eacaa]">Chargement…</div>
            ) : weddings.length === 0 ? (
              <div className="rounded border border-[#3e5a68] bg-[#2d4653] px-4 py-5 text-center">
                <p className="text-[11px] text-[#9eacaa]">Aucun mariage pour l'instant.</p>
                <button
                  className="mt-3 flex w-full items-center justify-center gap-1.5 rounded bg-[#c8aa70] px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#263b48] hover:bg-[#dbc080]"
                  onClick={() => setCreateOpen(true)}
                  data-testid="button-first-wedding"
                >
                  <Plus size={12} /> Créer votre premier mariage
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                {weddings.map((w) => {
                  const isActive = w.id === activeWeddingId;
                  const initials = w.names
                    .split('&')[0]
                    .trim()
                    .split(' ')
                    .map((n) => n[0])
                    .join('')
                    .toUpperCase()
                    .slice(0, 2);

                  return (
                    <button
                      key={w.id}
                      onClick={() => {
                        setActiveWeddingId(w.id);
                        setMobileOpen(false);
                      }}
                      className={`group w-full rounded-sm px-3 py-3 text-left transition ${isActive ? 'bg-[#314c59]' : 'hover:bg-[#2d4653]'}`}
                      data-testid={`button-wedding-${w.id}`}
                    >
                      <div className="flex items-start gap-3">
                        <span
                          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[9px] font-semibold ${isActive ? 'bg-[#c8aa70] text-[#263b48]' : 'bg-[#4b6169] text-[#d7ded8]'}`}
                        >
                          {initials}
                        </span>
                        <span className="min-w-0">
                          <span className="block truncate text-[12px] font-semibold text-[#f4eee5]">
                            {w.names}
                          </span>
                          <span className="mt-1 block text-[10px] text-[#aeb8b6]">
                            {formatDateShort(w.weddingDate)}
                          </span>
                        </span>
                      </div>
                      {isActive && (
                        <span className="ml-11 mt-2 block truncate text-[10px] text-[#c3c9c2]">
                          {w.venue}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Add wedding button */}
            <button
              className="mt-5 flex items-center gap-2 px-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#c8aa70] hover:text-[#e0c997]"
              onClick={() => setCreateOpen(true)}
              data-testid="button-add-wedding"
            >
              <Plus size={14} /> Ajouter un mariage
            </button>

            {/* User menu */}
            <div className="mt-auto border-t border-[#415560] pt-5">
              <button
                className="flex w-full items-center gap-3 rounded-sm px-3 py-3 text-left hover:bg-[#2d4653]"
                data-testid="button-user-menu"
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#d6c6af] text-[10px] font-bold text-[#263b48]">
                  EC
                </span>
                <span className="flex-1">
                  <span className="block text-[12px] font-semibold">Élise Caron</span>
                  <span className="block text-[10px] text-[#aeb8b6]">Directrice artistique</span>
                </span>
                <ChevronDown size={14} className="text-[#aeb8b6]" />
              </button>
            </div>
          </div>
        </aside>

        {/* Mobile overlay */}
        {mobileOpen && (
          <button
            aria-label="Fermer le menu"
            className="fixed inset-0 z-20 bg-[#172a34]/40 md:hidden"
            onClick={() => setMobileOpen(false)}
          />
        )}

        {/* Main content */}
        <main className="min-w-0 flex-1">
          {/* Header */}
          <header className="flex h-[79px] items-center justify-between border-b border-[#ddd3c6] bg-[#f8f5ef] px-5 sm:px-9 lg:px-12">
            <div className="flex items-center gap-4">
              <button className="md:hidden" onClick={() => setMobileOpen(true)} data-testid="button-open-sidebar">
                <Menu size={20} />
              </button>
              <div>
                <p className="text-[10px] uppercase tracking-[0.2em] text-[#8d8981]">
                  {new Date().toLocaleDateString('fr-FR', {
                    weekday: 'long',
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  })}
                </p>
                <p className="mt-1 text-[12px] font-medium text-[#52616a]">Bonjour, Élise</p>
              </div>
            </div>
            <div className="flex items-center gap-5">
              <button className="hidden text-[#718087] sm:block" data-testid="button-search">
                <Search size={18} />
              </button>
              <button className="relative text-[#718087]" data-testid="button-notifications">
                <Bell size={18} />
                <span className="absolute -right-1 -top-1 h-1.5 w-1.5 rounded-full bg-[#b48c4c]" />
              </button>
              <div className="hidden h-6 w-px bg-[#ddd3c6] sm:block" />
              <button
                className="flex items-center gap-2 text-[11px] font-semibold text-[#52616a]"
                onClick={() => setMenuOpen(!menuOpen)}
                data-testid="button-header-menu"
              >
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#d6c6af] text-[9px] text-[#263b48]">
                  EC
                </span>
                <span className="hidden lg:block">Élise Caron</span>
                <ChevronDown size={14} />
              </button>
              {menuOpen && (
                <div className="absolute right-8 top-16 z-10 w-40 border border-[#ded4c8] bg-[#fffdf9] p-2 shadow-lg">
                  <button className="flex w-full gap-2 p-2 text-left text-xs hover:bg-[#f5f1eb]" data-testid="button-settings">
                    <Settings size={14} /> Paramètres
                  </button>
                </div>
              )}
            </div>
          </header>

          {/* Navigation tabs */}
          <div className="border-b border-[#ddd3c6] bg-[#f8f5ef] px-5 pt-8 sm:px-9 lg:px-12">
            <div className="flex gap-7 overflow-x-auto">
              {navItems.map(({ label, icon: Icon, path }) => {
                const isActive = location === path;
                return (
                  <Link
                    key={path}
                    href={path}
                    className={`flex shrink-0 items-center gap-2 border-b-2 pb-4 text-[11px] font-semibold ${isActive ? 'border-[#b28c55] text-[#263b48]' : 'border-transparent text-[#92918b] hover:text-[#52616a]'}`}
                    data-testid={`nav-${label.toLowerCase()}`}
                  >
                    <Icon size={14} strokeWidth={1.6} />
                    {label}
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Page content */}
          <div className="mx-auto max-w-[1390px] px-5 py-9 sm:px-9 lg:px-12 lg:py-12">
            {/* Empty state when no weddings at all */}
            {!isLoading && weddings.length === 0 ? (
              <div className="flex min-h-[50vh] flex-col items-center justify-center gap-6 text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#f0e8da]">
                  <Heart size={28} className="text-[#c8aa70]" />
                </div>
                <div>
                  <h2 className="font-serif text-[32px] text-[#263b48]">Bienvenue dans votre studio</h2>
                  <p className="mt-2 text-[13px] text-[#758087]">
                    Commencez par créer votre premier dossier de mariage.
                  </p>
                </div>
                <button
                  className="flex items-center gap-2 bg-[#263b48] px-6 py-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#f8f3ea] hover:bg-[#344f5c]"
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
        </main>
      </div>
    </div>
  );
}
