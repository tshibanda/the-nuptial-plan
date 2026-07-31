import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useCreateGuest, useUpdateGuest, useDeleteGuest, getListGuestsQueryKey, getGetWeddingDashboardQueryKey } from '@workspace/api-client-react';
import type { Guest, GuestInputRsvpStatus, GuestInputDietary } from '@workspace/api-client-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';

interface GuestDialogProps {
  weddingId: number;
  guest?: Guest;
  children: React.ReactNode;
}

const rsvpOptions: GuestInputRsvpStatus[] = ['Confirmé', 'En attente', 'Décliné'];
const dietaryOptions: GuestInputDietary[] = ['Végétarien', 'Vegan', 'Viande', 'Poisson', 'Sans gluten'];

export function GuestDialog({ weddingId, guest, children }: GuestDialogProps) {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    name: guest?.name || '',
    email: guest?.email || '',
    tableNumber: guest?.tableNumber || '',
    dietary: guest?.dietary || '',
    rsvpStatus: (guest?.rsvpStatus || 'En attente') as GuestInputRsvpStatus,
    plusOne: guest?.plusOne || false,
    notes: guest?.notes || '',
  });

  const createGuest = useCreateGuest();
  const updateGuest = useUpdateGuest();
  const deleteGuest = useDeleteGuest();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const data = {
      name: formData.name,
      email: formData.email || undefined,
      tableNumber: formData.tableNumber || undefined,
      dietary: formData.dietary ? (formData.dietary as GuestInputDietary) : undefined,
      rsvpStatus: formData.rsvpStatus,
      plusOne: formData.plusOne,
      notes: formData.notes || undefined,
    };

    if (guest) {
      updateGuest.mutate(
        { guestId: guest.id, data },
        {
          onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: getListGuestsQueryKey(weddingId) });
            queryClient.invalidateQueries({ queryKey: getGetWeddingDashboardQueryKey(weddingId) });
            toast({ title: 'Invité mis à jour' });
            setOpen(false);
          },
        }
      );
    } else {
      createGuest.mutate(
        { weddingId, data },
        {
          onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: getListGuestsQueryKey(weddingId) });
            queryClient.invalidateQueries({ queryKey: getGetWeddingDashboardQueryKey(weddingId) });
            toast({ title: 'Invité ajouté' });
            setOpen(false);
          },
        }
      );
    }
  };

  const handleDelete = () => {
    if (!guest) return;
    if (!confirm('Supprimer cet invité ?')) return;

    deleteGuest.mutate(
      { guestId: guest.id },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListGuestsQueryKey(weddingId) });
          queryClient.invalidateQueries({ queryKey: getGetWeddingDashboardQueryKey(weddingId) });
          toast({ title: 'Invité supprimé' });
          setOpen(false);
        },
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">
            {guest ? 'Modifier l\'invité' : 'Nouvel invité'}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="name">Nom complet *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
              data-testid="input-guest-name"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                data-testid="input-guest-email"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tableNumber">Numéro de table</Label>
              <Input
                id="tableNumber"
                value={formData.tableNumber}
                onChange={(e) => setFormData({ ...formData, tableNumber: e.target.value })}
                data-testid="input-guest-table"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="rsvpStatus">Statut RSVP</Label>
              <Select value={formData.rsvpStatus} onValueChange={(value) => setFormData({ ...formData, rsvpStatus: value as GuestInputRsvpStatus })}>
                <SelectTrigger id="rsvpStatus" data-testid="select-guest-rsvp">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {rsvpOptions.map((status) => (
                    <SelectItem key={status} value={status}>
                      {status}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="dietary">Régime alimentaire</Label>
              <Select value={formData.dietary} onValueChange={(value) => setFormData({ ...formData, dietary: value })}>
                <SelectTrigger id="dietary" data-testid="select-guest-dietary">
                  <SelectValue placeholder="Aucun" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Aucun</SelectItem>
                  {dietaryOptions.map((diet) => (
                    <SelectItem key={diet} value={diet}>
                      {diet}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="plusOne"
              checked={formData.plusOne}
              onCheckedChange={(checked) => setFormData({ ...formData, plusOne: checked === true })}
              data-testid="checkbox-guest-plusone"
            />
            <Label htmlFor="plusOne" className="cursor-pointer">
              Accompagnateur (+1)
            </Label>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={3}
              data-testid="input-guest-notes"
            />
          </div>

          <DialogFooter>
            <div className="flex items-center justify-between w-full">
              {guest && (
                <Button
                  type="button"
                  variant="destructive"
                  onClick={handleDelete}
                  disabled={deleteGuest.isPending}
                  data-testid="button-delete-guest"
                >
                  Supprimer
                </Button>
              )}
              <div className="flex gap-2 ml-auto">
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                  Annuler
                </Button>
                <Button type="submit" disabled={createGuest.isPending || updateGuest.isPending} data-testid="button-submit-guest">
                  {guest ? 'Modifier' : 'Créer'}
                </Button>
              </div>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
