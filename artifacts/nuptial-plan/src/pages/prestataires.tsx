import { useState } from 'react';
import { Plus, CircleEllipsis, Users, Tag } from 'lucide-react';
import { PageTour } from '@/components/ui/page-tour';
import { PremiumBadge } from '@/components/premium-badge';
import { PremiumPageGate, usePremiumStatus } from '@/components/premium-page-gate';
import { FileAttachments } from '@/components/file-attachments';
import { useActiveWedding } from '@/lib/wedding-context';
import {
  useListVendors,
  useCreateVendor,
  useUpdateVendor,
  useDeleteVendor,
  getListVendorsQueryKey,
  useListWeddings,
  useListAddressBookEntries,
  useAddAddressBookEntryToWedding,
} from '@workspace/api-client-react';
import { formatCurrency } from '@/lib/format';
import { useQueryClient } from '@tanstack/react-query';
import { VendorInputStatus } from '@workspace/api-client-react';
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
import { useLanguage } from '@/lib/i18n';

const vendorSchema = z.object({
  name: z.string().min(1, 'Le nom est requis'),
  category: z.string().min(1, 'La catégorie est requise'),
  status: z.enum(['confirmed', 'awaiting_contract', 'deposit_paid', 'cancelled']),
  totalAmountCents: z.number().min(0),
  depositAmountCents: z.number().min(0).optional(),
  contactName: z.string().optional(),
  contactEmail: z.string().email('Email invalide').optional().or(z.literal('')),
  notes: z.string().optional(),
});

type VendorFormData = z.infer<typeof vendorSchema>;

export default function Prestataires() {
  const { language } = useLanguage();
  const tr = (fr: string, en: string) => language === 'fr' ? fr : en;
  const { isPremium, loading: premiumLoading } = usePremiumStatus();
  const { activeWeddingId } = useActiveWedding();
  const { data: weddings = [] } = useListWeddings();
  const activeWedding = weddings.find((w) => w.id === activeWeddingId);
  const currency = activeWedding?.currency ?? 'EUR';
  const currencySymbol = ({ EUR: '€', GBP: '£', USD: '$', CHF: 'CHF' } as Record<string, string>)[activeWedding?.currency ?? 'EUR'] ?? activeWedding?.currency ?? '€';
  const { data: vendors = [], isLoading } = useListVendors(activeWeddingId!);
  const { data: addressBookEntries = [] } = useListAddressBookEntries();
  const [open, setOpen] = useState(false);
  const [editingVendor, setEditingVendor] = useState<number | null>(null);
  const [addressBookOpen, setAddressBookOpen] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const createVendor = useCreateVendor();
  const updateVendor = useUpdateVendor();
  const deleteVendor = useDeleteVendor();
  const addAddressBookEntry = useAddAddressBookEntryToWedding();

  const form = useForm<VendorFormData>({
    resolver: zodResolver(vendorSchema),
    defaultValues: {
      name: '',
      category: '',
      status: 'confirmed',
      totalAmountCents: 0,
      depositAmountCents: 0,
      contactName: '',
      contactEmail: '',
      notes: '',
    },
  });

  const onSubmit = (data: VendorFormData) => {
    if (!activeWeddingId) return;

    if (editingVendor) {
      updateVendor.mutate(
        { weddingId: activeWeddingId, id: editingVendor, data },
        {
          onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: getListVendorsQueryKey(activeWeddingId) });
            toast({ title: tr('Prestataire mis à jour', 'Vendor updated') });
            setOpen(false);
            setEditingVendor(null);
            form.reset();
          },
        }
      );
    } else {
      createVendor.mutate(
        { weddingId: activeWeddingId, data },
        {
          onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: getListVendorsQueryKey(activeWeddingId) });
            toast({ title: tr('Prestataire ajouté', 'Vendor added') });
            setOpen(false);
            form.reset();
          },
        }
      );
    }
  };

  const importAddressBookEntry = (addressBookId: number) => {
    if (!activeWeddingId) return;
    addAddressBookEntry.mutate(
      { weddingId: activeWeddingId, addressBookId },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListVendorsQueryKey(activeWeddingId) });
          toast({ title: tr('Prestataire ajouté', 'Vendor added'), description: tr('La fiche du carnet a été ajoutée à ce mariage.', 'The address book entry was added to this wedding.') });
          setAddressBookOpen(false);
          setOpen(false);
        },
        onError: () => toast({
          title: tr('Erreur', 'Error'),
          description: tr('Impossible d’ajouter ce prestataire au mariage.', 'This vendor could not be added to the wedding.'),
          variant: 'destructive',
        }),
      },
    );
  };

  const handleEdit = (vendor: any) => {
    setEditingVendor(vendor.id);
    form.reset({
      name: vendor.name,
      category: vendor.category,
      status: vendor.status,
      totalAmountCents: vendor.totalAmountCents,
      depositAmountCents: vendor.depositAmountCents || 0,
      contactName: vendor.contactName || '',
      contactEmail: vendor.contactEmail || '',
      notes: vendor.notes || '',
    });
    setOpen(true);
  };

  const handleDelete = (id: number) => {
    if (!activeWeddingId) return;
    if (confirm(tr('Supprimer ce prestataire ?', 'Delete this vendor?'))) {
      deleteVendor.mutate(
        { weddingId: activeWeddingId, id },
        {
          onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: getListVendorsQueryKey(activeWeddingId) });
            toast({ title: tr('Prestataire supprimé', 'Vendor deleted') });
          },
        }
      );
    }
  };

  const vendorStatusMap: Record<string, string> = {
    confirmed: 'Confirmé',
    awaiting_contract: 'Contrat en attente',
    deposit_paid: 'Acompte versé',
    cancelled: 'Annulé',
  };

  const vendorColorMap: Record<string, string> = {
    confirmed: 'badge-confirmed',
    awaiting_contract: 'badge-pending',
    deposit_paid: 'badge-deposit',
    cancelled: 'badge-cancelled',
  };

  const vendorAvatarMap: Record<string, string> = {
    confirmed: 'from-[rgba(100,144,100,0.25)] to-[rgba(100,144,100,0.10)]',
    awaiting_contract: 'from-[rgba(200,169,110,0.28)] to-[rgba(200,169,110,0.10)]',
    deposit_paid: 'from-[rgba(180,120,180,0.25)] to-[rgba(180,120,180,0.10)]',
    cancelled: 'from-[rgba(204,140,148,0.25)] to-[rgba(204,140,148,0.10)]',
  };

  if (!activeWeddingId || isLoading) {
    return <div className="text-center font-serif text-2xl text-muted-foreground">{tr('Chargement…', 'Loading…')}</div>;
  }

  if (!premiumLoading && !isPremium) return <PremiumPageGate featureLabel="votre carnet de prestataires" />;
  return (
    <div>
      <PageTour
        tourKey="prestataires"
        pageTitle={tr('Prestataires', 'Vendors')}
        pageIcon={Users}
        steps={[
          { icon: Users, title: 'Votre équipe', body: 'Tous vos prestataires sont listés ici par catégorie — Traiteur, Fleuriste, Photographe… Filtrez la liste via la barre de catégories.' },
          { icon: Plus, title: 'Ajouter un prestataire', body: 'Cliquez sur « Ajouter un prestataire » pour renseigner le nom, la catégorie, le contact et le montant du devis.' },
          { icon: Tag, title: 'Statuts', body: 'Chaque prestataire a un statut : Contacté, En discussion, Confirmé ou Annulé. Mettez-le à jour au fil de vos échanges.' },
          { icon: CircleEllipsis, title: 'Modifier ou supprimer', body: 'Cliquez sur l\'icône ⋯ à droite d\'un prestataire pour modifier sa fiche, changer son statut ou le retirer de la liste.' },
        ]}
      />
      <div className="relative mb-8 overflow-hidden rounded-2xl hero-gradient-vivid px-8 py-7 ring-1 ring-white/60"
        style={{ boxShadow: '0 4px 24px rgba(93,45,93,0.08), inset 0 1px 0 rgba(255,255,255,0.85)' }}>
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/80 to-transparent" />
        <div className="flex items-end justify-between">
          <div>
            <p className="eyebrow mb-2 text-[#a8893e]">{tr('Votre équipe', 'Your team')}</p>
            <div className="flex items-center gap-3">
              <h1 className="font-serif text-[43px] leading-[0.9] text-foreground">{tr('Prestataires', 'Vendors')}</h1>
              <PremiumBadge />
            </div>
          </div>
        <Sheet open={open} onOpenChange={(o) => {
          setOpen(o);
          if (!o) {
            setEditingVendor(null);
            form.reset();
          }
        }}>
          <SheetTrigger asChild>
            <Button size="default" className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.12em]" data-testid="button-add-vendor">
              <Plus size={14} /> {tr('Ajouter un prestataire', 'Add a vendor')}
            </Button>
          </SheetTrigger>
          <SheetContent className="overflow-y-auto">
            <SheetHeader>
              <SheetTitle className="font-serif text-2xl">
                {editingVendor ? tr('Modifier le prestataire', 'Edit vendor') : tr('Nouveau prestataire', 'New vendor')}
              </SheetTitle>
              <SheetDescription>
                {editingVendor ? tr('Mettez à jour les informations', 'Update the information') : tr('Ajoutez un nouveau prestataire à votre équipe', 'Add a new vendor to your team')}
              </SheetDescription>
            </SheetHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="mt-6 space-y-4">
                 {!editingVendor && (
                   <div className="rounded-xl border border-primary/20 bg-primary/[0.04] p-3">
                     <button
                       type="button"
                       onClick={() => setAddressBookOpen((open) => !open)}
                       className="flex w-full items-center justify-between gap-3 text-left"
                       data-testid="button-import-vendor-from-address-book"
                     >
                       <span>
                         <span className="block text-[11px] font-semibold text-primary">Importer du carnet d’adresses</span>
                         <span className="mt-1 block text-[10px] text-muted-foreground">Ajoutez un prestataire enregistré sans ressaisir ses coordonnées.</span>
                       </span>
                       <span className="text-primary">{addressBookOpen ? '⌃' : '⌄'}</span>
                     </button>
                     {addressBookOpen && (
                       <div className="mt-3 max-h-52 space-y-1 overflow-y-auto border-t border-border/50 pt-2">
                         {addressBookEntries.length === 0 ? (
                           <p className="py-3 text-center text-[10px] text-muted-foreground">Votre carnet d’adresses est encore vide.</p>
                         ) : (
                           addressBookEntries.map((entry) => (
                             <button
                               key={entry.id}
                               type="button"
                               onClick={() => importAddressBookEntry(entry.id)}
                               disabled={addAddressBookEntry.isPending}
                               className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left transition hover:bg-primary/5 disabled:opacity-60"
                               data-testid={`button-import-vendor-address-book-${entry.id}`}
                             >
                               <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[rgba(200,169,110,0.22)] font-serif text-xs text-primary">
                                 {entry.name.split(/\s+/).map((word) => word[0]).join('').slice(0, 2).toUpperCase()}
                               </span>
                               <span className="min-w-0 flex-1">
                                 <span className="block truncate text-[11px] font-semibold text-foreground">{entry.name}</span>
                                 <span className="block truncate text-[10px] text-muted-foreground">
                                   {entry.category}{entry.contactName ? ` · ${entry.contactName}` : ''}
                                 </span>
                               </span>
                               <Plus size={14} className="shrink-0 text-primary" />
                             </button>
                           ))
                         )}
                       </div>
                     )}
                   </div>
                 )}
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{tr('Nom du prestataire', 'Vendor name')}</FormLabel>
                      <FormControl>
                        <Input {...field} data-testid="input-vendor-name" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{tr('Catégorie', 'Category')}</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder={tr('Ex : Fleurs et décoration', 'E.g. Florals & styling')} data-testid="input-vendor-category" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{tr('Statut', 'Status')}</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-vendor-status">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="confirmed">{tr('Confirmé', 'Confirmed')}</SelectItem>
                          <SelectItem value="awaiting_contract">{tr('Contrat en attente', 'Contract pending')}</SelectItem>
                          <SelectItem value="deposit_paid">{tr('Acompte versé', 'Deposit paid')}</SelectItem>
                          <SelectItem value="cancelled">{tr('Annulé', 'Cancelled')}</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="totalAmountCents"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{tr('Montant total', 'Total amount')} ({currencySymbol})</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          {...field}
                          onChange={(e) => field.onChange(Number(e.target.value) * 100)}
                          value={field.value / 100}
                          data-testid="input-vendor-total"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="depositAmountCents"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{tr('Acompte', 'Deposit')} ({currencySymbol})</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          {...field}
                          onChange={(e) => field.onChange(Number(e.target.value) * 100)}
                          value={(field.value || 0) / 100}
                          data-testid="input-vendor-deposit"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="contactName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{tr('Contact', 'Contact')}</FormLabel>
                      <FormControl>
                        <Input {...field} data-testid="input-vendor-contact" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="contactEmail"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{tr('E-mail', 'Email')}</FormLabel>
                      <FormControl>
                        <Input type="email" {...field} data-testid="input-vendor-email" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{tr('Notes', 'Notes')}</FormLabel>
                      <FormControl>
                        <Textarea {...field} rows={3} data-testid="input-vendor-notes" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="flex gap-2 pt-4">
                  <Button type="submit" className="flex-1" data-testid="button-save-vendor">
                    {editingVendor ? tr('Mettre à jour', 'Update') : tr('Ajouter', 'Add')}
                  </Button>
                  {editingVendor && (
                    <Button
                      type="button"
                      variant="destructive"
                      onClick={() => handleDelete(editingVendor)}
                      data-testid="button-delete-vendor"
                    >
                      {tr('Supprimer', 'Delete')}
                    </Button>
                  )}
                </div>
              </form>
            </Form>
            {editingVendor && activeWeddingId && (
              <FileAttachments
                weddingId={activeWeddingId}
                entityType="vendor"
                entityId={editingVendor}
                label="Pièces jointes"
              />
            )}
          </SheetContent>
        </Sheet>
        </div>
      </div>

      <div className="card-depth overflow-hidden">
        {vendors.length === 0 ? (
          <div className="px-6 py-12 text-center text-[11px] text-[#858b89]">
            {tr('Aucun prestataire. Cliquez sur "Ajouter un prestataire" pour commencer.', 'No vendors. Click “Add a vendor” to get started.')}
          </div>
        ) : (
          vendors.map((vendor) => {
            const initials = vendor.name
              .split(' ')
              .map((w) => w[0])
              .join('')
              .toUpperCase()
              .slice(0, 2);

            return (
              <div
                key={vendor.id}
                className="flex items-center gap-3 border-b border-[#e3dbd0] px-4 py-4 last:border-0 sm:px-5"
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-[rgba(200,169,110,0.25)] to-[rgba(200,169,110,0.08)] font-serif text-[14px] text-muted-foreground">
                  {initials}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[12px] font-semibold text-[#3d4d55]">{vendor.name}</p>
                  <p className="mt-1 text-[10px] text-[#858b89]">{vendor.category}</p>
                </div>
                <span
                  className={`hidden rounded-full px-2.5 py-1 text-[9px] font-semibold sm:block ${vendorColorMap[vendor.status] || 'badge-pending'}`}
                >
                  {language === 'fr' ? (vendorStatusMap[vendor.status] || vendor.status) : ({ confirmed: 'Confirmed', awaiting_contract: 'Contract pending', deposit_paid: 'Deposit paid', cancelled: 'Cancelled' }[vendor.status] || vendor.status)}
                </span>
                <span className="w-[72px] text-right font-serif text-[18px] text-muted-foreground">
                  {formatCurrency(vendor.totalAmountCents, currency)}
                </span>
                <button className="text-[#a5a19a]" onClick={() => handleEdit(vendor)} data-testid={`button-edit-vendor-${vendor.id}`}>
                  <CircleEllipsis size={17} />
                </button>
              </div>
            );
          })
        )}
      </div>

      {vendors.length > 0 && (
        <div className="mt-6 flex justify-between border-t border-border pt-6">
          <p className="text-[11px] font-semibold text-[#8c8b86]">
            {vendors.length} {tr(vendors.length > 1 ? 'prestataires' : 'prestataire', vendors.length > 1 ? 'vendors' : 'vendor')}
          </p>
          <p className="font-serif text-[22px] text-foreground">
            {tr('Total :', 'Total:')} {formatCurrency(vendors.reduce((sum, v) => sum + v.totalAmountCents, 0), currency)}
          </p>
        </div>
      )}
    </div>
  );
}
