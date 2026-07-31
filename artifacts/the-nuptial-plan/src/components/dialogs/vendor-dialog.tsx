import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useCreateVendor, useUpdateVendor, useDeleteVendor, getListVendorsQueryKey, getGetWeddingDashboardQueryKey } from '@workspace/api-client-react';
import type { Vendor, VendorInputStatus } from '@workspace/api-client-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';

interface VendorDialogProps {
  weddingId: number;
  vendor?: Vendor;
  children: React.ReactNode;
}

const statusOptions: VendorInputStatus[] = ['Confirmé', 'Contrat en attente', 'Acompte versé', 'Résilié'];

export function VendorDialog({ weddingId, vendor, children }: VendorDialogProps) {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    name: vendor?.name || '',
    category: vendor?.category || '',
    status: (vendor?.status || 'Contrat en attente') as VendorInputStatus,
    totalAmount: vendor?.totalAmount?.toString() || '',
    depositAmount: vendor?.depositAmount?.toString() || '',
    contactName: vendor?.contactName || '',
    contactEmail: vendor?.contactEmail || '',
    contactPhone: vendor?.contactPhone || '',
    notes: vendor?.notes || '',
  });

  const createVendor = useCreateVendor();
  const updateVendor = useUpdateVendor();
  const deleteVendor = useDeleteVendor();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const data = {
      name: formData.name,
      category: formData.category,
      status: formData.status,
      totalAmount: formData.totalAmount ? Number(formData.totalAmount) : undefined,
      depositAmount: formData.depositAmount ? Number(formData.depositAmount) : undefined,
      contactName: formData.contactName || undefined,
      contactEmail: formData.contactEmail || undefined,
      contactPhone: formData.contactPhone || undefined,
      notes: formData.notes || undefined,
    };

    if (vendor) {
      updateVendor.mutate(
        { vendorId: vendor.id, data },
        {
          onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: getListVendorsQueryKey(weddingId) });
            queryClient.invalidateQueries({ queryKey: getGetWeddingDashboardQueryKey(weddingId) });
            toast({ title: 'Prestataire mis à jour' });
            setOpen(false);
          },
        }
      );
    } else {
      createVendor.mutate(
        { weddingId, data },
        {
          onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: getListVendorsQueryKey(weddingId) });
            queryClient.invalidateQueries({ queryKey: getGetWeddingDashboardQueryKey(weddingId) });
            toast({ title: 'Prestataire ajouté' });
            setOpen(false);
          },
        }
      );
    }
  };

  const handleDelete = () => {
    if (!vendor) return;
    if (!confirm('Supprimer ce prestataire ?')) return;

    deleteVendor.mutate(
      { vendorId: vendor.id },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListVendorsQueryKey(weddingId) });
          queryClient.invalidateQueries({ queryKey: getGetWeddingDashboardQueryKey(weddingId) });
          toast({ title: 'Prestataire supprimé' });
          setOpen(false);
        },
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">
            {vendor ? 'Modifier le prestataire' : 'Nouveau prestataire'}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nom du prestataire *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
                data-testid="input-vendor-name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="category">Catégorie *</Label>
              <Input
                id="category"
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                placeholder="Traiteur, Fleuriste, DJ..."
                required
                data-testid="input-vendor-category"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="status">Statut</Label>
            <Select value={formData.status} onValueChange={(value) => setFormData({ ...formData, status: value as VendorInputStatus })}>
              <SelectTrigger id="status" data-testid="select-vendor-status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {statusOptions.map((status) => (
                  <SelectItem key={status} value={status}>
                    {status}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="totalAmount">Montant total (€)</Label>
              <Input
                id="totalAmount"
                type="number"
                step="0.01"
                value={formData.totalAmount}
                onChange={(e) => setFormData({ ...formData, totalAmount: e.target.value })}
                data-testid="input-vendor-total"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="depositAmount">Acompte (€)</Label>
              <Input
                id="depositAmount"
                type="number"
                step="0.01"
                value={formData.depositAmount}
                onChange={(e) => setFormData({ ...formData, depositAmount: e.target.value })}
                data-testid="input-vendor-deposit"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="contactName">Contact</Label>
              <Input
                id="contactName"
                value={formData.contactName}
                onChange={(e) => setFormData({ ...formData, contactName: e.target.value })}
                data-testid="input-vendor-contact-name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="contactEmail">Email</Label>
              <Input
                id="contactEmail"
                type="email"
                value={formData.contactEmail}
                onChange={(e) => setFormData({ ...formData, contactEmail: e.target.value })}
                data-testid="input-vendor-contact-email"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="contactPhone">Téléphone</Label>
              <Input
                id="contactPhone"
                type="tel"
                value={formData.contactPhone}
                onChange={(e) => setFormData({ ...formData, contactPhone: e.target.value })}
                data-testid="input-vendor-contact-phone"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={3}
              data-testid="input-vendor-notes"
            />
          </div>

          <DialogFooter>
            <div className="flex items-center justify-between w-full">
              {vendor && (
                <Button
                  type="button"
                  variant="destructive"
                  onClick={handleDelete}
                  disabled={deleteVendor.isPending}
                  data-testid="button-delete-vendor"
                >
                  Supprimer
                </Button>
              )}
              <div className="flex gap-2 ml-auto">
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                  Annuler
                </Button>
                <Button type="submit" disabled={createVendor.isPending || updateVendor.isPending} data-testid="button-submit-vendor">
                  {vendor ? 'Modifier' : 'Créer'}
                </Button>
              </div>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
