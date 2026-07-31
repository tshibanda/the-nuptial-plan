import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useCreatePayment, useUpdatePayment, useDeletePayment, getListPaymentsQueryKey, getGetWeddingDashboardQueryKey } from '@workspace/api-client-react';
import type { Payment, PaymentInputStatus } from '@workspace/api-client-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';

interface PaymentDialogProps {
  weddingId: number;
  payment?: Payment;
  children: React.ReactNode;
}

const statusOptions: PaymentInputStatus[] = ['Urgent', 'À régler', 'Programmé', 'Payé'];

export function PaymentDialog({ weddingId, payment, children }: PaymentDialogProps) {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    vendorName: payment?.vendorName || '',
    description: payment?.description || '',
    amount: payment?.amount?.toString() || '',
    dueDate: payment?.dueDate ? payment.dueDate.split('T')[0] : '',
    status: (payment?.status || 'À régler') as PaymentInputStatus,
    paidAt: payment?.paidAt ? payment.paidAt.split('T')[0] : '',
  });

  const createPayment = useCreatePayment();
  const updatePayment = useUpdatePayment();
  const deletePayment = useDeletePayment();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const data = {
      vendorName: formData.vendorName,
      description: formData.description,
      amount: Number(formData.amount),
      dueDate: formData.dueDate,
      status: formData.status,
      paidAt: formData.paidAt || undefined,
    };

    if (payment) {
      updatePayment.mutate(
        { paymentId: payment.id, data },
        {
          onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: getListPaymentsQueryKey(weddingId) });
            queryClient.invalidateQueries({ queryKey: getGetWeddingDashboardQueryKey(weddingId) });
            toast({ title: 'Paiement mis à jour' });
            setOpen(false);
          },
        }
      );
    } else {
      createPayment.mutate(
        { weddingId, data },
        {
          onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: getListPaymentsQueryKey(weddingId) });
            queryClient.invalidateQueries({ queryKey: getGetWeddingDashboardQueryKey(weddingId) });
            toast({ title: 'Paiement ajouté' });
            setOpen(false);
          },
        }
      );
    }
  };

  const handleDelete = () => {
    if (!payment) return;
    if (!confirm('Supprimer ce paiement ?')) return;

    deletePayment.mutate(
      { paymentId: payment.id },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListPaymentsQueryKey(weddingId) });
          queryClient.invalidateQueries({ queryKey: getGetWeddingDashboardQueryKey(weddingId) });
          toast({ title: 'Paiement supprimé' });
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
            {payment ? 'Modifier le paiement' : 'Nouveau paiement'}
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
              data-testid="input-payment-vendor"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description *</Label>
            <Input
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              required
              data-testid="input-payment-description"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="amount">Montant (€) *</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                required
                data-testid="input-payment-amount"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dueDate">Date d'échéance *</Label>
              <Input
                id="dueDate"
                type="date"
                value={formData.dueDate}
                onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                required
                data-testid="input-payment-duedate"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="status">Statut</Label>
              <Select value={formData.status} onValueChange={(value) => setFormData({ ...formData, status: value as PaymentInputStatus })}>
                <SelectTrigger id="status" data-testid="select-payment-status">
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
            <div className="space-y-2">
              <Label htmlFor="paidAt">Date de paiement</Label>
              <Input
                id="paidAt"
                type="date"
                value={formData.paidAt}
                onChange={(e) => setFormData({ ...formData, paidAt: e.target.value })}
                data-testid="input-payment-paidat"
              />
            </div>
          </div>

          <DialogFooter>
            <div className="flex items-center justify-between w-full">
              {payment && (
                <Button
                  type="button"
                  variant="destructive"
                  onClick={handleDelete}
                  disabled={deletePayment.isPending}
                  data-testid="button-delete-payment"
                >
                  Supprimer
                </Button>
              )}
              <div className="flex gap-2 ml-auto">
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                  Annuler
                </Button>
                <Button type="submit" disabled={createPayment.isPending || updatePayment.isPending} data-testid="button-submit-payment">
                  {payment ? 'Modifier' : 'Créer'}
                </Button>
              </div>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
