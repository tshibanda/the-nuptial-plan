import { useState } from 'react';
import { Plus, FileText, CheckCircle, Upload } from 'lucide-react';
import { PageTour } from '@/components/ui/page-tour';
import { FileAttachments } from '@/components/file-attachments';
import { useActiveWedding } from '@/lib/wedding-context';
import {
  useListContracts,
  useCreateContract,
  useUpdateContract,
  useDeleteContract,
  useListVendors,
  getListContractsQueryKey,
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
import { PremiumBadge } from '@/components/premium-badge';

const contractSchema = z.object({
  vendorId: z.number().optional(),
  vendorName: z.string().min(1, 'Le nom du prestataire est requis'),
  status: z.enum(['signed', 'pending', 'partial', 'cancelled']),
  totalAmountCents: z.number().min(0),
  depositPaidCents: z.number().min(0).optional(),
  signedDate: z.string().optional(),
  notes: z.string().optional(),
});

type ContractFormData = z.infer<typeof contractSchema>;

export default function Contrats() {
  const { activeWeddingId } = useActiveWedding();
  const { data: weddings = [] } = useListWeddings();
  const activeWedding = weddings.find((w) => w.id === activeWeddingId);
  const currencySymbol = ({ EUR: '€', GBP: '£', USD: '$', CHF: 'CHF' } as Record<string, string>)[activeWedding?.currency ?? 'EUR'] ?? activeWedding?.currency ?? '€';
  const { data: contracts = [], isLoading } = useListContracts(activeWeddingId!);
  const { data: vendors = [] } = useListVendors(activeWeddingId!);
  const [open, setOpen] = useState(false);
  const [editingContract, setEditingContract] = useState<number | null>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const createContract = useCreateContract();
  const updateContract = useUpdateContract();
  const deleteContract = useDeleteContract();

  const form = useForm<ContractFormData>({
    resolver: zodResolver(contractSchema),
    defaultValues: {
      vendorId: undefined,
      vendorName: '',
      status: 'pending',
      totalAmountCents: 0,
      depositPaidCents: 0,
      signedDate: '',
      notes: '',
    },
  });

  const onSubmit = (data: ContractFormData) => {
    if (!activeWeddingId) return;

    if (editingContract) {
      updateContract.mutate(
        { weddingId: activeWeddingId, id: editingContract, data },
        {
          onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: getListContractsQueryKey(activeWeddingId) });
            toast({ title: 'Contrat mis à jour' });
            setOpen(false);
            setEditingContract(null);
            form.reset();
          },
        }
      );
    } else {
      createContract.mutate(
        { weddingId: activeWeddingId, data },
        {
          onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: getListContractsQueryKey(activeWeddingId) });
            toast({ title: 'Contrat ajouté' });
            setOpen(false);
            form.reset();
          },
        }
      );
    }
  };

  const handleEdit = (contract: any) => {
    setEditingContract(contract.id);
    form.reset({
      vendorId: contract.vendorId || undefined,
      vendorName: contract.vendorName,
      status: contract.status,
      totalAmountCents: contract.totalAmountCents,
      depositPaidCents: contract.depositPaidCents || 0,
      signedDate: contract.signedDate || '',
      notes: contract.notes || '',
    });
    setOpen(true);
  };

  const handleDelete = (id: number) => {
    if (!activeWeddingId) return;
    if (confirm('Supprimer ce contrat ?')) {
      deleteContract.mutate(
        { weddingId: activeWeddingId, id },
        {
          onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: getListContractsQueryKey(activeWeddingId) });
            toast({ title: 'Contrat supprimé' });
          },
        }
      );
    }
  };

  const statusMap: Record<string, string> = {
    signed: 'Signé',
    pending: 'En attente',
    partial: 'Partiel',
    cancelled: 'Annulé',
  };

  const statusColorMap: Record<string, string> = {
    signed: 'badge-confirmed',
    pending: 'badge-pending',
    partial: 'badge-deposit',
    cancelled: 'badge-cancelled',
  };

  if (!activeWeddingId || isLoading) {
    return <div className="text-center font-serif text-2xl text-muted-foreground">Chargement...</div>;
  }

  return (
    <div>
      <PageTour
        tourKey="contrats"
        pageTitle="Contrats"
        pageIcon={FileText}
        steps={[
          { icon: FileText, title: 'Centralisation', body: 'Tous les contrats de vos prestataires au même endroit. Plus besoin de chercher dans vos e-mails ou vos dossiers locaux.' },
          { icon: CheckCircle, title: 'Statuts de signature', body: 'Repérez d\'un coup d\'œil les contrats En attente, Signés ou Expirés grâce aux badges de statut colorés.' },
          { icon: Plus, title: 'Ajouter un contrat', body: 'Associez le contrat à un prestataire, renseignez la valeur totale et la date de signature prévue ou effective.' },
          { icon: Upload, title: 'Pièce jointe', body: 'Téléversez le PDF du contrat signé directement depuis le formulaire. Il sera accessible à tout moment depuis cette page.' },
        ]}
      />
      <div className="relative mb-8 overflow-hidden rounded-2xl hero-gradient-vivid px-8 py-7 ring-1 ring-white/60"
        style={{ boxShadow: '0 4px 24px rgba(93,45,93,0.08), inset 0 1px 0 rgba(255,255,255,0.85)' }}>
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/80 to-transparent" />
        <div className="flex items-end justify-between">
          <div>
            <p className="eyebrow mb-2 text-[#a8893e]">Documents essentiels</p>
            <div className="flex items-center gap-3">
              <h1 className="font-serif text-[43px] leading-[0.9] text-foreground">Contrats</h1>
              <PremiumBadge />
            </div>
          </div>
        <Sheet
          open={open}
          onOpenChange={(o) => {
            setOpen(o);
            if (!o) {
              setEditingContract(null);
              form.reset();
            }
          }}
        >
          <SheetTrigger asChild>
            <Button size="default" className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.12em]" data-testid="button-add-contract">
              <Plus size={14} /> Ajouter un contrat
            </Button>
          </SheetTrigger>
          <SheetContent className="overflow-y-auto">
            <SheetHeader>
              <SheetTitle className="font-serif text-2xl">
                {editingContract ? 'Modifier le contrat' : 'Nouveau contrat'}
              </SheetTitle>
              <SheetDescription>
                {editingContract ? 'Mettez à jour les informations' : 'Ajoutez un contrat au dossier'}
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
                        <Input {...field} data-testid="input-contract-vendor" />
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
                          <SelectTrigger data-testid="select-contract-status">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="pending">En attente</SelectItem>
                          <SelectItem value="partial">Partiel</SelectItem>
                          <SelectItem value="signed">Signé</SelectItem>
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
                      <FormLabel>Montant total ({currencySymbol})</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          {...field}
                          onChange={(e) => field.onChange(Number(e.target.value) * 100)}
                          value={field.value / 100}
                          data-testid="input-contract-total"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="depositPaidCents"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Acompte versé ({currencySymbol})</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          {...field}
                          onChange={(e) => field.onChange(Number(e.target.value) * 100)}
                          value={(field.value || 0) / 100}
                          data-testid="input-contract-deposit"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="signedDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Date de signature (optionnel)</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} data-testid="input-contract-signed" />
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
                        <Textarea {...field} rows={3} data-testid="input-contract-notes" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="flex gap-2 pt-4">
                  <Button type="submit" className="flex-1" data-testid="button-save-contract">
                    {editingContract ? 'Mettre à jour' : 'Ajouter'}
                  </Button>
                  {editingContract && (
                    <Button
                      type="button"
                      variant="destructive"
                      onClick={() => handleDelete(editingContract)}
                      data-testid="button-delete-contract"
                    >
                      Supprimer
                    </Button>
                  )}
                </div>
              </form>
            </Form>
            {editingContract && activeWeddingId && (
              <FileAttachments
                weddingId={activeWeddingId}
                entityType="contract"
                entityId={editingContract}
                label="Pièces jointes"
              />
            )}
          </SheetContent>
        </Sheet>
        </div>
      </div>

      {/* Contracts Table */}
      <div className="overflow-x-auto card-depth">
        <table className="w-full">
          <thead className="border-b border-border">
            <tr className="text-left">
              <th className="px-5 py-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#8c8b86]">
                Prestataire
              </th>
              <th className="px-5 py-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#8c8b86]">
                Statut
              </th>
              <th className="px-5 py-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#8c8b86]">
                Montant
              </th>
              <th className="px-5 py-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#8c8b86]">
                Acompte versé
              </th>
              <th className="px-5 py-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#8c8b86]">
                Signé le
              </th>
              <th className="px-5 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {contracts.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-[11px] text-[#858b89]">
                  Aucun contrat. Cliquez sur "Ajouter un contrat" pour commencer.
                </td>
              </tr>
            ) : (
              contracts.map((contract) => (
                <tr key={contract.id} className="border-b border-[#e3dbd0] last:border-0">
                  <td className="px-5 py-4">
                    <p className="text-[12px] font-semibold text-[#3d4d55]">{contract.vendorName}</p>
                  </td>
                  <td className="px-5 py-4">
                    <span
                      className={`inline-block rounded-full px-2.5 py-1 text-[9px] font-semibold ${statusColorMap[contract.status] || 'badge-pending'}`}
                    >
                      {statusMap[contract.status] || contract.status}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <p className="font-serif text-[16px] text-foreground">
                      {formatCurrency(contract.totalAmountCents)}
                    </p>
                  </td>
                  <td className="px-5 py-4">
                    <p className="text-[11px] text-[#858b89]">
                      {contract.depositPaidCents ? formatCurrency(contract.depositPaidCents) : '—'}
                    </p>
                  </td>
                  <td className="px-5 py-4">
                    <p className="text-[11px] text-[#858b89]">
                      {contract.signedDate ? formatDate(contract.signedDate, 'd MMM yyyy') : '—'}
                    </p>
                  </td>
                  <td className="px-5 py-4">
                    <button onClick={() => handleEdit(contract)} className="text-[#a5a19a]" data-testid={`button-edit-contract-${contract.id}`}>
                      <FileText size={16} />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
