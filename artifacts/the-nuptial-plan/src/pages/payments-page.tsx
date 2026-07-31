import { useState } from 'react';
import { useParams, Link } from 'wouter';
import { useListPayments, useGetWedding, getGetWeddingQueryKey } from '@workspace/api-client-react';
import { ArrowLeft, Search, AlertCircle, Plus } from 'lucide-react';
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
      <div className="p-12 space-y-8">
        <Skeleton className="h-12 w-96" />
        <Skeleton className="h-96" />
      </div>
    );
  }

  if (!wedding) {
    return (
      <div className="p-12">
        <p className="text-muted-foreground font-mono">Erreur de chargement.</p>
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
    <div className="min-h-[100dvh] p-12 max-w-7xl mx-auto space-y-8">
      <Link href={`/mariages/${weddingId}`} data-testid="link-back-wedding">
        <Button variant="ghost" size="sm" className="font-mono uppercase tracking-wider text-xs">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Retour au dossier
        </Button>
      </Link>

      <div className="space-y-3 border-b-2 border-border pb-6">
        <h1 className="text-5xl font-display font-semibold tracking-tight">{wedding.coupleName}</h1>
        <h2 className="text-2xl font-display text-muted-foreground uppercase tracking-wide">Registre des paiements</h2>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="p-6 border-2">
          <p className="text-xs font-mono uppercase tracking-wider text-muted-foreground mb-2">Paiements</p>
          <p className="text-4xl font-display font-semibold">{payments.length}</p>
        </Card>
        <Card className="p-6 border-2">
          <p className="text-xs font-mono uppercase tracking-wider text-muted-foreground mb-2">Montant total</p>
          <p className="text-4xl font-display font-semibold">{formatCurrency(totalAmount)}</p>
        </Card>
        <Card className="p-6 border-2 bg-secondary/5">
          <p className="text-xs font-mono uppercase tracking-wider text-muted-foreground mb-2">Déjà payé</p>
          <p className="text-4xl font-display font-semibold text-secondary">{formatCurrency(paidAmount)}</p>
        </Card>
        <Card className="p-6 border-2 bg-destructive/5 border-destructive/30">
          <p className="text-xs font-mono uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            Urgents
          </p>
          <p className="text-4xl font-display font-semibold text-destructive">{urgentCount}</p>
        </Card>
      </div>

      {/* Filters & Actions */}
      <div className="flex items-center gap-4 border-y-2 border-border py-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher un paiement..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-11 border-2 font-mono"
            data-testid="input-search-payment"
          />
        </div>
        <PaymentDialog weddingId={weddingId}>
          <Button data-testid="button-add-payment" className="uppercase tracking-wider font-mono text-xs">
            <Plus className="w-4 h-4 mr-2" />
            Ajouter
          </Button>
        </PaymentDialog>
      </div>

      {/* Payment Table */}
      <Card className="border-2">
        <Table>
          <TableHeader>
            <TableRow className="border-b-2 border-border hover:bg-transparent">
              <TableHead className="font-mono uppercase tracking-wider text-xs">Prestataire</TableHead>
              <TableHead className="font-mono uppercase tracking-wider text-xs">Description</TableHead>
              <TableHead className="text-right font-mono uppercase tracking-wider text-xs">Montant</TableHead>
              <TableHead className="font-mono uppercase tracking-wider text-xs">Échéance</TableHead>
              <TableHead className="font-mono uppercase tracking-wider text-xs">Date paiement</TableHead>
              <TableHead className="font-mono uppercase tracking-wider text-xs">Statut</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredPayments.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-16 text-muted-foreground font-mono">
                  Aucun paiement trouvé
                </TableCell>
              </TableRow>
            ) : (
              filteredPayments.map((payment) => (
                <TableRow 
                  key={payment.id} 
                  data-testid={`payment-row-${payment.id}`} 
                  className={`border-b border-border hover:bg-muted/30 ${payment.status === 'Urgent' ? 'bg-destructive/5' : ''}`}
                >
                  <TableCell className="font-semibold">{payment.vendorName}</TableCell>
                  <TableCell className="text-sm">{payment.description}</TableCell>
                  <TableCell className="text-right font-mono font-bold text-lg">
                    {formatCurrency(payment.amount)}
                  </TableCell>
                  <TableCell className="font-mono font-semibold">
                    {formatShortDate(payment.dueDate)}
                  </TableCell>
                  <TableCell className="font-mono text-muted-foreground">
                    {payment.paidAt ? formatShortDate(payment.paidAt) : '—'}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={payment.status} />
                  </TableCell>
                  <TableCell>
                    <PaymentDialog weddingId={weddingId} payment={payment}>
                      <Button variant="ghost" size="sm" data-testid={`button-edit-payment-${payment.id}`} className="font-mono uppercase tracking-wider text-xs">
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
