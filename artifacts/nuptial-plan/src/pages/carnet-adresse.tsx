import { useMemo, useState } from 'react';
import { BookOpen, CircleEllipsis, Globe, Mail, Phone, Plus, Search, Sparkles, Trash2, Users } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  getListAddressBookEntriesQueryKey,
  getListVendorsQueryKey,
  useAddAddressBookEntryToWedding,
  useCreateAddressBookEntry,
  useDeleteAddressBookEntry,
  useListAddressBookEntries,
  useListWeddings,
  useUpdateAddressBookEntry,
} from '@workspace/api-client-react';
import { PageTour } from '@/components/ui/page-tour';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useActiveWedding } from '@/lib/wedding-context';
import { useToast } from '@/hooks/use-toast';

const entrySchema = z.object({
  name: z.string().min(1, 'Le nom est requis'),
  category: z.string().min(1, 'La catégorie est requise'),
  contactName: z.string().optional(),
  contactEmail: z.string().email('Email invalide').optional().or(z.literal('')),
  contactPhone: z.string().optional(),
  website: z.string().optional(),
  notes: z.string().optional(),
});
type EntryForm = z.infer<typeof entrySchema>;

const emptyValues: EntryForm = {
  name: '', category: '', contactName: '', contactEmail: '', contactPhone: '', website: '', notes: '',
};

export default function CarnetAdresse() {
  const { activeWeddingId } = useActiveWedding();
  const { data: entries = [], isLoading } = useListAddressBookEntries();
  const { data: weddings = [] } = useListWeddings();
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [search, setSearch] = useState('');
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const createEntry = useCreateAddressBookEntry();
  const updateEntry = useUpdateAddressBookEntry();
  const deleteEntry = useDeleteAddressBookEntry();
  const addToWedding = useAddAddressBookEntryToWedding();
  const form = useForm<EntryForm>({ resolver: zodResolver(entrySchema), defaultValues: emptyValues });

  const activeWedding = weddings.find((w) => w.id === activeWeddingId);
  const filteredEntries = useMemo(() => {
    const query = search.trim().toLocaleLowerCase();
    if (!query) return entries;
    return entries.filter((entry) =>
      [entry.name, entry.category, entry.contactName, entry.contactEmail]
        .filter(Boolean).join(' ').toLocaleLowerCase().includes(query),
    );
  }, [entries, search]);

  const closeSheet = () => {
    setOpen(false);
    setEditingId(null);
    form.reset(emptyValues);
  };

  const onSubmit = (data: EntryForm) => {
    const mutationOptions = {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListAddressBookEntriesQueryKey() });
        toast({ title: editingId ? 'Contact mis à jour' : 'Contact ajouté au carnet' });
        closeSheet();
      },
      onError: () => toast({ title: 'Erreur', description: 'Impossible d’enregistrer ce contact.', variant: 'destructive' as const }),
    };
    if (editingId) {
      updateEntry.mutate({ id: editingId, data }, mutationOptions);
    } else {
      createEntry.mutate({ data }, mutationOptions);
    }
  };

  const editEntry = (entry: (typeof entries)[number]) => {
    setEditingId(entry.id);
    form.reset({
      name: entry.name,
      category: entry.category,
      contactName: entry.contactName ?? '',
      contactEmail: entry.contactEmail ?? '',
      contactPhone: entry.contactPhone ?? '',
      website: entry.website ?? '',
      notes: entry.notes ?? '',
    });
    setOpen(true);
  };

  const removeEntry = (id: number) => {
    if (!confirm('Supprimer ce contact du carnet d’adresses ?')) return;
    deleteEntry.mutate({ id }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListAddressBookEntriesQueryKey() });
        toast({ title: 'Contact supprimé' });
      },
      onError: () => toast({ title: 'Erreur', description: 'Impossible de supprimer ce contact.', variant: 'destructive' }),
    });
  };

  const importEntry = (id: number) => {
    if (!activeWeddingId) return;
    addToWedding.mutate({ weddingId: activeWeddingId, addressBookId: id }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListVendorsQueryKey(activeWeddingId) });
        toast({ title: 'Prestataire ajouté', description: `La fiche a été ajoutée à ${activeWedding?.names ?? 'votre mariage'}.` });
      },
      onError: () => toast({ title: 'Erreur', description: 'Impossible d’ajouter ce prestataire au mariage.', variant: 'destructive' }),
    });
  };

  return (
    <div>
      <PageTour
        tourKey="carnet-adresse"
        pageTitle="Mon carnet d’adresses"
        pageIcon={BookOpen}
        steps={[
          { icon: BookOpen, title: 'Votre réseau', body: 'Conservez ici vos prestataires favoris indépendamment de vos mariages.' },
          { icon: Plus, title: 'Ajouter une fiche', body: 'Enregistrez les coordonnées et notes une seule fois pour les réutiliser.' },
          { icon: Sparkles, title: 'Réutiliser un contact', body: 'Ajoutez une fiche au mariage actif sans ressaisir ses informations.' },
        ]}
      />

      <div className="relative mb-8 overflow-hidden rounded-2xl hero-gradient-vivid px-8 py-7 ring-1 ring-white/60"
        style={{ boxShadow: '0 4px 24px rgba(93,45,93,0.08), inset 0 1px 0 rgba(255,255,255,0.85)' }}>
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/80 to-transparent" />
        <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="eyebrow mb-2 text-[#a8893e]">Votre réseau de confiance</p>
            <h1 className="font-serif text-[43px] leading-[0.9] text-foreground">Mon carnet d’adresses</h1>
            <p className="mt-3 max-w-xl text-[11px] leading-relaxed text-muted-foreground">
              Vos prestataires favoris, prêts à être ajoutés à n’importe quel mariage.
            </p>
          </div>
          <Button onClick={() => setOpen(true)} className="flex shrink-0 items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.12em]" data-testid="button-add-address-book-entry">
            <Plus size={14} /> Ajouter un contact
          </Button>
        </div>
      </div>

      <div className="mb-5 flex items-center gap-3 rounded-2xl border border-border/50 bg-card/60 px-4 py-3">
        <Search size={16} className="text-muted-foreground" />
        <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Rechercher un prestataire, une catégorie ou un contact…" className="border-0 bg-transparent p-0 text-[12px] shadow-none focus-visible:ring-0" data-testid="input-search-address-book" />
      </div>

      {isLoading ? (
        <div className="py-16 text-center font-serif text-2xl text-muted-foreground">Chargement…</div>
      ) : filteredEntries.length === 0 ? (
        <div className="card-depth flex flex-col items-center justify-center px-6 py-16 text-center">
          <BookOpen size={30} className="mb-4 text-primary/35" />
          <p className="font-serif text-2xl text-foreground">{entries.length ? 'Aucun contact trouvé' : 'Votre carnet est encore vide'}</p>
          <p className="mt-2 max-w-sm text-[11px] leading-relaxed text-muted-foreground">
            {entries.length ? 'Essayez une autre recherche.' : 'Ajoutez les prestataires avec lesquels vous aimez travailler pour les retrouver dans tous vos mariages.'}
          </p>
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {filteredEntries.map((entry) => (
            <div key={entry.id} className="card-depth group p-5 transition hover:-translate-y-0.5">
              <div className="flex items-start gap-4">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[rgba(200,169,110,0.28)] to-[rgba(200,169,110,0.08)] font-serif text-lg text-primary">
                  {entry.name.split(/\s+/).map((word) => word[0]).join('').slice(0, 2).toUpperCase()}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h2 className="truncate text-[13px] font-semibold text-foreground">{entry.name}</h2>
                      <p className="mt-1 text-[10px] uppercase tracking-[0.12em] text-primary/70">{entry.category}</p>
                    </div>
                    <button className="text-muted-foreground/60 transition hover:text-foreground" onClick={() => editEntry(entry)} aria-label={`Modifier ${entry.name}`} data-testid={`button-edit-address-book-${entry.id}`}>
                      <CircleEllipsis size={18} />
                    </button>
                  </div>
                  <div className="mt-4 space-y-1.5 text-[11px] text-muted-foreground">
                    {entry.contactName && <p className="flex items-center gap-2"><Users size={13} /> {entry.contactName}</p>}
                    {entry.contactEmail && <p className="flex items-center gap-2 truncate"><Mail size={13} /> {entry.contactEmail}</p>}
                    {entry.contactPhone && <p className="flex items-center gap-2"><Phone size={13} /> {entry.contactPhone}</p>}
                    {entry.website && <p className="flex items-center gap-2 truncate"><Globe size={13} /> {entry.website}</p>}
                  </div>
                  {entry.notes && <p className="mt-4 border-t border-border/40 pt-3 text-[10px] leading-relaxed text-muted-foreground/80">{entry.notes}</p>}
                </div>
              </div>
              <div className="mt-5 flex items-center justify-between border-t border-border/40 pt-4">
                <button onClick={() => removeEntry(entry.id)} className="flex items-center gap-1.5 text-[10px] text-destructive/70 hover:text-destructive" data-testid={`button-delete-address-book-${entry.id}`}>
                  <Trash2 size={12} /> Supprimer
                </button>
                {activeWeddingId ? (
                  <Button size="sm" variant="outline" onClick={() => importEntry(entry.id)} disabled={addToWedding.isPending} className="gap-2 text-[10px]" data-testid={`button-add-address-book-to-wedding-${entry.id}`}>
                    <Plus size={13} /> Ajouter à {activeWedding?.names ?? 'ce mariage'}
                  </Button>
                ) : (
                  <span className="text-[10px] italic text-muted-foreground/60">Sélectionnez un mariage pour l’ajouter</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <Sheet open={open} onOpenChange={(next) => next ? setOpen(true) : closeSheet()}>
        <SheetContent className="overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="font-serif text-2xl">{editingId ? 'Modifier le contact' : 'Nouveau contact favori'}</SheetTitle>
            <SheetDescription>Ces informations seront disponibles pour tous vos mariages.</SheetDescription>
          </SheetHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="mt-6 space-y-4">
              {([
                ['name', 'Nom du prestataire', 'Ex. Maison Lune'],
                ['category', 'Catégorie', 'Ex. Fleuriste'],
                ['contactName', 'Nom du contact', ''],
                ['contactEmail', 'Email', ''],
                ['contactPhone', 'Téléphone', ''],
                ['website', 'Site internet', 'https://…'],
              ] as const).map(([name, label, placeholder]) => (
                <FormField key={name} control={form.control} name={name} render={({ field }) => (
                  <FormItem>
                    <FormLabel>{label}</FormLabel>
                    <FormControl><Input {...field} placeholder={placeholder} data-testid={`input-address-book-${name}`} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              ))}
              <FormField control={form.control} name="notes" render={({ field }) => (
                <FormItem><FormLabel>Notes</FormLabel><FormControl><Textarea {...field} rows={4} placeholder="Vos repères, tarifs habituels, style…" data-testid="input-address-book-notes" /></FormControl><FormMessage /></FormItem>
              )} />
              <div className="flex gap-2 pt-3">
                <Button type="button" variant="outline" className="flex-1" onClick={closeSheet}>Annuler</Button>
                <Button type="submit" className="flex-1" disabled={createEntry.isPending || updateEntry.isPending} data-testid="button-save-address-book-entry">
                  {createEntry.isPending || updateEntry.isPending ? 'Enregistrement…' : editingId ? 'Enregistrer' : 'Ajouter au carnet'}
                </Button>
              </div>
            </form>
          </Form>
        </SheetContent>
      </Sheet>
    </div>
  );
}