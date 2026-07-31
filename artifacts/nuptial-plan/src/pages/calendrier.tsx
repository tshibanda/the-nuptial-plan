import { useState } from 'react';
import { Plus, Check, X } from 'lucide-react';
import { useActiveWedding } from '@/lib/wedding-context';
import {
  useListEvents,
  useCreateEvent,
  useUpdateEvent,
  useDeleteEvent,
  getListEventsQueryKey,
} from '@workspace/api-client-react';
import { formatDate } from '@/lib/format';
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

const eventSchema = z.object({
  title: z.string().min(1, 'Le titre est requis'),
  detail: z.string().optional(),
  eventDate: z.string().min(1, 'La date est requise'),
  eventTime: z.string().optional(),
  tone: z.enum(['gold', 'rose', 'sage']).optional(),
  completed: z.boolean().optional(),
});

type EventFormData = z.infer<typeof eventSchema>;

export default function Calendrier() {
  const { activeWeddingId } = useActiveWedding();
  const { data: events = [], isLoading } = useListEvents(activeWeddingId!);
  const [open, setOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<number | null>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const createEvent = useCreateEvent();
  const updateEvent = useUpdateEvent();
  const deleteEvent = useDeleteEvent();

  const form = useForm<EventFormData>({
    resolver: zodResolver(eventSchema),
    defaultValues: {
      title: '',
      detail: '',
      eventDate: '',
      eventTime: '',
      tone: 'gold',
      completed: false,
    },
  });

  const onSubmit = (data: EventFormData) => {
    if (!activeWeddingId) return;

    if (editingEvent) {
      updateEvent.mutate(
        { weddingId: activeWeddingId, id: editingEvent, data },
        {
          onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: getListEventsQueryKey(activeWeddingId) });
            toast({ title: 'Événement mis à jour' });
            setOpen(false);
            setEditingEvent(null);
            form.reset();
          },
        }
      );
    } else {
      createEvent.mutate(
        { weddingId: activeWeddingId, data },
        {
          onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: getListEventsQueryKey(activeWeddingId) });
            toast({ title: 'Événement ajouté' });
            setOpen(false);
            form.reset();
          },
        }
      );
    }
  };

  const handleEdit = (event: any) => {
    setEditingEvent(event.id);
    form.reset({
      title: event.title,
      detail: event.detail || '',
      eventDate: event.eventDate,
      eventTime: event.eventTime || '',
      tone: event.tone || 'gold',
      completed: event.completed || false,
    });
    setOpen(true);
  };

  const handleDelete = (id: number) => {
    if (!activeWeddingId) return;
    if (confirm('Supprimer cet événement ?')) {
      deleteEvent.mutate(
        { weddingId: activeWeddingId, id },
        {
          onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: getListEventsQueryKey(activeWeddingId) });
            toast({ title: 'Événement supprimé' });
          },
        }
      );
    }
  };

  const toggleComplete = (event: any) => {
    if (!activeWeddingId) return;
    updateEvent.mutate(
      {
        weddingId: activeWeddingId,
        id: event.id,
        data: { completed: !event.completed },
      },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListEventsQueryKey(activeWeddingId) });
        },
      }
    );
  };

  if (!activeWeddingId || isLoading) {
    return <div className="text-center font-serif text-2xl text-muted-foreground">Chargement...</div>;
  }

  const sortedEvents = [...events].sort(
    (a, b) => new Date(a.eventDate).getTime() - new Date(b.eventDate).getTime()
  );

  const toneColorMap: Record<string, string> = {
    gold: 'bg-[#eadfc9]',
    rose: 'bg-[#eadede]',
    sage: 'bg-[#dce5df]',
  };

  return (
    <div>
      <div className="mb-8 flex items-end justify-between">
        <div>
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-[#9b8258]">
            Les semaines à venir
          </p>
          <h1 className="font-serif text-[43px] leading-[0.9] text-[#263b48]">Calendrier</h1>
        </div>
        <Sheet
          open={open}
          onOpenChange={(o) => {
            setOpen(o);
            if (!o) {
              setEditingEvent(null);
              form.reset();
            }
          }}
        >
          <SheetTrigger asChild>
            <Button className="flex items-center gap-2 bg-[#263b48] px-4 py-2.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#f8f3ea] hover:bg-[#344f5c]" data-testid="button-add-event">
              <Plus size={14} /> Ajouter un événement
            </Button>
          </SheetTrigger>
          <SheetContent>
            <SheetHeader>
              <SheetTitle className="font-serif text-2xl">
                {editingEvent ? "Modifier l'événement" : "Nouvel événement"}
              </SheetTitle>
              <SheetDescription>
                {editingEvent ? 'Mettez à jour les informations' : 'Ajoutez un événement au calendrier'}
              </SheetDescription>
            </SheetHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="mt-6 space-y-4">
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Titre</FormLabel>
                      <FormControl>
                        <Input {...field} data-testid="input-event-title" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="detail"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Détails</FormLabel>
                      <FormControl>
                        <Textarea {...field} rows={2} data-testid="input-event-detail" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="eventDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Date</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} data-testid="input-event-date" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="eventTime"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Heure (optionnel)</FormLabel>
                      <FormControl>
                        <Input type="time" {...field} data-testid="input-event-time" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="tone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Couleur</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-event-tone">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="gold">Or</SelectItem>
                          <SelectItem value="rose">Rose</SelectItem>
                          <SelectItem value="sage">Sauge</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="flex gap-2 pt-4">
                  <Button type="submit" className="flex-1" data-testid="button-save-event">
                    {editingEvent ? 'Mettre à jour' : 'Ajouter'}
                  </Button>
                  {editingEvent && (
                    <Button
                      type="button"
                      variant="destructive"
                      onClick={() => handleDelete(editingEvent)}
                      data-testid="button-delete-event"
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

      {/* Events List */}
      <div className="border-y border-[#ddd3c6] bg-[#f8f5ef]">
        {sortedEvents.length === 0 ? (
          <div className="px-6 py-12 text-center text-[11px] text-[#858b89]">
            Aucun événement. Cliquez sur "Ajouter un événement" pour commencer.
          </div>
        ) : (
          sortedEvents.map((event) => {
            const eventDate = new Date(event.eventDate);
            const day = eventDate.getDate().toString().padStart(2, '0');
            const month = eventDate
              .toLocaleDateString('fr-FR', { month: 'short' })
              .slice(0, 3)
              .toUpperCase();

            return (
              <div
                key={event.id}
                className={`group flex items-center gap-4 border-b border-[#e3dbd0] px-4 py-4 last:border-0 sm:px-6 ${event.completed ? 'opacity-50' : ''}`}
              >
                <div
                  className={`flex h-12 w-12 shrink-0 flex-col items-center justify-center ${event.tone ? toneColorMap[event.tone] : 'bg-[#eadfc9]'}`}
                >
                  <span className="font-serif text-[22px] leading-5 text-[#263b48]">{day}</span>
                  <span className="text-[8px] font-bold tracking-[0.13em] text-[#8c8177]">{month}</span>
                </div>
                <div className="min-w-0 flex-1">
                  <p className={`text-[12px] font-semibold ${event.completed ? 'line-through' : 'text-[#3d4d55]'}`}>
                    {event.title}
                  </p>
                  <p className="mt-1 truncate text-[11px] text-[#858b89]">
                    {event.detail || '—'}
                    {event.eventTime && ` · ${event.eventTime}`}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => toggleComplete(event)}
                    className={`flex h-7 w-7 items-center justify-center rounded-full border-2 transition ${event.completed ? 'border-[#5d7968] bg-[#5d7968] text-white' : 'border-[#d8ccb9] text-transparent hover:border-[#5d7968]'}`}
                    data-testid={`button-toggle-event-${event.id}`}
                  >
                    <Check size={14} />
                  </button>
                  <button onClick={() => handleEdit(event)} className="text-[#a5a19a]" data-testid={`button-edit-event-${event.id}`}>
                    <Plus size={17} className="rotate-45" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
