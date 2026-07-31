import { useState } from 'react';
import { useParams, Link } from 'wouter';
import { useListVendors, useGetWedding, getGetWeddingQueryKey } from '@workspace/api-client-react';
import { ArrowLeft, Search } from 'lucide-react';
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

  const filteredVendors = vendors.filter((vendor) =>
    vendor.name.toLowerCase().includes(search.toLowerCase()) ||
    vendor.category.toLowerCase().includes(search.toLowerCase())
  );

  const totalAmount = vendors.reduce((sum, v) => sum + (v.totalAmount || 0), 0);
  const totalDeposit = vendors.reduce((sum, v) => sum + (v.depositAmount || 0), 0);

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
        <h2 className="text-2xl font-display text-muted-foreground">Prestataires</h2>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Nombre de prestataires</p>
          <p className="text-3xl font-display font-semibold mt-1">{vendors.length}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Montant total</p>
          <p className="text-3xl font-display font-semibold mt-1">{formatCurrency(totalAmount)}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Acomptes versés</p>
          <p className="text-3xl font-display font-semibold mt-1">{formatCurrency(totalDeposit)}</p>
        </Card>
      </div>

      {/* Filters & Actions */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher un prestataire..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
            data-testid="input-search-vendor"
          />
        </div>
        <VendorDialog weddingId={weddingId}>
          <Button data-testid="button-add-vendor">Ajouter un prestataire</Button>
        </VendorDialog>
      </div>

      {/* Vendor Table */}
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nom</TableHead>
              <TableHead>Catégorie</TableHead>
              <TableHead>Contact</TableHead>
              <TableHead className="text-right">Montant total</TableHead>
              <TableHead className="text-right">Acompte</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredVendors.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                  Aucun prestataire trouvé
                </TableCell>
              </TableRow>
            ) : (
              filteredVendors.map((vendor) => (
                <TableRow key={vendor.id} data-testid={`vendor-row-${vendor.id}`}>
                  <TableCell className="font-medium">{vendor.name}</TableCell>
                  <TableCell>{vendor.category}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {vendor.contactName || vendor.contactEmail || vendor.contactPhone || '—'}
                  </TableCell>
                  <TableCell className="text-right font-mono">
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
                      <Button variant="ghost" size="sm" data-testid={`button-edit-vendor-${vendor.id}`}>
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
