import { useState } from 'react';
import { Plus, CircleEllipsis } from 'lucide-react';
import { FileAttachments } from '@/components/file-attachments';
import { useActiveWedding } from '@/lib/wedding-context';
import { useListVendors, useCreateVendor, useUpdateVendor, useDeleteVendor, getListVendorsQueryKey } from '@workspace/api-client-react';
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
  const { activeWeddingId } = useActiveWedding();
  const { data: vendors = [], isLoading } = useListVendors(activeWeddingId!);
  const [open, setOpen] = useState(false);
  const [editingVendor, setEditingVendor] = useState<number | null>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const createVendor = useCreateVendor();
  const updateVendor = useUpdateVendor();
  const deleteVendor = useDeleteVendor();

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
            toast({ title: 'Prestataire mis à jour' });
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
            toast({ title: 'Prestataire ajouté' });
            setOpen(false);
            form.reset();
          },
        }
      );
    }
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
    if (confirm('Supprimer ce prestataire ?')) {
      deleteVendor.mutate(
        { weddingId: activeWeddingId, id },
        {
          onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: getListVendorsQueryKey(activeWeddingId) });
            toast({ title: 'Prestataire supprimé' });
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
    confirmed: 'bg-[#dce8df] text-[#5d7968]',
    awaiting_contract: 'bg-[#f0e2cb] text-[#967346]',
    deposit_paid: 'bg-[#e7e0ee] text-[#76677e]',
    cancelled: 'bg-[#f0ddd9] text-[#9d5449]',
  };

  if (!activeWeddingId || isLoading) {
    return <div className="text-center font-serif text-2xl text-muted-foreground">Chargement...</div>;
  }

  return (
    <div>
      <div className="mb-8 flex items-end justify-between">
        <div>
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-[#9b8258]">
            Votre équipe
          </p>
          <h1 className="font-serif text-[43px] leading-[0.9] text-[#263b48]">Prestataires</h1>
        </div>
        <Sheet open={open} onOpenChange={(o) => {
          setOpen(o);
          if (!o) {
            setEditingVendor(null);
            form.reset();
          }
        }}>
          <SheetTrigger asChild>
            <Button className="flex items-center gap-2 bg-[#263b48] px-4 py-2.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#f8f3ea] hover:bg-[#344f5c]" data-testid="button-add-vendor">
              <Plus size={14} /> Ajouter un prestataire
            </Button>
          </SheetTrigger>
          <SheetContent className="overflow-y-auto">
            <SheetHeader>
              <SheetTitle className="font-serif text-2xl">
                {editingVendor ? 'Modifier le prestataire' : 'Nouveau prestataire'}
              </SheetTitle>
              <SheetDescription>
                {editingVendor ? 'Mettez à jour les informations' : 'Ajoutez un nouveau prestataire à votre équipe'}
              </SheetDescription>
            </SheetHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="mt-6 space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nom du prestataire</FormLabel>
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
                      <FormLabel>Catégorie</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Ex: Florals & styling" data-testid="input-vendor-category" />
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
                      <FormLabel>Statut</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-vendor-status">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="confirmed">Confirmé</SelectItem>
                          <SelectItem value="awaiting_contract">Contrat en attente</SelectItem>
                          <SelectItem value="deposit_paid">Acompte versé</SelectItem>
                          <SelectItem value="cancelled">Annulé</SelectItem>
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
                      <FormLabel>Montant total (£)</FormLabel>
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
                      <FormLabel>Acompte (£)</FormLabel>
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
                      <FormLabel>Contact</FormLabel>
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
                      <FormLabel>Email</FormLabel>
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
                      <FormLabel>Notes</FormLabel>
                      <FormControl>
                        <Textarea {...field} rows={3} data-testid="input-vendor-notes" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="flex gap-2 pt-4">
                  <Button type="submit" className="flex-1" data-testid="button-save-vendor">
                    {editingVendor ? 'Mettre à jour' : 'Ajouter'}
                  </Button>
                  {editingVendor && (
                    <Button
                      type="button"
                      variant="destructive"
                      onClick={() => handleDelete(editingVendor)}
                      data-testid="button-delete-vendor"
                    >
                      Supprimer
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

      <div className="overflow-hidden border-y border-[#ddd3c6] bg-[#f8f5ef]">
        {vendors.length === 0 ? (
          <div className="px-6 py-12 text-center text-[11px] text-[#858b89]">
            Aucun prestataire. Cliquez sur "Ajouter un prestataire" pour commencer.
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
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#e8ddd0] font-serif text-[14px] text-[#52616a]">
                  {initials}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[12px] font-semibold text-[#3d4d55]">{vendor.name}</p>
                  <p className="mt-1 text-[10px] text-[#858b89]">{vendor.category}</p>
                </div>
                <span
                  className={`hidden rounded-full px-2.5 py-1 text-[9px] font-semibold sm:block ${vendorColorMap[vendor.status] || 'bg-[#f0e2cb] text-[#967346]'}`}
                >
                  {vendorStatusMap[vendor.status] || vendor.status}
                </span>
                <span className="w-[72px] text-right font-serif text-[18px] text-[#52616a]">
                  {formatCurrency(vendor.totalAmountCents)}
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
        <div className="mt-6 flex justify-between border-t border-[#ddd3c6] pt-6">
          <p className="text-[11px] font-semibold text-[#8c8b86]">
            {vendors.length} prestataire{vendors.length > 1 ? 's' : ''}
          </p>
          <p className="font-serif text-[22px] text-[#263b48]">
            Total: {formatCurrency(vendors.reduce((sum, v) => sum + v.totalAmountCents, 0))}
          </p>
        </div>
      )}
    </div>
  );
}
