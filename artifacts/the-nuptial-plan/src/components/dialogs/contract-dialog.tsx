import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useCreateContract, useUpdateContract, useDeleteContract, getListContractsQueryKey, getGetWeddingDashboardQueryKey } from '@workspace/api-client-react';
import type { Contract, ContractInputStatus } from '@workspace/api-client-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';

interface ContractDialogProps {
  weddingId: number;
  contract?: Contract;
  children: React.ReactNode;
}

const statusOptions: ContractInputStatus[] = ['Signé', 'En attente', 'Partiel', 'Résilié'];

export function ContractDialog({ weddingId, contract, children }: ContractDialogProps) {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    vendorName: contract?.vendorName || '',
    status: (contract?.status || 'En attente') as ContractInputStatus,
    totalAmount: contract?.totalAmount?.toString() || '',
    depositAmount: contract?.depositAmount?.toString() || '',
    signedAt: contract?.signedAt ? contract.signedAt.split('T')[0] : '',
    notes: contract?.notes || '',
  });

  const createContract = useCreateContract();
  const updateContract = useUpdateContract();
  const deleteContract = useDeleteContract();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const data = {
      vendorName: formData.vendorName,
      status: formData.status,
      totalAmount: Number(formData.totalAmount),
      depositAmount: formData.depositAmount ? Number(formData.depositAmount) : undefined,
      signedAt: formData.signedAt || undefined,
      notes: formData.notes || undefined,
    };

    if (contract) {
      updateContract.mutate(
        { contractId: contract.id, data },
        {
          onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: getListContractsQueryKey(weddingId) });
            queryClient.invalidateQueries({ queryKey: getGetWeddingDashboardQueryKey(weddingId) });
            toast({ title: 'Contrat mis à jour' });
            setOpen(false);
          },
        }
      );
    } else {
      createContract.mutate(
        { weddingId, data },
        {
          onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: getListContractsQueryKey(weddingId) });
            queryClient.invalidateQueries({ queryKey: getGetWeddingDashboardQueryKey(weddingId) });
            toast({ title: 'Contrat ajouté' });
            setOpen(false);
          },
        }
      );
    }
  };

  const handleDelete = () => {
    if (!contract) return;
    if (!confirm('Supprimer ce contrat ?')) return;

    deleteContract.mutate(
      { contractId: contract.id },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListContractsQueryKey(weddingId) });
          queryClient.invalidateQueries({ queryKey: getGetWeddingDashboardQueryKey(weddingId) });
          toast({ title: 'Contrat supprimé' });
          setOpen(false);
        },
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">
            {contract ? 'Modifier le contrat' : 'Nouveau contrat'}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="vendorName">Prestataire *</Label>
            <Input
              id="vendorName"
              value={formData.vendorName}
              onChange={(e) => setFormData({ ...formData, vendorName: e.target.value })}
              required
              data-testid="input-contract-vendor"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="status">Statut</Label>
            <Select value={formData.status} onValueChange={(value) => setFormData({ ...formData, status: value as ContractInputStatus })}>
              <SelectTrigger id="status" data-testid="select-contract-status">
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
              <Label htmlFor="totalAmount">Montant total (€) *</Label>
              <Input
                id="totalAmount"
                type="number"
                step="0.01"
                value={formData.totalAmount}
                onChange={(e) => setFormData({ ...formData, totalAmount: e.target.value })}
                required
                data-testid="input-contract-total"
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
                data-testid="input-contract-deposit"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="signedAt">Date de signature</Label>
            <Input
              id="signedAt"
              type="date"
              value={formData.signedAt}
              onChange={(e) => setFormData({ ...formData, signedAt: e.target.value })}
              data-testid="input-contract-signedat"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={3}
              data-testid="input-contract-notes"
            />
          </div>

          <DialogFooter>
            <div className="flex items-center justify-between w-full">
              {contract && (
                <Button
                  type="button"
                  variant="destructive"
                  onClick={handleDelete}
                  disabled={deleteContract.isPending}
                  data-testid="button-delete-contract"
                >
                  Supprimer
                </Button>
              )}
              <div className="flex gap-2 ml-auto">
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                  Annuler
                </Button>
                <Button type="submit" disabled={createContract.isPending || updateContract.isPending} data-testid="button-submit-contract">
                  {contract ? 'Modifier' : 'Créer'}
                </Button>
              </div>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
