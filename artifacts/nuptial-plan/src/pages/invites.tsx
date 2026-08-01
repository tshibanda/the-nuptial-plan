import { useState } from 'react';
import { Plus, UserCircle2 } from 'lucide-react';
import { useActiveWedding } from '@/lib/wedding-context';
import {
  useListGuests,
  useGetGuestStats,
  useCreateGuest,
  useUpdateGuest,
  useDeleteGuest,
  getListGuestsQueryKey,
  getGetGuestStatsQueryKey,
} from '@workspace/api-client-react';
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

const guestSchema = z.object({
  name: z.string().min(1, 'Le nom est requis'),
  email: z.string().email('Email invalide').optional().or(z.literal('')),
  tableNumber: z.string().optional(),
  dietaryRequirements: z.string().optional(),
  rsvpStatus: z.enum(['confirmed', 'pending', 'declined']),
  notes: z.string().optional(),
});

type GuestFormData = z.infer<typeof guestSchema>;

export default function Invites() {
  const { activeWeddingId } = useActiveWedding();
  const { data: guests = [], isLoading } = useListGuests(activeWeddingId!);
  const { data: stats } = useGetGuestStats(activeWeddingId!);
  const [open, setOpen] = useState(false);
  const [editingGuest, setEditingGuest] = useState<number | null>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const createGuest = useCreateGuest();
  const updateGuest = useUpdateGuest();
  const deleteGuest = useDeleteGuest();

  const form = useForm<GuestFormData>({
    resolver: zodResolver(guestSchema),
    defaultValues: {
      name: '',
      email: '',
      tableNumber: '',
      dietaryRequirements: '',
      rsvpStatus: 'pending',
      notes: '',
    },
  });

  const onSubmit = (data: GuestFormData) => {
    if (!activeWeddingId) return;

    if (editingGuest) {
      updateGuest.mutate(
        { weddingId: activeWeddingId, id: editingGuest, data },
        {
          onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: getListGuestsQueryKey(activeWeddingId) });
            queryClient.invalidateQueries({ queryKey: getGetGuestStatsQueryKey(activeWeddingId) });
            toast({ title: 'Invité mis à jour' });
            setOpen(false);
            setEditingGuest(null);
            form.reset();
          },
        }
      );
    } else {
      createGuest.mutate(
        { weddingId: activeWeddingId, data },
        {
          onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: getListGuestsQueryKey(activeWeddingId) });
            queryClient.invalidateQueries({ queryKey: getGetGuestStatsQueryKey(activeWeddingId) });
            toast({ title: 'Invité ajouté' });
            setOpen(false);
            form.reset();
          },
        }
      );
    }
  };

  const handleEdit = (guest: any) => {
    setEditingGuest(guest.id);
    form.reset({
      name: guest.name,
      email: guest.email || '',
      tableNumber: guest.tableNumber || '',
      dietaryRequirements: guest.dietaryRequirements || '',
      rsvpStatus: guest.rsvpStatus,
      notes: guest.notes || '',
    });
    setOpen(true);
  };

  const handleDelete = (id: number) => {
    if (!activeWeddingId) return;
    if (confirm('Supprimer cet invité ?')) {
      deleteGuest.mutate(
        { weddingId: activeWeddingId, id },
        {
          onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: getListGuestsQueryKey(activeWeddingId) });
            queryClient.invalidateQueries({ queryKey: getGetGuestStatsQueryKey(activeWeddingId) });
            toast({ title: 'Invité supprimé' });
          },
        }
      );
    }
  };

  const rsvpStatusMap: Record<string, string> = {
    confirmed: 'Confirmé',
    pending: 'En attente',
    declined: 'Décliné',
  };

  const rsvpColorMap: Record<string, string> = {
    confirmed: 'badge-confirmed',
    pending: 'badge-pending',
    declined: 'badge-cancelled',
  };

  if (!activeWeddingId || isLoading) {
    return <div className="text-center font-serif text-2xl text-muted-foreground">Chargement...</div>;
  }

  const confirmedPct = stats ? Math.round((stats.confirmed / stats.total) * 100) : 0;

  return (
    <div>
      <div className="relative mb-8 overflow-hidden rounded-2xl hero-gradient-vivid px-8 py-7 ring-1 ring-white/60"
        style={{ boxShadow: '0 4px 24px rgba(93,45,93,0.08), inset 0 1px 0 rgba(255,255,255,0.85)' }}>
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/80 to-transparent" />
        <div className="flex items-end justify-between">
          <div>
            <p className="eyebrow mb-2 text-[#a8893e]">La liste</p>
            <h1 className="font-serif text-[43px] leading-[0.9] text-foreground">Invités</h1>
          </div>
        <Sheet
          open={open}
          onOpenChange={(o) => {
            setOpen(o);
            if (!o) {
              setEditingGuest(null);
              form.reset();
            }
          }}
        >
          <SheetTrigger asChild>
            <Button size="default" className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.12em]" data-testid="button-add-guest">
              <Plus size={14} /> Ajouter un invité
            </Button>
          </SheetTrigger>
          <SheetContent className="overflow-y-auto">
            <SheetHeader>
              <SheetTitle className="font-serif text-2xl">
                {editingGuest ? "Modifier l'invité" : "Nouvel invité"}
              </SheetTitle>
              <SheetDescription>
                {editingGuest ? 'Mettez à jour les informations' : 'Ajoutez un invité à la liste'}
              </SheetDescription>
            </SheetHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="mt-6 space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nom complet</FormLabel>
                      <FormControl>
                        <Input {...field} data-testid="input-guest-name" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input type="email" {...field} data-testid="input-guest-email" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="rsvpStatus"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Statut RSVP</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-guest-status">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="pending">En attente</SelectItem>
                          <SelectItem value="confirmed">Confirmé</SelectItem>
                          <SelectItem value="declined">Décliné</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="tableNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Table</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Ex: Table 5" data-testid="input-guest-table" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="dietaryRequirements"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Régime alimentaire</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Ex: Végétarien" data-testid="input-guest-diet" />
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
                        <Textarea {...field} rows={3} data-testid="input-guest-notes" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="flex gap-2 pt-4">
                  <Button type="submit" className="flex-1" data-testid="button-save-guest">
                    {editingGuest ? 'Mettre à jour' : 'Ajouter'}
                  </Button>
                  {editingGuest && (
                    <Button
                      type="button"
                      variant="destructive"
                      onClick={() => handleDelete(editingGuest)}
                      data-testid="button-delete-guest"
                    >
                      Supprimer
                    </Button>
                  )}
                </div>
              </form>
            </Form>
          </SheetContent>
        </Sheet>
        </div>
      </div>

      {/* RSVP Stats */}
      {stats && (
        <div className="mb-8 grid gap-4 sm:grid-cols-4">
          <div className="relative overflow-hidden rounded-2xl metric-plum p-5">
            <div className="absolute inset-x-0 top-0 h-px bg-white/80" />
            <p className="eyebrow mb-1 text-foreground/35">Total invités</p>
            <p className="font-serif text-[32px] leading-none text-foreground">{stats.total}</p>
          </div>
          <div className="relative overflow-hidden rounded-2xl metric-sage p-5">
            <div className="absolute inset-x-0 top-0 h-px bg-white/80" />
            <p className="eyebrow mb-1 text-foreground/35">Confirmés</p>
            <p className="font-serif text-[32px] leading-none text-foreground">{stats.confirmed}</p>
            <div className="mt-3 h-1 overflow-hidden rounded-full bg-secondary/20">
              <div className="h-full rounded-full bg-secondary transition-all" style={{ width: `${confirmedPct}%` }} />
            </div>
          </div>
          <div className="relative overflow-hidden rounded-2xl metric-gold p-5">
            <div className="absolute inset-x-0 top-0 h-px bg-white/80" />
            <p className="eyebrow mb-1 text-foreground/35">En attente</p>
            <p className="font-serif text-[32px] leading-none text-foreground">{stats.pending}</p>
          </div>
          <div className="relative overflow-hidden rounded-2xl metric-rose p-5">
            <div className="absolute inset-x-0 top-0 h-px bg-white/80" />
            <p className="eyebrow mb-1 text-foreground/35">Déclinés</p>
            <p className="font-serif text-[32px] leading-none text-foreground">{stats.declined}</p>
          </div>
        </div>
      )}

      {/* Guests List */}
      <div className="card-depth overflow-hidden">
        {guests.length === 0 ? (
          <div className="px-6 py-12 text-center text-[11px] text-[#858b89]">
            Aucun invité. Cliquez sur "Ajouter un invité" pour commencer.
          </div>
        ) : (
          guests.map((guest) => {
            const initials = guest.name
              .split(' ')
              .map((w) => w[0])
              .join('')
              .toUpperCase()
              .slice(0, 2);

            return (
              <div
                key={guest.id}
                className="flex items-center gap-3 border-b border-[#e3dbd0] px-4 py-4 last:border-0 sm:px-5"
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-[rgba(200,169,110,0.25)] to-[rgba(200,169,110,0.08)] font-serif text-[14px] text-muted-foreground">
                  {initials}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[12px] font-semibold text-[#3d4d55]">{guest.name}</p>
                  <p className="mt-1 text-[10px] text-[#858b89]">
                    {guest.tableNumber || '—'} · {guest.dietaryRequirements || '—'}
                  </p>
                </div>
                <span
                  className={`hidden rounded-full px-2.5 py-1 text-[9px] font-semibold sm:block ${rsvpColorMap[guest.rsvpStatus] || 'badge-pending'}`}
                >
                  {rsvpStatusMap[guest.rsvpStatus] || guest.rsvpStatus}
                </span>
                <button className="text-[#a5a19a]" onClick={() => handleEdit(guest)} data-testid={`button-edit-guest-${guest.id}`}>
                  <UserCircle2 size={17} />
                </button>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
