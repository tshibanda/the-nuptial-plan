import { useState } from 'react';
import { useParams, Link } from 'wouter';
import { useListContracts, useGetWedding, getGetWeddingQueryKey } from '@workspace/api-client-react';
import { ArrowLeft, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { StatusBadge } from '@/components/ui/status-badge';
import { ContractDialog } from '@/components/dialogs/contract-dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { formatCurrency, formatShortDate } from '@/lib/format';

export default function ContractsPage() {
  const params = useParams();
  const weddingId = Number(params.id);
  const [search, setSearch] = useState('');

  const { data: wedding, isLoading: weddingLoading } = useGetWedding(weddingId, {
    query: { enabled: !!weddingId, queryKey: getGetWeddingQueryKey(weddingId) },
  });

  const { data: contracts = [], isLoading: contractsLoading } = useListContracts(weddingId);

  if (weddingLoading || contractsLoading) {
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

  const filteredContracts = contracts.filter((contract) =>
    contract.vendorName.toLowerCase().includes(search.toLowerCase())
  );

  const signedCount = contracts.filter(c => c.status === 'Signé').length;
  const totalAmount = contracts.reduce((sum, c) => sum + c.totalAmount, 0);

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
        <h2 className="text-2xl font-display text-muted-foreground">Contrats</h2>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Total des contrats</p>
          <p className="text-3xl font-display font-semibold mt-1">{contracts.length}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Contrats signés</p>
          <p className="text-3xl font-display font-semibold mt-1 text-primary">{signedCount}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Valeur totale</p>
          <p className="text-3xl font-display font-semibold mt-1">{formatCurrency(totalAmount)}</p>
        </Card>
      </div>

      {/* Filters & Actions */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher un contrat..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
            data-testid="input-search-contract"
          />
        </div>
        <ContractDialog weddingId={weddingId}>
          <Button data-testid="button-add-contract">Ajouter un contrat</Button>
        </ContractDialog>
      </div>

      {/* Contract Table */}
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Prestataire</TableHead>
              <TableHead className="text-right">Montant total</TableHead>
              <TableHead className="text-right">Acompte</TableHead>
              <TableHead>Date de signature</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredContracts.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                  Aucun contrat trouvé
                </TableCell>
              </TableRow>
            ) : (
              filteredContracts.map((contract) => (
                <TableRow key={contract.id} data-testid={`contract-row-${contract.id}`}>
                  <TableCell className="font-medium">{contract.vendorName}</TableCell>
                  <TableCell className="text-right font-mono font-semibold">
                    {formatCurrency(contract.totalAmount)}
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    {contract.depositAmount ? formatCurrency(contract.depositAmount) : '—'}
                  </TableCell>
                  <TableCell className="font-mono text-sm">
                    {contract.signedAt ? formatShortDate(contract.signedAt) : '—'}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={contract.status} />
                  </TableCell>
                  <TableCell>
                    <ContractDialog weddingId={weddingId} contract={contract}>
                      <Button variant="ghost" size="sm" data-testid={`button-edit-contract-${contract.id}`}>
                        Modifier
                      </Button>
                    </ContractDialog>
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
