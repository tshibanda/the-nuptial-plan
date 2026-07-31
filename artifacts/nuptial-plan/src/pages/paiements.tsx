import { useState } from 'react';
import { Plus, CreditCard } from 'lucide-react';
import { useActiveWedding } from '@/lib/wedding-context';
import {
  useListPayments,
  useCreatePayment,
  useUpdatePayment,
  useDeletePayment,
  getListPaymentsQueryKey,
} from '@workspace/api-client-react';
import { formatCurrency, formatDate } from '@/lib/format';
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

const paymentSchema = z.object({
  vendorId: z.number().optional(),
  vendorName: z.string().min(1, 'Le nom du prestataire est requis'),
  description: z.string().min(1, 'La description est requise'),
  amountCents: z.number().min(0),
  dueDate: z.string().min(1, "La date d'échéance est requise"),
  status: z.enum(['pending', 'paid', 'overdue', 'scheduled']),
  paidDate: z.string().optional(),
  notes: z.string().optional(),
});

type PaymentFormData = z.infer<typeof paymentSchema>;

export default function Paiements() {
  const { activeWeddingId } = useActiveWedding();
  const { data: payments = [], isLoading } = useListPayments(activeWeddingId!);
  const [open, setOpen] = useState(false);
  const [editingPayment, setEditingPayment] = useState<number | null>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const createPayment = useCreatePayment();
  const updatePayment = useUpdatePayment();
  const deletePayment = useDeletePayment();

  const form = useForm<PaymentFormData>({
    resolver: zodResolver(paymentSchema),
    defaultValues: {
      vendorId: undefined,
      vendorName: '',
      description: '',
      amountCents: 0,
      dueDate: '',
      status: 'pending',
      paidDate: '',
      notes: '',
    },
  });

  const onSubmit = (data: PaymentFormData) => {
    if (!activeWeddingId) return;

    if (editingPayment) {
      updatePayment.mutate(
        { weddingId: activeWeddingId, id: editingPayment, data },
        {
          onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: getListPaymentsQueryKey(activeWeddingId) });
            toast({ title: 'Paiement mis à jour' });
            setOpen(false);
            setEditingPayment(null);
            form.reset();
          },
        }
      );
    } else {
      createPayment.mutate(
        { weddingId: activeWeddingId, data },
        {
          onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: getListPaymentsQueryKey(activeWeddingId) });
            toast({ title: 'Paiement ajouté' });
            setOpen(false);
            form.reset();
          },
        }
      );
    }
  };

  const handleEdit = (payment: any) => {
    setEditingPayment(payment.id);
    form.reset({
      vendorId: payment.vendorId || undefined,
      vendorName: payment.vendorName,
      description: payment.description,
      amountCents: payment.amountCents,
      dueDate: payment.dueDate,
      status: payment.status,
      paidDate: payment.paidDate || '',
      notes: payment.notes || '',
    });
    setOpen(true);
  };

  const handleDelete = (id: number) => {
    if (!activeWeddingId) return;
    if (confirm('Supprimer ce paiement ?')) {
      deletePayment.mutate(
        { weddingId: activeWeddingId, id },
        {
          onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: getListPaymentsQueryKey(activeWeddingId) });
            toast({ title: 'Paiement supprimé' });
          },
        }
      );
    }
  };

  const statusMap: Record<string, string> = {
    pending: 'À régler',
    paid: 'Payé',
    overdue: 'En retard',
    scheduled: 'Programmé',
  };

  const statusColorMap: Record<string, string> = {
    pending: 'bg-[#f0e2cb] text-[#967346]',
    paid: 'bg-[#dce8df] text-[#5d7968]',
    overdue: 'bg-[#f1dfd0] text-[#9d6246]',
    scheduled: 'bg-[#e7e4df] text-[#6f7673]',
  };

  if (!activeWeddingId || isLoading) {
    return <div className="text-center font-serif text-2xl text-muted-foreground">Chargement...</div>;
  }

  const sortedPayments = [...payments].sort(
    (a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
  );

  const pendingTotal = payments
    .filter((p) => p.status === 'pending' || p.status === 'overdue')
    .reduce((sum, p) => sum + p.amountCents, 0);

  return (
    <div>
      <div className="mb-8 flex items-end justify-between">
        <div>
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-[#9b8258]">
            Le calendrier financier
          </p>
          <h1 className="font-serif text-[43px] leading-[0.9] text-foreground">Paiements</h1>
        </div>
        <Sheet
          open={open}
          onOpenChange={(o) => {
            setOpen(o);
            if (!o) {
              setEditingPayment(null);
              form.reset();
            }
          }}
        >
          <SheetTrigger asChild>
            <Button className="flex items-center gap-2 bg-primary px-4 py-2.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-primary-foreground hover:bg-primary/90" data-testid="button-add-payment">
              <Plus size={14} /> Ajouter un paiement
            </Button>
          </SheetTrigger>
          <SheetContent className="overflow-y-auto">
            <SheetHeader>
              <SheetTitle className="font-serif text-2xl">
                {editingPayment ? 'Modifier le paiement' : 'Nouveau paiement'}
              </SheetTitle>
              <SheetDescription>
                {editingPayment ? 'Mettez à jour les informations' : 'Ajoutez un paiement au calendrier'}
              </SheetDescription>
            </SheetHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="mt-6 space-y-4">
                <FormField
                  control={form.control}
                  name="vendorName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nom du prestataire</FormLabel>
                      <FormControl>
                        <Input {...field} data-testid="input-payment-vendor" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Ex: Solde final" data-testid="input-payment-description" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="amountCents"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Montant (£)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          {...field}
                          onChange={(e) => field.onChange(Number(e.target.value) * 100)}
                          value={field.value / 100}
                          data-testid="input-payment-amount"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="dueDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Date d'échéance</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} data-testid="input-payment-due" />
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
                          <SelectTrigger data-testid="select-payment-status">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="pending">À régler</SelectItem>
                          <SelectItem value="scheduled">Programmé</SelectItem>
                          <SelectItem value="paid">Payé</SelectItem>
                          <SelectItem value="overdue">En retard</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="paidDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Date de paiement (optionnel)</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} data-testid="input-payment-paid" />
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
                        <Textarea {...field} rows={3} data-testid="input-payment-notes" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="flex gap-2 pt-4">
                  <Button type="submit" className="flex-1" data-testid="button-save-payment">
                    {editingPayment ? 'Mettre à jour' : 'Ajouter'}
                  </Button>
                  {editingPayment && (
                    <Button
                      type="button"
                      variant="destructive"
                      onClick={() => handleDelete(editingPayment)}
                      data-testid="button-delete-payment"
                    >
                      Supprimer
                    </Button>
                  )}
                </div>
              </form>
            </Form>
          </SheetContent>
        </Sheet>
      </div>

      {/* Payment Cards */}
      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {sortedPayments.length === 0 ? (
          <div className="col-span-full rounded border border-border bg-card px-6 py-12 text-center text-[11px] text-[#858b89]">
            Aucun paiement. Cliquez sur "Ajouter un paiement" pour commencer.
          </div>
        ) : (
          sortedPayments.map((payment) => (
            <button
              key={payment.id}
              onClick={() => handleEdit(payment)}
              className="rounded border border-border bg-card p-5 text-left shadow-[0_3px_12px_rgba(93,45,93,.05)] transition hover:border-ring"
              data-testid={`button-edit-payment-${payment.id}`}
            >
              <div className="mb-4 flex items-start justify-between gap-3">
                <div>
                  <p className="text-[12px] font-semibold text-[#3d4d55]">{payment.vendorName}</p>
                  <p className="mt-1 text-[10px] text-[#858b89]">
                    {payment.description} · {formatDate(payment.dueDate, 'd MMM yyyy')}
                  </p>
                </div>
                <span
                  className={`shrink-0 rounded-full px-2 py-1 text-[8px] font-semibold ${statusColorMap[payment.status] || 'bg-[#f0e2cb] text-[#967346]'}`}
                >
                  {statusMap[payment.status] || payment.status}
                </span>
              </div>
              <p className="font-serif text-[25px] text-foreground">
                {formatCurrency(payment.amountCents)}
              </p>
            </button>
          ))
        )}
      </div>

      {/* Total */}
      {payments.length > 0 && (
        <div className="border-t border-border pt-6">
          <p className="font-serif text-[22px] text-foreground">
            Total à régler : {formatCurrency(pendingTotal)}
          </p>
        </div>
      )}
    </div>
  );
}
