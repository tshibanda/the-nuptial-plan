import { useState } from 'react';
import { useParams, Link } from 'wouter';
import { useListGuests, useGetWedding, getGetWeddingQueryKey } from '@workspace/api-client-react';
import { ArrowLeft, Search, Filter, Plus } from 'lucide-react';
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
      <div className="p-12 space-y-8">
        <Skeleton className="h-12 w-96" />
        <Skeleton className="h-96" />
      </div>
    );
  }

  if (!wedding || !guestList) {
    return (
      <div className="p-12">
        <p className="text-muted-foreground font-mono">Erreur de chargement.</p>
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
    <div className="min-h-[100dvh] p-12 max-w-7xl mx-auto space-y-8">
      <Link href={`/mariages/${weddingId}`} data-testid="link-back-wedding">
        <Button variant="ghost" size="sm" className="font-mono uppercase tracking-wider text-xs">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Retour au dossier
        </Button>
      </Link>

      <div className="space-y-3 border-b-2 border-border pb-6">
        <h1 className="text-5xl font-display font-semibold tracking-tight">{wedding.coupleName}</h1>
        <h2 className="text-2xl font-display text-muted-foreground uppercase tracking-wide">Liste des invités</h2>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="p-6 border-2">
          <p className="text-xs font-mono uppercase tracking-wider text-muted-foreground mb-2">Total</p>
          <p className="text-4xl font-display font-semibold">{guestList.total}</p>
        </Card>
        <Card className="p-6 border-2 bg-secondary/5">
          <p className="text-xs font-mono uppercase tracking-wider text-muted-foreground mb-2">Confirmés</p>
          <p className="text-4xl font-display font-semibold text-secondary">{guestList.confirmed}</p>
        </Card>
        <Card className="p-6 border-2">
          <p className="text-xs font-mono uppercase tracking-wider text-muted-foreground mb-2">En attente</p>
          <p className="text-4xl font-display font-semibold">{guestList.pending}</p>
        </Card>
        <Card className="p-6 border-2 bg-destructive/5">
          <p className="text-xs font-mono uppercase tracking-wider text-muted-foreground mb-2">Déclinés</p>
          <p className="text-4xl font-display font-semibold text-destructive">{guestList.declined}</p>
        </Card>
      </div>

      {/* Filters & Actions */}
      <div className="flex items-center gap-4 border-y-2 border-border py-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher par nom ou email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-11 border-2 font-mono"
            data-testid="input-search-guest"
          />
        </div>
        <Select value={rsvpFilter} onValueChange={setRsvpFilter}>
          <SelectTrigger className="w-56 border-2 font-mono uppercase tracking-wider text-xs" data-testid="select-filter-rsvp">
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
          <Button data-testid="button-add-guest" className="uppercase tracking-wider font-mono text-xs">
            <Plus className="w-4 h-4 mr-2" />
            Ajouter
          </Button>
        </GuestDialog>
      </div>

      {/* Guest Table */}
      <Card className="border-2">
        <Table>
          <TableHeader>
            <TableRow className="border-b-2 border-border hover:bg-transparent">
              <TableHead className="font-mono uppercase tracking-wider text-xs">Nom</TableHead>
              <TableHead className="font-mono uppercase tracking-wider text-xs">Email</TableHead>
              <TableHead className="font-mono uppercase tracking-wider text-xs">Table</TableHead>
              <TableHead className="font-mono uppercase tracking-wider text-xs">Régime</TableHead>
              <TableHead className="font-mono uppercase tracking-wider text-xs">RSVP</TableHead>
              <TableHead className="font-mono uppercase tracking-wider text-xs">+1</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredGuests.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-16 text-muted-foreground font-mono">
                  Aucun invité trouvé
                </TableCell>
              </TableRow>
            ) : (
              filteredGuests.map((guest) => (
                <TableRow key={guest.id} data-testid={`guest-row-${guest.id}`} className="border-b border-border hover:bg-muted/30">
                  <TableCell className="font-semibold">{guest.name}</TableCell>
                  <TableCell className="text-muted-foreground font-mono text-sm">{guest.email || '—'}</TableCell>
                  <TableCell className="font-mono font-semibold">{guest.tableNumber || '—'}</TableCell>
                  <TableCell className="text-sm font-mono uppercase tracking-wide">{guest.dietary || '—'}</TableCell>
                  <TableCell>
                    <StatusBadge status={guest.rsvpStatus} />
                  </TableCell>
                  <TableCell className="font-mono">{guest.plusOne ? 'Oui' : '—'}</TableCell>
                  <TableCell>
                    <GuestDialog weddingId={weddingId} guest={guest}>
                      <Button variant="ghost" size="sm" data-testid={`button-edit-guest-${guest.id}`} className="font-mono uppercase tracking-wider text-xs">
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
