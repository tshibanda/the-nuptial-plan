import { useState } from 'react';
import { useParams, Link } from 'wouter';
import { useListPayments, useGetWedding, getGetWeddingQueryKey } from '@workspace/api-client-react';
import { ArrowLeft, Search, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { StatusBadge } from '@/components/ui/status-badge';
import { PaymentDialog } from '@/components/dialogs/payment-dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { formatCurrency, formatShortDate } from '@/lib/format';

export default function PaymentsPage() {
  const params = useParams();
  const weddingId = Number(params.id);
  const [search, setSearch] = useState('');

  const { data: wedding, isLoading: weddingLoading } = useGetWedding(weddingId, {
    query: { enabled: !!weddingId, queryKey: getGetWeddingQueryKey(weddingId) },
  });

  const { data: payments = [], isLoading: paymentsLoading } = useListPayments(weddingId);

  if (weddingLoading || paymentsLoading) {
    return (
      <div className="p-8 space-y-8">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-96" />
      </div>
    );
  }

  if (!wedding) {
    return (
      <div className="p-8">
        <p className="text-muted-foreground">Erreur de chargement.</p>
      </div>
    );
  }

  const filteredPayments = payments.filter((payment) =>
    payment.vendorName.toLowerCase().includes(search.toLowerCase()) ||
    payment.description.toLowerCase().includes(search.toLowerCase())
  );

  const totalAmount = payments.reduce((sum, p) => sum + p.amount, 0);
  const paidAmount = payments.filter(p => p.status === 'Payé').reduce((sum, p) => sum + p.amount, 0);
  const urgentCount = payments.filter(p => p.status === 'Urgent').length;

  return (
    <div className="min-h-[100dvh] p-8 max-w-7xl mx-auto space-y-6">
      <Link href={`/mariages/${weddingId}`} data-testid="link-back-wedding">
        <Button variant="ghost" size="sm">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Retour
        </Button>
      </Link>

      <div className="space-y-2">
        <h1 className="text-4xl font-display font-semibold">{wedding.coupleName}</h1>
        <h2 className="text-2xl font-display text-muted-foreground">Paiements</h2>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Total des paiements</p>
          <p className="text-3xl font-display font-semibold mt-1">{payments.length}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Montant total</p>
          <p className="text-3xl font-display font-semibold mt-1">{formatCurrency(totalAmount)}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Déjà payé</p>
          <p className="text-3xl font-display font-semibold mt-1 text-primary">{formatCurrency(paidAmount)}</p>
        </Card>
        <Card className="p-4 border-destructive/20 bg-destructive/5">
          <p className="text-sm text-muted-foreground flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            Paiements urgents
          </p>
          <p className="text-3xl font-display font-semibold mt-1 text-destructive">{urgentCount}</p>
        </Card>
      </div>

      {/* Filters & Actions */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher un paiement..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
            data-testid="input-search-payment"
          />
        </div>
        <PaymentDialog weddingId={weddingId}>
          <Button data-testid="button-add-payment">Ajouter un paiement</Button>
        </PaymentDialog>
      </div>

      {/* Payment Table */}
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Prestataire</TableHead>
              <TableHead>Description</TableHead>
              <TableHead className="text-right">Montant</TableHead>
              <TableHead>Date d'échéance</TableHead>
              <TableHead>Date de paiement</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredPayments.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                  Aucun paiement trouvé
                </TableCell>
              </TableRow>
            ) : (
              filteredPayments.map((payment) => (
                <TableRow key={payment.id} data-testid={`payment-row-${payment.id}`}>
                  <TableCell className="font-medium">{payment.vendorName}</TableCell>
                  <TableCell className="text-sm">{payment.description}</TableCell>
                  <TableCell className="text-right font-mono font-semibold">
                    {formatCurrency(payment.amount)}
                  </TableCell>
                  <TableCell className="font-mono text-sm">
                    {formatShortDate(payment.dueDate)}
                  </TableCell>
                  <TableCell className="font-mono text-sm text-muted-foreground">
                    {payment.paidAt ? formatShortDate(payment.paidAt) : '—'}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={payment.status} />
                  </TableCell>
                  <TableCell>
                    <PaymentDialog weddingId={weddingId} payment={payment}>
                      <Button variant="ghost" size="sm" data-testid={`button-edit-payment-${payment.id}`}>
                        Modifier
                      </Button>
                    </PaymentDialog>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
