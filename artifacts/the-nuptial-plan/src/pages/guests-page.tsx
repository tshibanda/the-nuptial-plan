import { useState } from 'react';
import { useParams, Link } from 'wouter';
import { useListGuests, useGetWedding, getGetWeddingQueryKey } from '@workspace/api-client-react';
import { ArrowLeft, Search, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { StatusBadge } from '@/components/ui/status-badge';
import { GuestDialog } from '@/components/dialogs/guest-dialog';
import { Skeleton } from '@/components/ui/skeleton';

export default function GuestsPage() {
  const params = useParams();
  const weddingId = Number(params.id);
  const [search, setSearch] = useState('');
  const [rsvpFilter, setRsvpFilter] = useState<string>('all');

  const { data: wedding, isLoading: weddingLoading } = useGetWedding(weddingId, {
    query: { enabled: !!weddingId, queryKey: getGetWeddingQueryKey(weddingId) },
  });

  const { data: guestList, isLoading: guestsLoading } = useListGuests(weddingId);

  if (weddingLoading || guestsLoading) {
    return (
      <div className="p-8 space-y-8">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-96" />
      </div>
    );
  }

  if (!wedding || !guestList) {
    return (
      <div className="p-8">
        <p className="text-muted-foreground">Erreur de chargement.</p>
      </div>
    );
  }

  const filteredGuests = guestList.guests.filter((guest) => {
    const matchesSearch = guest.name.toLowerCase().includes(search.toLowerCase()) ||
      guest.email?.toLowerCase().includes(search.toLowerCase());
    const matchesRsvp = rsvpFilter === 'all' || guest.rsvpStatus === rsvpFilter;
    return matchesSearch && matchesRsvp;
  });

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
        <h2 className="text-2xl font-display text-muted-foreground">Liste des invités</h2>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Total</p>
          <p className="text-3xl font-display font-semibold mt-1">{guestList.total}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Confirmés</p>
          <p className="text-3xl font-display font-semibold mt-1 text-primary">{guestList.confirmed}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">En attente</p>
          <p className="text-3xl font-display font-semibold mt-1">{guestList.pending}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Déclinés</p>
          <p className="text-3xl font-display font-semibold mt-1">{guestList.declined}</p>
        </Card>
      </div>

      {/* Filters & Actions */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher un invité..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
            data-testid="input-search-guest"
          />
        </div>
        <Select value={rsvpFilter} onValueChange={setRsvpFilter}>
          <SelectTrigger className="w-48" data-testid="select-filter-rsvp">
            <Filter className="w-4 h-4 mr-2" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les statuts</SelectItem>
            <SelectItem value="Confirmé">Confirmé</SelectItem>
            <SelectItem value="En attente">En attente</SelectItem>
            <SelectItem value="Décliné">Décliné</SelectItem>
          </SelectContent>
        </Select>
        <GuestDialog weddingId={weddingId}>
          <Button data-testid="button-add-guest">Ajouter un invité</Button>
        </GuestDialog>
      </div>

      {/* Guest Table */}
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nom</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Table</TableHead>
              <TableHead>Régime</TableHead>
              <TableHead>RSVP</TableHead>
              <TableHead>+1</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredGuests.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                  Aucun invité trouvé
                </TableCell>
              </TableRow>
            ) : (
              filteredGuests.map((guest) => (
                <TableRow key={guest.id} data-testid={`guest-row-${guest.id}`}>
                  <TableCell className="font-medium">{guest.name}</TableCell>
                  <TableCell className="text-muted-foreground">{guest.email || '—'}</TableCell>
                  <TableCell className="font-mono">{guest.tableNumber || '—'}</TableCell>
                  <TableCell className="text-sm">{guest.dietary || '—'}</TableCell>
                  <TableCell>
                    <StatusBadge status={guest.rsvpStatus} />
                  </TableCell>
                  <TableCell>{guest.plusOne ? 'Oui' : '—'}</TableCell>
                  <TableCell>
                    <GuestDialog weddingId={weddingId} guest={guest}>
                      <Button variant="ghost" size="sm" data-testid={`button-edit-guest-${guest.id}`}>
                        Modifier
                      </Button>
                    </GuestDialog>
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
