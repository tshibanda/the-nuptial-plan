import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import { useCreateWedding, useUpdateWedding, useDeleteWedding, getListWeddingsQueryKey, getGetDashboardOverviewQueryKey, getGetWeddingQueryKey } from '@workspace/api-client-react';
import type { Wedding } from '@workspace/api-client-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';

interface WeddingDialogProps {
  wedding?: Wedding;
  children: React.ReactNode;
}

export function WeddingDialog({ wedding, children }: WeddingDialogProps) {
  const [open, setOpen] = useState(false);
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    coupleName: wedding?.coupleName || '',
    partner1: wedding?.partner1 || '',
    partner2: wedding?.partner2 || '',
    weddingDate: wedding?.weddingDate ? wedding.weddingDate.split('T')[0] : '',
    venue: wedding?.venue || '',
    budgetTotal: wedding?.budgetTotal?.toString() || '',
    guestCountTarget: wedding?.guestCountTarget?.toString() || '',
    venueImageUrl: wedding?.venueImageUrl || '',
    notes: wedding?.notes || '',
  });

  const createWedding = useCreateWedding();
  const updateWedding = useUpdateWedding();
  const deleteWedding = useDeleteWedding();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const data = {
      coupleName: formData.coupleName,
      partner1: formData.partner1 || undefined,
      partner2: formData.partner2 || undefined,
      weddingDate: formData.weddingDate,
      venue: formData.venue,
      budgetTotal: Number(formData.budgetTotal),
      guestCountTarget: formData.guestCountTarget ? Number(formData.guestCountTarget) : undefined,
      venueImageUrl: formData.venueImageUrl || undefined,
      notes: formData.notes || undefined,
    };

    if (wedding) {
      updateWedding.mutate(
        { weddingId: wedding.id, data },
        {
          onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: getListWeddingsQueryKey() });
            queryClient.invalidateQueries({ queryKey: getGetDashboardOverviewQueryKey() });
            queryClient.invalidateQueries({ queryKey: getGetWeddingQueryKey(wedding.id) });
            toast({ title: 'Mariage mis à jour' });
            setOpen(false);
          },
        }
      );
    } else {
      createWedding.mutate(
        { data },
        {
          onSuccess: (newWedding) => {
            queryClient.invalidateQueries({ queryKey: getListWeddingsQueryKey() });
            queryClient.invalidateQueries({ queryKey: getGetDashboardOverviewQueryKey() });
            toast({ title: 'Mariage créé' });
            setOpen(false);
            setLocation(`/mariages/${newWedding.id}`);
          },
        }
      );
    }
  };

  const handleDelete = () => {
    if (!wedding) return;
    if (!confirm('Supprimer ce mariage ? Toutes les données associées seront perdues.')) return;

    deleteWedding.mutate(
      { weddingId: wedding.id },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListWeddingsQueryKey() });
          queryClient.invalidateQueries({ queryKey: getGetDashboardOverviewQueryKey() });
          toast({ title: 'Mariage supprimé' });
          setOpen(false);
          setLocation('/');
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
            {wedding ? 'Modifier le mariage' : 'Nouveau mariage'}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="coupleName">Nom du couple *</Label>
            <Input
              id="coupleName"
              value={formData.coupleName}
              onChange={(e) => setFormData({ ...formData, coupleName: e.target.value })}
              placeholder="Marie & Thomas Dupont"
              required
              data-testid="input-wedding-couplename"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="partner1">Partenaire 1</Label>
              <Input
                id="partner1"
                value={formData.partner1}
                onChange={(e) => setFormData({ ...formData, partner1: e.target.value })}
                data-testid="input-wedding-partner1"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="partner2">Partenaire 2</Label>
              <Input
                id="partner2"
                value={formData.partner2}
                onChange={(e) => setFormData({ ...formData, partner2: e.target.value })}
                data-testid="input-wedding-partner2"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="weddingDate">Date du mariage *</Label>
              <Input
                id="weddingDate"
                type="date"
                value={formData.weddingDate}
                onChange={(e) => setFormData({ ...formData, weddingDate: e.target.value })}
                required
                data-testid="input-wedding-date"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="venue">Lieu *</Label>
              <Input
                id="venue"
                value={formData.venue}
                onChange={(e) => setFormData({ ...formData, venue: e.target.value })}
                placeholder="Château de Versailles"
                required
                data-testid="input-wedding-venue"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="budgetTotal">Budget total (€) *</Label>
              <Input
                id="budgetTotal"
                type="number"
                step="0.01"
                value={formData.budgetTotal}
                onChange={(e) => setFormData({ ...formData, budgetTotal: e.target.value })}
                required
                data-testid="input-wedding-budget"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="guestCountTarget">Nombre d'invités cible</Label>
              <Input
                id="guestCountTarget"
                type="number"
                value={formData.guestCountTarget}
                onChange={(e) => setFormData({ ...formData, guestCountTarget: e.target.value })}
                data-testid="input-wedding-guestcount"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="venueImageUrl">URL de l'image du lieu</Label>
            <Input
              id="venueImageUrl"
              type="url"
              value={formData.venueImageUrl}
              onChange={(e) => setFormData({ ...formData, venueImageUrl: e.target.value })}
              placeholder="https://..."
              data-testid="input-wedding-image"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={4}
              data-testid="input-wedding-notes"
            />
          </div>

          <DialogFooter>
            <div className="flex items-center justify-between w-full">
              {wedding && (
                <Button
                  type="button"
                  variant="destructive"
                  onClick={handleDelete}
                  disabled={deleteWedding.isPending}
                  data-testid="button-delete-wedding"
                >
                  Supprimer
                </Button>
              )}
              <div className="flex gap-2 ml-auto">
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                  Annuler
                </Button>
                <Button type="submit" disabled={createWedding.isPending || updateWedding.isPending} data-testid="button-submit-wedding">
                  {wedding ? 'Modifier' : 'Créer'}
                </Button>
              </div>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
