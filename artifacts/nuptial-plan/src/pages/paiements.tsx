import { useState } from 'react';
import { Plus, CreditCard, AlertCircle, CheckCircle } from 'lucide-react';
import { PageTour } from '@/components/ui/page-tour';
import { PremiumBadge } from '@/components/premium-badge';
import { PremiumPageGate, usePremiumStatus } from '@/components/premium-page-gate';
import { useActiveWedding } from '@/lib/wedding-context';
import {
  useListPayments,
  useCreatePayment,
  useUpdatePayment,
  useDeletePayment,
  getListPaymentsQueryKey,
  useListWeddings,
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
import { useLanguage } from '@/lib/i18n';

const paymentSchema = (language: 'en' | 'fr') => z.object({
  vendorId: z.number().optional(),
  vendorName: z.string().min(1, language === 'fr' ? 'Le nom du prestataire est requis' : 'Vendor name is required'),
  description: z.string().min(1, language === 'fr' ? 'La description est requise' : 'Description is required'),
  amountCents: z.number().min(0),
  dueDate: z.string().min(1, language === 'fr' ? "La date d'échéance est requise" : 'Due date is required'),
  status: z.enum(['pending', 'paid', 'overdue', 'scheduled']),
  paidDate: z.string().optional(),
  notes: z.string().optional(),
});

type PaymentFormData = z.infer<ReturnType<typeof paymentSchema>>;

export default function Paiements() {
  const { language, formatCurrency: localCurrency, formatDate: localDate } = useLanguage();
  const tr = (fr: string, en: string) => language === 'fr' ? fr : en;
  const { isPremium, loading: premiumLoading } = usePremiumStatus();
  const { activeWeddingId } = useActiveWedding();
  const { data: weddings = [] } = useListWeddings();
  const activeWedding = weddings.find((w) => w.id === activeWeddingId);
  const currencySymbol = ({ EUR: '€', GBP: '£', USD: '$', CHF: 'CHF' } as Record<string, string>)[activeWedding?.currency ?? 'EUR'] ?? activeWedding?.currency ?? '€';
  const { data: payments = [], isLoading } = useListPayments(activeWeddingId!);
  const [open, setOpen] = useState(false);
  const [editingPayment, setEditingPayment] = useState<number | null>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const createPayment = useCreatePayment();
  const updatePayment = useUpdatePayment();
  const deletePayment = useDeletePayment();

  const form = useForm<PaymentFormData>({
    resolver: zodResolver(paymentSchema(language)),
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
            toast({ title: tr('Paiement mis à jour', 'Payment updated') });
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
            toast({ title: tr('Paiement ajouté', 'Payment added') });
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
    if (confirm(tr('Supprimer ce paiement ?', 'Delete this payment?'))) {
      deletePayment.mutate(
        { weddingId: activeWeddingId, id },
        {
          onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: getListPaymentsQueryKey(activeWeddingId) });
            toast({ title: tr('Paiement supprimé', 'Payment deleted') });
          },
        }
      );
    }
  };

  const statusMap: Record<string, string> = {
    pending: tr('À régler', 'Due'), paid: tr('Payé', 'Paid'),
    overdue: tr('En retard', 'Overdue'), scheduled: tr('Programmé', 'Scheduled'),
  };

  const statusColorMap: Record<string, string> = {
    pending: 'badge-pending',
    paid: 'badge-confirmed',
    overdue: 'bg-[#f1dfd0] text-[#9d6246]',
    scheduled: 'bg-[#e7e4df] text-[#6f7673]',
  };

  if (!activeWeddingId || isLoading) {
    return <div className="text-center font-serif text-2xl text-muted-foreground">{tr('Chargement…', 'Loading…')}</div>;
  }

  const sortedPayments = [...payments].sort(
    (a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
  );

  const pendingTotal = payments
    .filter((p) => p.status === 'pending' || p.status === 'overdue')
    .reduce((sum, p) => sum + Number(p.amountCents ?? 0), 0);

  if (!premiumLoading && !isPremium) return <PremiumPageGate featureLabel={tr('le suivi des paiements', 'payment tracking')} />;
  return (
    <div>
      <PageTour
        tourKey="paiements"
        pageTitle={tr('Paiements', 'Payments')}
        pageIcon={CreditCard}
        steps={[
          { icon: CreditCard, title: tr('Calendrier financier', 'Financial calendar'), body: tr('Visualisez toutes vos échéances de paiement à venir — acomptes, soldes et règlements prestataires — sur une seule page.', 'See all upcoming payment due dates—deposits, balances and vendor payments—in one place.') },
          { icon: AlertCircle, title: tr('Alertes d\'échéance', 'Due-date alerts'), body: tr('Les paiements dus aujourd\'hui ou en retard sont mis en évidence pour ne rien manquer.', 'Payments due today or overdue are highlighted so nothing is missed.') },
          { icon: Plus, title: tr('Ajouter un paiement', 'Add a payment'), body: tr('Reliez le paiement à un prestataire existant, définissez le montant et la date d\'échéance.', 'Link it to an existing vendor and set the amount and due date.') },
          { icon: CheckCircle, title: tr('Marquer comme payé', 'Mark as paid'), body: tr('Validez un paiement effectué pour mettre à jour le solde restant et archiver la transaction.', 'Confirm a completed payment to update the outstanding balance and archive the transaction.') },
        ]}
      />
      <div className="relative mb-8 overflow-hidden rounded-2xl hero-gradient-vivid px-8 py-7 ring-1 ring-white/60"
        style={{ boxShadow: '0 4px 24px rgba(93,45,93,0.08), inset 0 1px 0 rgba(255,255,255,0.85)' }}>
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/80 to-transparent" />
        <div className="flex items-end justify-between">
          <div>
            <p className="eyebrow mb-2 text-[#a8893e]">{tr('Le calendrier financier', 'Financial calendar')}</p>
            <div className="flex items-center gap-3">
              <h1 className="font-serif text-[43px] leading-[0.9] text-foreground">{tr('Paiements', 'Payments')}</h1>
              <PremiumBadge />
            </div>
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
            <Button size="default" className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.12em]" data-testid="button-add-payment">
              <Plus size={14} /> {tr('Ajouter un paiement', 'Add a payment')}
            </Button>
          </SheetTrigger>
          <SheetContent className="overflow-y-auto">
            <SheetHeader>
              <SheetTitle className="font-serif text-2xl">
                {editingPayment ? tr('Modifier le paiement', 'Edit payment') : tr('Nouveau paiement', 'New payment')}
              </SheetTitle>
              <SheetDescription>
                {editingPayment ? tr('Mettez à jour les informations', 'Update the information') : tr('Ajoutez un paiement au calendrier', 'Add a payment to the calendar')}
              </SheetDescription>
            </SheetHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="mt-6 space-y-4">
                <FormField
                  control={form.control}
                  name="vendorName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{tr('Nom du prestataire', 'Vendor name')}</FormLabel>
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
                      <FormLabel>{tr('Description', 'Description')}</FormLabel>
                      <FormControl>
                          <Input {...field} placeholder={tr('Ex. : Solde final', 'E.g. final balance')} data-testid="input-payment-description" />
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
                      <FormLabel>{tr('Montant', 'Amount')} ({currencySymbol})</FormLabel>
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
                      <FormLabel>{tr('Date d\'échéance', 'Due date')}</FormLabel>
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
                      <FormLabel>{tr('Statut', 'Status')}</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-payment-status">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="pending">{statusMap.pending}</SelectItem><SelectItem value="scheduled">{statusMap.scheduled}</SelectItem><SelectItem value="paid">{statusMap.paid}</SelectItem><SelectItem value="overdue">{statusMap.overdue}</SelectItem>
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
                      <FormLabel>{tr('Date de paiement (optionnel)', 'Payment date (optional)')}</FormLabel>
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
                      <FormLabel>{tr('Notes', 'Notes')}</FormLabel>
                      <FormControl>
                        <Textarea {...field} rows={3} data-testid="input-payment-notes" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="flex gap-2 pt-4">
                  <Button type="submit" className="flex-1" data-testid="button-save-payment">
                    {editingPayment ? tr('Mettre à jour', 'Update') : tr('Ajouter', 'Add')}
                  </Button>
                  {editingPayment && (
                    <Button
                      type="button"
                      variant="destructive"
                      onClick={() => handleDelete(editingPayment)}
                      data-testid="button-delete-payment"
                    >
                      {tr('Supprimer', 'Delete')}
                    </Button>
                  )}
                </div>
              </form>
            </Form>
          </SheetContent>
        </Sheet>
        </div>
      </div>

      {/* Payment Cards */}
      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {sortedPayments.length === 0 ? (
          <div className="col-span-full card-depth px-6 py-12 text-center text-[11px] text-muted-foreground">
            {tr('Aucun paiement. Cliquez sur « Ajouter un paiement » pour commencer.', 'No payments. Click “Add a payment” to get started.')}
          </div>
        ) : (
          sortedPayments.map((payment) => (
            <button
              key={payment.id}
              onClick={() => handleEdit(payment)}
              className="card-depth relative overflow-hidden p-5 text-left transition hover:shadow-[0_6px_24px_rgba(93,45,93,0.12)]"
              data-testid={`button-edit-payment-${payment.id}`}
            >
              <div className="absolute inset-x-0 top-0 h-px bg-white/80" />
              <div className="mb-4 flex items-start justify-between gap-3">
                <div>
                  <p className="text-[12px] font-semibold text-foreground">{payment.vendorName}</p>
                  <p className="mt-1 text-[10px] text-muted-foreground">
                     {payment.description} · {localDate(payment.dueDate, { day: 'numeric', month: 'short', year: 'numeric' })}
                  </p>
                </div>
                <span
                  className={`shrink-0 rounded-full px-2 py-1 text-[8px] font-semibold ${statusColorMap[payment.status] || 'badge-pending'}`}
                >
                  {statusMap[payment.status] || payment.status}
                </span>
              </div>
              <p className="font-serif text-[25px] text-foreground">
                 {localCurrency(payment.amountCents / 100, activeWedding?.currency)}
              </p>
            </button>
          ))
        )}
      </div>

      {/* Total */}
      {payments.length > 0 && (
        <div className="border-t border-border pt-6">
          <p className="font-serif text-[22px] text-foreground">
             {tr('Total à régler :', 'Total due:')} {localCurrency(pendingTotal / 100, activeWedding?.currency)}
          </p>
        </div>
      )}
    </div>
  );
}
