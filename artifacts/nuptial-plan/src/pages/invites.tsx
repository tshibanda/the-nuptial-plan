import { useRef, useState } from 'react';
import * as XLSX from 'xlsx';
import { Plus, UserCircle2, Users, CheckSquare, FileUp, AlertTriangle, Search, Link2 } from 'lucide-react';
import { PageTour } from '@/components/ui/page-tour';
import { useActiveWedding } from '@/lib/wedding-context';
import {
  useListGuests,
  useGetGuestStats,
  useCreateGuest,
  useUpdateGuest,
  useDeleteGuest,
  useImportGuests,
  getListGuestsQueryKey,
  getGetGuestStatsQueryKey,
} from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useToast } from '@/hooks/use-toast';

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
  nom: 'name', name: 'name', 'nom complet': 'name', prénom: 'name', prenom: 'name',
  email: 'email', 'e-mail': 'email', mail: 'email', courriel: 'email',
  table: 'tableNumber', 'numéro de table': 'tableNumber', 'numero de table': 'tableNumber', 'table number': 'tableNumber', 'n° table': 'tableNumber',
  régime: 'dietaryRequirements', 'régime alimentaire': 'dietaryRequirements', regime: 'dietaryRequirements', dietary: 'dietaryRequirements', 'dietary requirements': 'dietaryRequirements', restrictions: 'dietaryRequirements',
  rsvp: 'rsvpStatus', statut: 'rsvpStatus', status: 'rsvpStatus', 'statut rsvp': 'rsvpStatus',
  notes: 'notes', note: 'notes', commentaire: 'notes', commentaires: 'notes',
};

const RSVP_MAP: Record<string, RsvpStatus> = {
  confirmé: 'confirmed', confirmed: 'confirmed', oui: 'confirmed', yes: 'confirmed',
  décliné: 'declined', declined: 'declined', non: 'declined', no: 'declined',
  'en attente': 'pending', pending: 'pending', attente: 'pending',
};

function normalizeStr(s: string) {
  return s.toLowerCase().trim().normalize('NFD').replace(/\p{Diacritic}/gu, '').replace(/[_\-]/g, ' ');
}

function parseRows(data: unknown[][]): { guests: ParsedGuest[]; skipped: number } {
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

function parseExcelFile(file: File): Promise<{ guests: ParsedGuest[]; skipped: number }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const wb = XLSX.read(e.target?.result, { type: 'binary' });
        const ws = wb.Sheets[wb.SheetNames[0]!];
        const data = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, defval: '' });
        resolve(parseRows(data));
      } catch {
        reject(new Error('Fichier invalide'));
      }
    };
    reader.onerror = () => reject(new Error('Erreur de lecture'));
    reader.readAsBinaryString(file);
  });
}

// ── Guest form schema ──────────────────────────────────────────────────────────
const guestSchema = z.object({
  name: z.string().min(1, 'Le nom est requis'),
  email: z.string().email('Email invalide').optional().or(z.literal('')),
  tableNumber: z.string().optional(),
  dietaryRequirements: z.string().optional(),
  rsvpStatus: z.enum(['confirmed', 'pending', 'declined']),
  notes: z.string().optional(),
});
type GuestFormData = z.infer<typeof guestSchema>;

const RSVP_LABEL: Record<string, string> = { confirmed: 'Confirmé', pending: 'En attente', declined: 'Décliné' };
const RSVP_COLOR: Record<string, string> = { confirmed: 'badge-confirmed', pending: 'badge-pending', declined: 'badge-cancelled' };

// ── Component ──────────────────────────────────────────────────────────────────
export default function Invites() {
  const { activeWeddingId } = useActiveWedding();
  const { data: guests = [], isLoading } = useListGuests(activeWeddingId!);
  const { data: stats } = useGetGuestStats(activeWeddingId!);
  const [open, setOpen] = useState(false);
  const [editingGuest, setEditingGuest] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Import state
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [importGuests_, setImportGuests_] = useState<ParsedGuest[]>([]);
  const [importSkipped, setImportSkipped] = useState(0);
  const [importLoading, setImportLoading] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);

  const createGuest = useCreateGuest();
  const updateGuest = useUpdateGuest();
  const deleteGuest = useDeleteGuest();
  const importGuestsMutation = useImportGuests();

  const form = useForm<GuestFormData>({
    resolver: zodResolver(guestSchema),
    defaultValues: { name: '', email: '', tableNumber: '', dietaryRequirements: '', rsvpStatus: 'pending', notes: '' },
  });

  const onSubmit = (data: GuestFormData) => {
    if (!activeWeddingId) return;
    if (editingGuest) {
      updateGuest.mutate({ weddingId: activeWeddingId, id: editingGuest, data }, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListGuestsQueryKey(activeWeddingId) });
          queryClient.invalidateQueries({ queryKey: getGetGuestStatsQueryKey(activeWeddingId) });
          toast({ title: 'Invité mis à jour' });
          setOpen(false); setEditingGuest(null); form.reset();
        },
      });
    } else {
      createGuest.mutate({ weddingId: activeWeddingId, data }, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListGuestsQueryKey(activeWeddingId) });
          queryClient.invalidateQueries({ queryKey: getGetGuestStatsQueryKey(activeWeddingId) });
          toast({ title: 'Invité ajouté' });
          setOpen(false); form.reset();
        },
      });
    }
  };

  const handleEdit = (guest: (typeof guests)[number]) => {
    setEditingGuest(guest.id);
    form.reset({ name: guest.name, email: guest.email || '', tableNumber: guest.tableNumber || '', dietaryRequirements: guest.dietaryRequirements || '', rsvpStatus: guest.rsvpStatus as RsvpStatus, notes: guest.notes || '' });
    setOpen(true);
  };

  const handleDelete = (id: number) => {
    if (!activeWeddingId) return;
    if (confirm('Supprimer cet invité ?')) {
      deleteGuest.mutate({ weddingId: activeWeddingId, id }, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListGuestsQueryKey(activeWeddingId) });
          queryClient.invalidateQueries({ queryKey: getGetGuestStatsQueryKey(activeWeddingId) });
          toast({ title: 'Invité supprimé' });
        },
      });
    }
  };

  const copyRsvpLink = async (id: number) => {
    if (!activeWeddingId) return;
    const response = await fetch(`/api/weddings/${activeWeddingId}/guests/${id}/rsvp-link`, { method: 'POST' });
    if (!response.ok) { toast({ title: 'Impossible de créer le lien RSVP', variant: 'destructive' }); return; }
    const result = await response.json() as { url: string };
    await navigator.clipboard.writeText(`${window.location.origin}${result.url}`);
    toast({ title: 'Lien RSVP copié' });
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setParseError(null);
    try {
      const { guests: parsed, skipped } = await parseExcelFile(file);
      setImportGuests_(parsed);
      setImportSkipped(skipped);
      setImportOpen(true);
    } catch (err) {
      setParseError((err as Error).message);
    }
    e.target.value = '';
  };

  const handleImport = () => {
    if (!activeWeddingId || !importGuests_.length) return;
    setImportLoading(true);
    importGuestsMutation.mutate(
      { weddingId: activeWeddingId, data: { guests: importGuests_ } },
      {
        onSuccess: (result) => {
          queryClient.invalidateQueries({ queryKey: getListGuestsQueryKey(activeWeddingId) });
          queryClient.invalidateQueries({ queryKey: getGetGuestStatsQueryKey(activeWeddingId) });
          toast({ title: `${result.created} invité${result.created > 1 ? 's' : ''} importé${result.created > 1 ? 's' : ''}${result.skipped > 0 ? ` (${result.skipped} ignoré${result.skipped > 1 ? 's' : ''})` : ''}` });
          setImportOpen(false);
          setImportGuests_([]);
          setImportLoading(false);
        },
        onError: () => {
          toast({ title: "Erreur lors de l'import", variant: 'destructive' });
          setImportLoading(false);
        },
      }
    );
  };

  if (!activeWeddingId || isLoading) {
    return <div className="text-center font-serif text-2xl text-muted-foreground">Chargement...</div>;
  }

  const confirmedPct = stats ? Math.round((stats.confirmed / stats.total) * 100) : 0;
  const normalizedSearchQuery = normalizeStr(searchQuery);
  const filteredGuests = normalizedSearchQuery
    ? guests.filter((guest) => normalizeStr(guest.name).includes(normalizedSearchQuery))
    : guests;

  return (
    <div>
      <PageTour
        tourKey="invites"
        pageTitle="Invités"
        pageIcon={UserCircle2}
        steps={[
          { icon: UserCircle2, title: 'La liste des invités', body: 'Visualisez tous vos invités avec leur statut RSVP, leur numéro de table et leurs préférences alimentaires.' },
          { icon: Users, title: 'Statistiques RSVP', body: 'Le bandeau du haut affiche en temps réel le taux de confirmation, le nombre de confirmés et de déclinés.' },
          { icon: Plus, title: 'Ajouter un invité', body: "Cliquez sur « Ajouter un invité » pour renseigner le nom, le régime alimentaire, le numéro de table et le statut RSVP initial." },
          { icon: CheckSquare, title: 'Mettre à jour le RSVP', body: "Cliquez sur l'icône ⋯ à côté d'un invité pour modifier son statut — En attente, Confirmé ou Décliné." },
          { icon: FileUp, title: 'Importer depuis Excel', body: "Cliquez sur « Importer Excel » pour charger un fichier .xlsx ou .csv. L'app détecte automatiquement les colonnes Nom, Email, Table, RSVP…" },
        ]}
      />

      <div className="relative mb-8 overflow-hidden rounded-2xl hero-gradient-vivid px-8 py-7 ring-1 ring-white/60"
        style={{ boxShadow: '0 4px 24px rgba(93,45,93,0.08), inset 0 1px 0 rgba(255,255,255,0.85)' }}>
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/80 to-transparent" />
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="eyebrow mb-2 text-[#a8893e]">La liste</p>
            <h1 className="font-serif text-[43px] leading-[0.9] text-foreground">Invités</h1>
          </div>
          <div className="flex items-center gap-2">
            {/* Import button */}
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              className="hidden"
              onChange={handleFileChange}
            />
            <Button
              size="default"
              variant="outline"
              className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.12em]"
              onClick={() => fileInputRef.current?.click()}
            >
              <FileUp size={14} /> Importer Excel
            </Button>

            {/* Add guest sheet */}
            <Sheet open={open} onOpenChange={(o) => { setOpen(o); if (!o) { setEditingGuest(null); form.reset(); } }}>
              <SheetTrigger asChild>
                <Button size="default" className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.12em]" data-testid="button-add-guest">
                  <Plus size={14} /> Ajouter un invité
                </Button>
              </SheetTrigger>
              <SheetContent className="overflow-y-auto">
                <SheetHeader>
                  <SheetTitle className="font-serif text-2xl">
                    {editingGuest ? "Modifier l'invité" : 'Nouvel invité'}
                  </SheetTitle>
                  <SheetDescription>
                    {editingGuest ? 'Mettez à jour les informations' : 'Ajoutez un invité à la liste'}
                  </SheetDescription>
                </SheetHeader>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="mt-6 space-y-4">
                    <FormField control={form.control} name="name" render={({ field }) => (
                      <FormItem><FormLabel>Nom complet</FormLabel><FormControl><Input {...field} data-testid="input-guest-name" /></FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField control={form.control} name="email" render={({ field }) => (
                      <FormItem><FormLabel>Email</FormLabel><FormControl><Input type="email" {...field} data-testid="input-guest-email" /></FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField control={form.control} name="rsvpStatus" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Statut RSVP</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl><SelectTrigger data-testid="select-guest-status"><SelectValue /></SelectTrigger></FormControl>
                          <SelectContent>
                            <SelectItem value="pending">En attente</SelectItem>
                            <SelectItem value="confirmed">Confirmé</SelectItem>
                            <SelectItem value="declined">Décliné</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="tableNumber" render={({ field }) => (
                      <FormItem><FormLabel>Table</FormLabel><FormControl><Input {...field} placeholder="Ex: Table 5" data-testid="input-guest-table" /></FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField control={form.control} name="dietaryRequirements" render={({ field }) => (
                      <FormItem><FormLabel>Régime alimentaire</FormLabel><FormControl><Input {...field} placeholder="Ex: Végétarien" data-testid="input-guest-diet" /></FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField control={form.control} name="notes" render={({ field }) => (
                      <FormItem><FormLabel>Notes</FormLabel><FormControl><Textarea {...field} rows={3} data-testid="input-guest-notes" /></FormControl><FormMessage /></FormItem>
                    )} />
                    <div className="flex gap-2 pt-4">
                      <Button type="submit" className="flex-1" data-testid="button-save-guest">
                        {editingGuest ? 'Mettre à jour' : 'Ajouter'}
                      </Button>
                      {editingGuest && (
                        <Button type="button" variant="destructive" onClick={() => handleDelete(editingGuest)} data-testid="button-delete-guest">
                          Supprimer
                        </Button>
                      )}
                    </div>
                  </form>
                </Form>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>

      {/* Parse error banner */}
      {parseError && (
        <div className="mb-4 flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[12px] text-red-700">
          <AlertTriangle size={14} /> {parseError}
        </div>
      )}

      {/* RSVP Stats */}
      {stats && (
        <div className="mb-8 grid gap-4 sm:grid-cols-4">
          <div className="relative overflow-hidden rounded-2xl metric-plum p-5"><div className="absolute inset-x-0 top-0 h-px bg-white/80" /><p className="eyebrow mb-1 text-foreground/35">Total invités</p><p className="font-serif text-[32px] leading-none text-foreground">{stats.total}</p></div>
          <div className="relative overflow-hidden rounded-2xl metric-sage p-5"><div className="absolute inset-x-0 top-0 h-px bg-white/80" /><p className="eyebrow mb-1 text-foreground/35">Confirmés</p><p className="font-serif text-[32px] leading-none text-foreground">{stats.confirmed}</p><div className="mt-3 h-1 overflow-hidden rounded-full bg-secondary/20"><div className="h-full rounded-full bg-secondary transition-all" style={{ width: `${confirmedPct}%` }} /></div></div>
          <div className="relative overflow-hidden rounded-2xl metric-gold p-5"><div className="absolute inset-x-0 top-0 h-px bg-white/80" /><p className="eyebrow mb-1 text-foreground/35">En attente</p><p className="font-serif text-[32px] leading-none text-foreground">{stats.pending}</p></div>
          <div className="relative overflow-hidden rounded-2xl metric-rose p-5"><div className="absolute inset-x-0 top-0 h-px bg-white/80" /><p className="eyebrow mb-1 text-foreground/35">Déclinés</p><p className="font-serif text-[32px] leading-none text-foreground">{stats.declined}</p></div>
        </div>
      )}

      {/* Guests List */}
      <div className="card-depth overflow-hidden">
        <div className="border-b border-[#e3dbd0] bg-white/40 px-4 py-3 sm:px-5">
          <div className="relative max-w-md">
            <Search
              size={16}
              aria-hidden="true"
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#858b89]"
            />
            <Input
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Rechercher un invité par son nom"
              aria-label="Rechercher un invité par son nom"
              className="h-10 rounded-xl border-[#e3dbd0] bg-white pl-9 pr-3 text-sm"
              data-testid="input-search-guest"
            />
          </div>
        </div>
        {guests.length === 0 ? (
          <div className="px-6 py-12 text-center text-[11px] text-[#858b89]">
            Aucun invité. Cliquez sur "Ajouter un invité" pour commencer, ou importez un fichier Excel.
          </div>
        ) : filteredGuests.length === 0 ? (
          <div className="px-6 py-12 text-center text-[11px] text-[#858b89]">
            Aucun invité ne correspond à « {searchQuery} ».
          </div>
        ) : (
          filteredGuests.map((guest) => {
            const initials = guest.name.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2);
            return (
              <div key={guest.id} className="flex items-center gap-3 border-b border-[#e3dbd0] px-4 py-4 last:border-0 sm:px-5">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-[rgba(200,169,110,0.25)] to-[rgba(200,169,110,0.08)] font-serif text-[14px] text-muted-foreground">{initials}</span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[12px] font-semibold text-[#3d4d55]">{guest.name}</p>
                  <p className="mt-1 text-[10px] text-[#858b89]">{guest.tableNumber || '—'} · {guest.dietaryRequirements || '—'}</p>
                </div>
                <span className={`hidden rounded-full px-2.5 py-1 text-[9px] font-semibold sm:block ${RSVP_COLOR[guest.rsvpStatus] || 'badge-pending'}`}>
                  {RSVP_LABEL[guest.rsvpStatus] || guest.rsvpStatus}
                </span>
                <button className="text-[#a5a19a]" onClick={() => handleEdit(guest)} data-testid={`button-edit-guest-${guest.id}`}>
                  <UserCircle2 size={17} />
                </button>
                 <button className="text-[#a5a19a]" onClick={() => void copyRsvpLink(guest.id)} aria-label={`Copier le lien RSVP de ${guest.name}`} title="Copier le lien RSVP">
                   <Link2 size={16} />
                 </button>
              </div>
            );
          })
        )}
      </div>

      {/* ── Import preview dialog ── */}
      <Dialog open={importOpen} onOpenChange={setImportOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="font-serif text-2xl">Importer des invités</DialogTitle>
            <DialogDescription>
              {importGuests_.length} invité{importGuests_.length > 1 ? 's' : ''} détecté{importGuests_.length > 1 ? 's' : ''}
              {importSkipped > 0 && ` · ${importSkipped} ligne${importSkipped > 1 ? 's' : ''} ignorée${importSkipped > 1 ? 's' : ''} (nom manquant)`}
            </DialogDescription>
          </DialogHeader>

          <div className="max-h-80 overflow-y-auto rounded-xl border border-border">
            <table className="w-full text-[11px]">
              <thead className="sticky top-0 bg-muted">
                <tr>
                  <th className="px-3 py-2 text-left font-semibold text-muted-foreground">Nom</th>
                  <th className="px-3 py-2 text-left font-semibold text-muted-foreground">Email</th>
                  <th className="px-3 py-2 text-left font-semibold text-muted-foreground">Table</th>
                  <th className="px-3 py-2 text-left font-semibold text-muted-foreground">RSVP</th>
                  <th className="px-3 py-2 text-left font-semibold text-muted-foreground">Régime</th>
                </tr>
              </thead>
              <tbody>
                {importGuests_.map((g, i) => (
                  <tr key={i} className="border-t border-border">
                    <td className="px-3 py-2 font-medium text-foreground">{g.name}</td>
                    <td className="px-3 py-2 text-muted-foreground">{g.email || '—'}</td>
                    <td className="px-3 py-2 text-muted-foreground">{g.tableNumber || '—'}</td>
                    <td className="px-3 py-2">
                      <span className={`rounded-full px-2 py-0.5 text-[9px] font-semibold ${RSVP_COLOR[g.rsvpStatus]}`}>
                        {RSVP_LABEL[g.rsvpStatus]}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-muted-foreground">{g.dietaryRequirements || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setImportOpen(false)}>Annuler</Button>
            <Button onClick={handleImport} disabled={importLoading || !importGuests_.length}>
              {importLoading ? 'Import en cours…' : `Importer ${importGuests_.length} invité${importGuests_.length > 1 ? 's' : ''}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
