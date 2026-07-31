import { useState } from 'react';
import { useParams, Link } from 'wouter';
import { useListVendors, useGetWedding, getGetWeddingQueryKey } from '@workspace/api-client-react';
import { ArrowLeft, Search, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { StatusBadge } from '@/components/ui/status-badge';
import { VendorDialog } from '@/components/dialogs/vendor-dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { formatCurrency } from '@/lib/format';

export default function VendorsPage() {
  const params = useParams();
  const weddingId = Number(params.id);
  const [search, setSearch] = useState('');

  const { data: wedding, isLoading: weddingLoading } = useGetWedding(weddingId, {
    query: { enabled: !!weddingId, queryKey: getGetWeddingQueryKey(weddingId) },
  });

  const { data: vendors = [], isLoading: vendorsLoading } = useListVendors(weddingId);

  if (weddingLoading || vendorsLoading) {
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

  const filteredVendors = vendors.filter((vendor) =>
    vendor.name.toLowerCase().includes(search.toLowerCase()) ||
    vendor.category.toLowerCase().includes(search.toLowerCase())
  );

  const totalAmount = vendors.reduce((sum, v) => sum + (v.totalAmount || 0), 0);
  const totalDeposit = vendors.reduce((sum, v) => sum + (v.depositAmount || 0), 0);

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
        <h2 className="text-2xl font-display text-muted-foreground uppercase tracking-wide">Registre des prestataires</h2>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="p-6 border-2">
          <p className="text-xs font-mono uppercase tracking-wider text-muted-foreground mb-2">Prestataires</p>
          <p className="text-4xl font-display font-semibold">{vendors.length}</p>
        </Card>
        <Card className="p-6 border-2">
          <p className="text-xs font-mono uppercase tracking-wider text-muted-foreground mb-2">Montant total</p>
          <p className="text-4xl font-display font-semibold">{formatCurrency(totalAmount)}</p>
        </Card>
        <Card className="p-6 border-2 bg-secondary/5">
          <p className="text-xs font-mono uppercase tracking-wider text-muted-foreground mb-2">Acomptes versés</p>
          <p className="text-4xl font-display font-semibold text-secondary">{formatCurrency(totalDeposit)}</p>
        </Card>
      </div>

      {/* Filters & Actions */}
      <div className="flex items-center gap-4 border-y-2 border-border py-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher par nom ou catégorie..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-11 border-2 font-mono"
            data-testid="input-search-vendor"
          />
        </div>
        <VendorDialog weddingId={weddingId}>
          <Button data-testid="button-add-vendor" className="uppercase tracking-wider font-mono text-xs">
            <Plus className="w-4 h-4 mr-2" />
            Ajouter
          </Button>
        </VendorDialog>
      </div>

      {/* Vendor Table */}
      <Card className="border-2">
        <Table>
          <TableHeader>
            <TableRow className="border-b-2 border-border hover:bg-transparent">
              <TableHead className="font-mono uppercase tracking-wider text-xs">Nom</TableHead>
              <TableHead className="font-mono uppercase tracking-wider text-xs">Catégorie</TableHead>
              <TableHead className="font-mono uppercase tracking-wider text-xs">Contact</TableHead>
              <TableHead className="text-right font-mono uppercase tracking-wider text-xs">Montant total</TableHead>
              <TableHead className="text-right font-mono uppercase tracking-wider text-xs">Acompte</TableHead>
              <TableHead className="font-mono uppercase tracking-wider text-xs">Statut</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredVendors.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-16 text-muted-foreground font-mono">
                  Aucun prestataire trouvé
                </TableCell>
              </TableRow>
            ) : (
              filteredVendors.map((vendor) => (
                <TableRow key={vendor.id} data-testid={`vendor-row-${vendor.id}`} className="border-b border-border hover:bg-muted/30">
                  <TableCell className="font-semibold">{vendor.name}</TableCell>
                  <TableCell className="font-mono uppercase tracking-wide text-sm">{vendor.category}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {vendor.contactName || vendor.contactEmail || vendor.contactPhone || '—'}
                  </TableCell>
                  <TableCell className="text-right font-mono font-semibold">
                    {vendor.totalAmount ? formatCurrency(vendor.totalAmount) : '—'}
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    {vendor.depositAmount ? formatCurrency(vendor.depositAmount) : '—'}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={vendor.status} />
                  </TableCell>
                  <TableCell>
                    <VendorDialog weddingId={weddingId} vendor={vendor}>
                      <Button variant="ghost" size="sm" data-testid={`button-edit-vendor-${vendor.id}`} className="font-mono uppercase tracking-wider text-xs">
                        Modifier
                      </Button>
                    </VendorDialog>
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
