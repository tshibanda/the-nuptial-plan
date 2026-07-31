import { useState } from 'react';
import { useParams, Link } from 'wouter';
import { useListContracts, useGetWedding, getGetWeddingQueryKey } from '@workspace/api-client-react';
import { ArrowLeft, Search, Plus } from 'lucide-react';
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

  const filteredContracts = contracts.filter((contract) =>
    contract.vendorName.toLowerCase().includes(search.toLowerCase())
  );

  const signedCount = contracts.filter(c => c.status === 'Signé').length;
  const totalAmount = contracts.reduce((sum, c) => sum + c.totalAmount, 0);

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
        <h2 className="text-2xl font-display text-muted-foreground uppercase tracking-wide">Registre des contrats</h2>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="p-6 border-2">
          <p className="text-xs font-mono uppercase tracking-wider text-muted-foreground mb-2">Contrats</p>
          <p className="text-4xl font-display font-semibold">{contracts.length}</p>
        </Card>
        <Card className="p-6 border-2 bg-secondary/5">
          <p className="text-xs font-mono uppercase tracking-wider text-muted-foreground mb-2">Signés</p>
          <p className="text-4xl font-display font-semibold text-secondary">{signedCount}</p>
        </Card>
        <Card className="p-6 border-2">
          <p className="text-xs font-mono uppercase tracking-wider text-muted-foreground mb-2">Valeur totale</p>
          <p className="text-4xl font-display font-semibold">{formatCurrency(totalAmount)}</p>
        </Card>
      </div>

      {/* Filters & Actions */}
      <div className="flex items-center gap-4 border-y-2 border-border py-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher un contrat..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-11 border-2 font-mono"
            data-testid="input-search-contract"
          />
        </div>
        <ContractDialog weddingId={weddingId}>
          <Button data-testid="button-add-contract" className="uppercase tracking-wider font-mono text-xs">
            <Plus className="w-4 h-4 mr-2" />
            Ajouter
          </Button>
        </ContractDialog>
      </div>

      {/* Contract Table */}
      <Card className="border-2">
        <Table>
          <TableHeader>
            <TableRow className="border-b-2 border-border hover:bg-transparent">
              <TableHead className="font-mono uppercase tracking-wider text-xs">Prestataire</TableHead>
              <TableHead className="text-right font-mono uppercase tracking-wider text-xs">Montant total</TableHead>
              <TableHead className="text-right font-mono uppercase tracking-wider text-xs">Acompte</TableHead>
              <TableHead className="font-mono uppercase tracking-wider text-xs">Date signature</TableHead>
              <TableHead className="font-mono uppercase tracking-wider text-xs">Statut</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredContracts.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-16 text-muted-foreground font-mono">
                  Aucun contrat trouvé
                </TableCell>
              </TableRow>
            ) : (
              filteredContracts.map((contract) => (
                <TableRow key={contract.id} data-testid={`contract-row-${contract.id}`} className="border-b border-border hover:bg-muted/30">
                  <TableCell className="font-semibold">{contract.vendorName}</TableCell>
                  <TableCell className="text-right font-mono font-bold text-lg">
                    {formatCurrency(contract.totalAmount)}
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    {contract.depositAmount ? formatCurrency(contract.depositAmount) : '—'}
                  </TableCell>
                  <TableCell className="font-mono font-semibold">
                    {contract.signedAt ? formatShortDate(contract.signedAt) : '—'}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={contract.status} />
                  </TableCell>
                  <TableCell>
                    <ContractDialog weddingId={weddingId} contract={contract}>
                      <Button variant="ghost" size="sm" data-testid={`button-edit-contract-${contract.id}`} className="font-mono uppercase tracking-wider text-xs">
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
