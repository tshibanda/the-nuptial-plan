import { useState, useEffect, useCallback } from 'react';
import {
  Clock, Check, MapPin, User, Users, Plus, Heart,
  Mail, CheckCircle2, Circle, AlertCircle, ClipboardList,
  Calendar, Pencil, Trash2, FileDown, X,
} from 'lucide-react';
import { PageTour } from '@/components/ui/page-tour';
import { useActiveWedding } from '@/lib/wedding-context';
import {
  useListEvents, useCreateEvent, useUpdateEvent, useDeleteEvent,
  getListEventsQueryKey,
  useListVendors,
  useGetWedding,
} from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import { formatDate } from '@/lib/format';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { downloadRunsheetPDF } from '@/components/jour-j/runsheet-pdf';

/* ── Types ── */
type Tab = 'runsheet' | 'prestataires' | 'checklist';
type EventStatus = 'terminé' | 'en_cours' | 'en_retard' | 'à_venir';

interface CalEvent {
  id: number;
  title: string;
  detail?: string | null;
  eventDate: string;
  eventTime?: string | null;
  location?: string | null;
  actors?: string | null;
  tone?: string | null;
  completed: boolean;
}

interface Vendor {
  id: number;
  name: string;
  category?: string | null;
  status: string;
  contactName?: string | null;
  contactEmail?: string | null;
  totalAmountCents: number;
}

/* ── Event form state ── */
interface EventForm {
  title: string;
  eventDate: string;
  eventTime: string;
  location: string;
  actors: string;
  detail: string;
  tone: string;
}

const BLANK_FORM: EventForm = {
  title: '', eventDate: '', eventTime: '',
  location: '', actors: '', detail: '', tone: '',
};

/* ── Helpers ── */
function deriveStatus(event: CalEvent): EventStatus {
  if (event.completed) return 'terminé';
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0]!;
  if (event.eventDate < todayStr) return 'en_retard';
  if (event.eventDate === todayStr && event.eventTime) {
    const [h, m] = event.eventTime.split(':').map(Number);
    const t = new Date(); t.setHours(h!, m!, 0, 0);
    if (today >= t) return 'en_cours';
  }
  return 'à_venir';
}

function sortEvents(evts: CalEvent[]): CalEvent[] {
  return [...evts].sort((a, b) => {
    const d = a.eventDate.localeCompare(b.eventDate);
    if (d !== 0) return d;
    if (!a.eventTime && !b.eventTime) return 0;
    if (!a.eventTime) return 1;
    if (!b.eventTime) return -1;
    return a.eventTime.localeCompare(b.eventTime);
  });
}

/* ── Tone palette ── */
const TONES = [
  { key: 'plum',     hex: '#5D2D5D', label: 'Prune'    },
  { key: 'gold',     hex: '#C8A96E', label: 'Or'       },
  { key: 'rose',     hex: '#CC8C94', label: 'Rose'     },
  { key: 'sage',     hex: '#6B8C72', label: 'Sauge'    },
  { key: 'lavender', hex: '#9B89C4', label: 'Lavande'  },
  { key: 'blue',     hex: '#6B8FC0', label: 'Bleu'     },
];

const TONE_HEX: Record<string, string> = Object.fromEntries(TONES.map(t => [t.key, t.hex]));

/* ── Status badge ── */
function StatusBadge({ status }: { status: EventStatus }) {
  const map = {
    terminé:   { bg: 'bg-[#dce8df]', text: 'text-[#4a7157]', label: 'Terminé'   },
    en_cours:  { bg: 'bg-[#f3e8d4]', text: 'text-[#8a6530]', label: 'En cours'  },
    en_retard: { bg: 'bg-[#f1dfd0]', text: 'text-[#9d6246]', label: 'En retard' },
    à_venir:   { bg: 'bg-muted/60',  text: 'text-muted-foreground', label: 'À venir' },
  };
  const { bg, text, label } = map[status];
  return (
    <span className={`flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-semibold ${bg} ${text}`}>
      {status === 'en_cours'  && <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#c8954a]" />}
      {status === 'terminé'   && <Check size={9} strokeWidth={3} />}
      {status === 'en_retard' && <AlertCircle size={9} />}
      {label}
    </span>
  );
}

/* ── Progress bar ── */
function ProgressBar({ done, total }: { done: number; total: number }) {
  const pct = total === 0 ? 0 : Math.round((done / total) * 100);
  return (
    <div className="mb-8 rounded-2xl bg-card/80 p-5"
      style={{ border: '1px solid rgba(200,180,200,0.30)', boxShadow: '0 2px 16px rgba(93,45,93,0.04)' }}>
      <div className="mb-2 flex items-center justify-between">
        <span className="text-[12px] font-semibold text-foreground/70">Avancement du programme</span>
        <span className="font-serif text-[20px] leading-none text-foreground">
          {done}<span className="text-[13px] text-muted-foreground">/{total}</span>
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-muted/40">
        <div className="h-full rounded-full transition-all duration-500"
          style={{ width: `${pct}%`, background: 'linear-gradient(90deg, #5D2D5D, #C8A96E)' }} />
      </div>
      <p className="mt-1.5 text-right text-[10px] text-muted-foreground">{pct}% complété</p>
    </div>
  );
}

/* ── Runsheet tab ── */
function RunsheetTab({
  events, onToggle, onEdit, onDelete,
}: {
  events: CalEvent[];
  onToggle: (id: number, v: boolean) => void;
  onEdit: (event: CalEvent) => void;
  onDelete: (id: number) => void;
}) {
  if (events.length === 0) {
    return (
      <div className="py-16 text-center">
        <ClipboardList size={32} className="mx-auto mb-3 text-muted-foreground/30" />
        <p className="text-[14px] text-muted-foreground">Aucun événement planifié</p>
        <p className="mt-1 text-[12px] text-muted-foreground/60">Utilisez le bouton &laquo;&nbsp;Ajouter&nbsp;&raquo; ci-dessus</p>
      </div>
    );
  }

  const byDate: Record<string, CalEvent[]> = {};
  for (const e of events) {
    (byDate[e.eventDate] = byDate[e.eventDate] || []).push(e);
  }

  return (
    <div className="space-y-8">
      {Object.entries(byDate).map(([date, dayEvents]) => (
        <div key={date}>
          <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#a8893e]">
            {formatDate(date, 'EEEE d MMMM')}
          </p>
          <div className="space-y-2">
            {dayEvents.map((event) => {
              const status = deriveStatus(event);
              const accent = event.tone ? (TONE_HEX[event.tone] ?? '#5D2D5D') : '#5D2D5D';
              return (
                <div key={event.id}
                  className="group relative overflow-hidden rounded-xl transition-all"
                  style={{
                    background: status === 'terminé' ? 'rgba(200,180,200,0.06)'
                              : status === 'en_cours' ? 'rgba(200,150,74,0.06)'
                              : 'rgba(255,255,255,0.70)',
                    border: status === 'en_cours'
                      ? '1px solid rgba(200,150,74,0.30)'
                      : '1px solid rgba(200,180,200,0.30)',
                    opacity: status === 'terminé' ? 0.65 : 1,
                  }}>
                  {/* accent bar */}
                  <span className="absolute inset-y-0 left-0 w-[3px] rounded-l-xl"
                    style={{ background: status === 'en_cours' ? '#c8954a' : accent }} />

                  <div className="flex items-start gap-4 py-3.5 pl-4 pr-3">
                    {/* Time column */}
                    <div className="w-11 shrink-0 pt-0.5 text-right">
                      {event.eventTime ? (
                        <span className="font-serif text-[17px] leading-none"
                          style={{ color: status === 'terminé' ? '#a09e98' : status === 'en_cours' ? '#c8954a' : accent }}>
                          {event.eventTime.slice(0, 5)}
                        </span>
                      ) : (
                        <span className="text-[9px] text-muted-foreground/40">—</span>
                      )}
                    </div>

                    {/* Content */}
                    <div className="min-w-0 flex-1">
                      <div className="mb-1 flex items-start justify-between gap-2">
                        <p className={`text-[13px] font-semibold leading-tight ${status === 'terminé' ? 'text-muted-foreground line-through decoration-muted-foreground/40' : 'text-foreground'}`}>
                          {event.title}
                        </p>
                        <StatusBadge status={status} />
                      </div>

                      {/* Meta row: location + actors */}
                      {(event.location || event.actors) && (
                        <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5">
                          {event.location && (
                            <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                              <MapPin size={9} className="shrink-0 text-primary/40" /> {event.location}
                            </span>
                          )}
                          {event.actors && (
                            <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                              <Users size={9} className="shrink-0 text-primary/40" /> {event.actors}
                            </span>
                          )}
                        </div>
                      )}

                      {event.detail && (
                        <p className="mt-1 text-[11px] italic text-muted-foreground/70">{event.detail}</p>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex shrink-0 items-center gap-1">
                      {/* Edit */}
                      <button
                        onClick={() => onEdit(event)}
                        className="rounded-lg p-1.5 text-muted-foreground/30 opacity-0 transition hover:bg-primary/8 hover:text-primary group-hover:opacity-100"
                        aria-label="Modifier"
                      >
                        <Pencil size={13} />
                      </button>
                      {/* Delete */}
                      <button
                        onClick={() => onDelete(event.id)}
                        className="rounded-lg p-1.5 text-muted-foreground/30 opacity-0 transition hover:bg-destructive/10 hover:text-destructive group-hover:opacity-100"
                        aria-label="Supprimer"
                      >
                        <Trash2 size={13} />
                      </button>
                      {/* Toggle */}
                      <button
                        onClick={() => onToggle(event.id, !event.completed)}
                        className="ml-1 shrink-0 text-muted-foreground/30 transition hover:text-primary"
                        aria-label={event.completed ? 'Marquer non terminé' : 'Marquer terminé'}
                      >
                        {event.completed
                          ? <CheckCircle2 size={20} className="text-[#4a7157]" />
                          : <Circle size={20} />}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

/* ── Prestataires tab ── */
function PrestatairesTab({ vendors }: { vendors: Vendor[] }) {
  if (vendors.length === 0) {
    return (
      <div className="py-16 text-center">
        <User size={32} className="mx-auto mb-3 text-muted-foreground/30" />
        <p className="text-[14px] text-muted-foreground">Aucun prestataire enregistré</p>
      </div>
    );
  }
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {vendors.map((vendor) => {
        const initials = vendor.name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase();
        return (
          <div key={vendor.id} className="rounded-2xl bg-card/80 p-4"
            style={{ border: '1px solid rgba(200,180,200,0.30)', boxShadow: '0 2px 12px rgba(93,45,93,0.04)' }}>
            <div className="mb-3 flex items-center gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl font-serif text-[14px]"
                style={{ background: 'linear-gradient(135deg, rgba(200,169,110,0.15), rgba(200,169,110,0.06))', border: '1px solid rgba(200,169,110,0.28)', color: '#8a6530' }}>
                {initials}
              </span>
              <div className="min-w-0">
                <p className="truncate text-[13px] font-semibold text-foreground">{vendor.name}</p>
                {vendor.category && <p className="text-[11px] text-muted-foreground">{vendor.category}</p>}
              </div>
            </div>
            {(vendor.contactName || vendor.contactEmail) && (
              <div className="space-y-1.5 border-t border-border/40 pt-3">
                {vendor.contactName && (
                  <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                    <User size={10} className="shrink-0 text-primary/50" /> {vendor.contactName}
                  </p>
                )}
                {vendor.contactEmail && (
                  <a href={`mailto:${vendor.contactEmail}`}
                    className="flex items-center gap-1.5 text-[11px] text-primary/70 transition hover:text-primary">
                    <Mail size={10} className="shrink-0" /> {vendor.contactEmail}
                  </a>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ── Checklist tab ── */
function ChecklistTab({ events, onToggle }: { events: CalEvent[]; onToggle: (id: number, v: boolean) => void }) {
  const groups: [string, CalEvent[]][] = [
    ['Matinée',    events.filter(e => !e.eventTime || e.eventTime < '12:00')],
    ['Après-midi', events.filter(e => !!e.eventTime && e.eventTime >= '12:00' && e.eventTime < '18:00')],
    ['Soirée',     events.filter(e => !!e.eventTime && e.eventTime >= '18:00')],
  ];

  const hasAny = groups.some(([, g]) => g.length > 0);
  if (!hasAny) {
    return (
      <div className="py-16 text-center">
        <Check size={32} className="mx-auto mb-3 text-muted-foreground/30" />
        <p className="text-[14px] text-muted-foreground">Aucune tâche à afficher</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {groups.map(([label, grpEvents]) => {
        if (grpEvents.length === 0) return null;
        const done = grpEvents.filter(e => e.completed).length;
        return (
          <div key={label}>
            <div className="mb-2 flex items-center justify-between">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#a8893e]">{label}</p>
              <p className="text-[10px] text-muted-foreground">{done}/{grpEvents.length}</p>
            </div>
            <div className="overflow-hidden rounded-2xl" style={{ border: '1px solid rgba(200,180,200,0.30)' }}>
              {grpEvents.map((event, idx) => (
                <button key={event.id} onClick={() => onToggle(event.id, !event.completed)}
                  className={`flex w-full items-center gap-3 bg-card/70 px-4 py-3 text-left transition hover:bg-muted/30 ${idx < grpEvents.length - 1 ? 'border-b border-border/25' : ''}`}>
                  <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition ${event.completed ? 'border-[#4a7157] bg-[#4a7157]' : 'border-border/60'}`}>
                    {event.completed && <Check size={10} strokeWidth={3} className="text-white" />}
                  </span>
                  <span className={`flex-1 text-[12px] ${event.completed ? 'text-muted-foreground line-through decoration-muted-foreground/40' : 'text-foreground'}`}>
                    {event.title}
                  </span>
                  {event.eventTime && (
                    <span className="shrink-0 text-[10px] text-muted-foreground/50">{event.eventTime.slice(0, 5)}</span>
                  )}
                </button>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ── Event form dialog ── */
function EventFormDialog({
  open, onClose, onSave, initial, defaultDate,
}: {
  open: boolean;
  onClose: () => void;
  onSave: (form: EventForm) => void;
  initial?: CalEvent | null;
  defaultDate?: string;
}) {
  const [form, setForm] = useState<EventForm>(BLANK_FORM);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setForm(initial ? {
        title:     initial.title,
        eventDate: initial.eventDate,
        eventTime: initial.eventTime ?? '',
        location:  initial.location  ?? '',
        actors:    initial.actors    ?? '',
        detail:    initial.detail    ?? '',
        tone:      initial.tone      ?? '',
      } : { ...BLANK_FORM, eventDate: defaultDate ?? '' });
      setSaving(false);
    }
  }, [open, initial, defaultDate]);

  const set = useCallback((k: keyof EventForm, v: string) =>
    setForm(f => ({ ...f, [k]: v })), []);

  const handleSave = async () => {
    if (!form.title.trim() || !form.eventDate) return;
    setSaving(true);
    await onSave(form);
    setSaving(false);
  };

  const isEdit = !!initial;

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-serif text-[20px]">
            {isEdit ? "Modifier l'étape" : 'Nouvelle étape du déroulé'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-1">
          {/* Title */}
          <div className="space-y-1.5">
            <Label htmlFor="ev-title">Titre <span className="text-destructive">*</span></Label>
            <Input id="ev-title" value={form.title}
              onChange={e => set('title', e.target.value)}
              placeholder="Ex\u00a0: Cérémonie civile, Vin d'honneur…" />
          </div>

          {/* Date + Time */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="ev-date">Date <span className="text-destructive">*</span></Label>
              <Input id="ev-date" type="date" value={form.eventDate}
                onChange={e => set('eventDate', e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ev-time">Heure</Label>
              <Input id="ev-time" type="time" value={form.eventTime}
                onChange={e => set('eventTime', e.target.value)} />
            </div>
          </div>

          {/* Location */}
          <div className="space-y-1.5">
            <Label htmlFor="ev-location">
              <MapPin size={12} className="mr-1 inline-block text-primary/50" />
              Lieu
            </Label>
            <Input id="ev-location" value={form.location}
              onChange={e => set('location', e.target.value)}
              placeholder="Ex\u00a0: Salle de réception, Jardin, Mairie…" />
          </div>

          {/* Actors */}
          <div className="space-y-1.5">
            <Label htmlFor="ev-actors">
              <Users size={12} className="mr-1 inline-block text-primary/50" />
              Acteurs / Participants
            </Label>
            <Input id="ev-actors" value={form.actors}
              onChange={e => set('actors', e.target.value)}
              placeholder="Ex\u00a0: Mariés, Témoins, Photographe…" />
          </div>

          {/* Detail */}
          <div className="space-y-1.5">
            <Label htmlFor="ev-detail">Notes / Détails</Label>
            <textarea id="ev-detail" value={form.detail}
              onChange={e => set('detail', e.target.value)}
              rows={2}
              placeholder="Informations complémentaires, rappels…"
              className="w-full resize-none rounded-md border border-input bg-background px-3 py-2 text-[13px] text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/20" />
          </div>

          {/* Tone picker */}
          <div className="space-y-2">
            <Label>Couleur</Label>
            <div className="flex flex-wrap gap-2">
              {/* Clear option */}
              <button
                type="button"
                onClick={() => set('tone', '')}
                className={`flex h-8 w-8 items-center justify-center rounded-full border-2 transition ${form.tone === '' ? 'border-foreground/40' : 'border-transparent'}`}
                style={{ background: 'rgba(200,180,200,0.15)' }}
                title="Aucune"
                aria-label="Aucune couleur"
              >
                <X size={12} className="text-muted-foreground" />
              </button>
              {TONES.map(({ key, hex, label }) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => set('tone', key)}
                  title={label}
                  aria-label={label}
                  className={`h-8 w-8 rounded-full border-2 transition ${form.tone === key ? 'border-foreground/60 scale-110' : 'border-transparent hover:scale-105'}`}
                  style={{ background: hex, boxShadow: form.tone === key ? `0 0 0 3px ${hex}30` : undefined }}
                />
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 border-t border-border/30 pt-3">
            <Button variant="outline" size="sm" onClick={onClose} disabled={saving}>
              Annuler
            </Button>
            <Button size="sm" onClick={handleSave}
              disabled={!form.title.trim() || !form.eventDate || saving}
              style={{ background: 'linear-gradient(135deg, #5D2D5D, #3C1A3C)' }}>
              {saving ? 'Enregistrement…' : isEdit ? 'Enregistrer' : 'Ajouter'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ── Main page ── */
export default function JourJ() {
  const { activeWeddingId } = useActiveWedding();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [tab, setTab] = useState<Tab>('runsheet');
  const [clock, setClock] = useState('');

  /* Modal state */
  const [formOpen, setFormOpen]     = useState(false);
  const [editTarget, setEditTarget] = useState<CalEvent | null>(null);
  const [pdfLoading, setPdfLoading] = useState(false);

  /* Queries */
  const { data: wedding, isLoading: weddingLoading } = useGetWedding(activeWeddingId ?? 0, {
    query: { enabled: !!activeWeddingId },
  });
  const { data: rawEvents = [], isLoading: eventsLoading } = useListEvents(activeWeddingId!);
  const { data: vendors = [] } = useListVendors(activeWeddingId!);

  /* Mutations */
  const createEvent = useCreateEvent();
  const updateEvent = useUpdateEvent();
  const deleteEvent = useDeleteEvent();

  const events = rawEvents as CalEvent[];
  const sorted = sortEvents(events);
  const completedCount = events.filter(e => e.completed).length;

  /* Live clock */
  useEffect(() => {
    const fmt = () => new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    setClock(fmt());
    const iv = setInterval(() => setClock(fmt()), 60_000);
    return () => clearInterval(iv);
  }, []);

  /* Invalidate helper */
  const invalidate = useCallback(() => {
    if (activeWeddingId) queryClient.invalidateQueries({ queryKey: getListEventsQueryKey(activeWeddingId) });
  }, [activeWeddingId, queryClient]);

  /* Toggle done */
  const handleToggle = useCallback((id: number, completed: boolean) => {
    if (!activeWeddingId) return;
    updateEvent.mutate(
      { weddingId: activeWeddingId, id, data: { completed } },
      { onSuccess: invalidate, onError: () => toast({ title: 'Erreur', description: 'Impossible de mettre à jour.', variant: 'destructive' }) }
    );
  }, [activeWeddingId, updateEvent, invalidate, toast]);

  /* Open create modal (today's date as default) */
  const handleOpenCreate = () => {
    setEditTarget(null);
    setFormOpen(true);
  };

  /* Open edit modal */
  const handleEdit = (event: CalEvent) => {
    setEditTarget(event);
    setFormOpen(true);
  };

  /* Delete */
  const handleDelete = useCallback((id: number) => {
    if (!activeWeddingId) return;
    if (!window.confirm('Supprimer cette étape\u00a0?')) return;
    deleteEvent.mutate(
      { weddingId: activeWeddingId, id },
      { onSuccess: invalidate, onError: () => toast({ title: 'Erreur', description: 'Impossible de supprimer.', variant: 'destructive' }) }
    );
  }, [activeWeddingId, deleteEvent, invalidate, toast]);

  /* Save (create or update) */
  const handleSave = useCallback(async (form: EventForm) => {
    if (!activeWeddingId) return;
    const data = {
      title:     form.title.trim(),
      eventDate: form.eventDate,
      eventTime: form.eventTime || undefined,
      location:  form.location.trim()  || undefined,
      actors:    form.actors.trim()    || undefined,
      detail:    form.detail.trim()    || undefined,
      tone:      form.tone             || undefined,
    };

    if (editTarget) {
      updateEvent.mutate(
        { weddingId: activeWeddingId, id: editTarget.id, data },
        {
          onSuccess: () => { invalidate(); setFormOpen(false); },
          onError: () => toast({ title: 'Erreur', description: 'Impossible de modifier.', variant: 'destructive' }),
        }
      );
    } else {
      createEvent.mutate(
        { weddingId: activeWeddingId, data: { ...data, completed: false } },
        {
          onSuccess: () => { invalidate(); setFormOpen(false); },
          onError: () => toast({ title: 'Erreur', description: 'Impossible de créer.', variant: 'destructive' }),
        }
      );
    }
  }, [activeWeddingId, editTarget, createEvent, updateEvent, invalidate, toast]);

  /* PDF export */
  const handleExportPDF = useCallback(async () => {
    if (!wedding) return;
    setPdfLoading(true);
    try {
      await downloadRunsheetPDF(
        { names: wedding.names, weddingDate: wedding.weddingDate, venue: wedding.venue },
        sorted.map(e => ({
          id: e.id, title: e.title, eventDate: e.eventDate,
          eventTime: e.eventTime, location: e.location, actors: e.actors,
          detail: e.detail, tone: e.tone, completed: e.completed,
        }))
      );
    } catch {
      toast({ title: 'Erreur', description: "Impossible de générer le PDF.", variant: 'destructive' });
    } finally {
      setPdfLoading(false);
    }
  }, [wedding, sorted, toast]);

  if (!activeWeddingId) {
    return (
      <div className="flex min-h-[40vh] flex-col items-center justify-center text-center">
        <p className="font-serif text-[24px] text-foreground/60">Aucun mariage sélectionné</p>
      </div>
    );
  }

  if (weddingLoading || eventsLoading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <p className="text-[13px] text-muted-foreground">Chargement…</p>
      </div>
    );
  }

  const TABS = [
    { key: 'runsheet'     as const, label: 'Runsheet',     icon: ClipboardList },
    { key: 'prestataires' as const, label: 'Prestataires', icon: User          },
    { key: 'checklist'   as const, label: 'Checklist',    icon: Check         },
  ];

  return (
    <>
      <PageTour
        tourKey="jour-j"
        pageTitle="Jour J"
        pageIcon={Heart}
        steps={[
          { icon: Heart,         title: 'Déroulé du Jour J',  body: "Cet espace centralise tout le programme du grand jour — chronologie, prestataires joignables et liste de contrôle." },
          { icon: ClipboardList, title: 'Runsheet',            body: "Ajoutez et modifiez vos étapes directement ici. Indiquez l'heure, le lieu, les participants et des notes pour chaque moment." },
          { icon: User,          title: 'Prestataires',        body: "Accédez rapidement aux coordonnées de chaque prestataire pour les contacter en cas d'imprévu." },
          { icon: Check,         title: 'Checklist',           body: "Vos tâches regroupées par moment de la journée pour un suivi visuel rapide." },
        ]}
      />

      {/* Page header */}
      <div className="mb-8 flex items-start justify-between gap-4">
        <div>
          <p className="eyebrow mb-2 text-[#a8893e]">Grand jour</p>
          <h1 className="font-serif text-[38px] leading-[0.92] text-foreground">Jour J</h1>
          {wedding && (
            <p className="mt-2 flex items-center gap-2 text-[12px] text-muted-foreground">
              <Calendar size={12} className="text-[#a8893e]" />
              {formatDate(wedding.weddingDate, 'EEEE d MMMM yyyy')}
              {wedding.venue && (
                <><span className="text-border">·</span>{wedding.venue}</>
              )}
            </p>
          )}
        </div>
        <div className="flex shrink-0 flex-col items-end gap-2">
          {clock && (
            <div className="flex items-center gap-1.5 rounded-xl border border-border/50 bg-card/60 px-3 py-2 text-[13px] font-semibold tabular-nums text-foreground/70">
              <Clock size={12} className="text-[#a8893e]" /> {clock}
            </div>
          )}
          <div className="flex gap-2">
            <button
              onClick={handleExportPDF}
              disabled={pdfLoading || events.length === 0}
              className="flex items-center gap-1.5 rounded-xl border border-border/50 bg-card/60 px-3 py-2 text-[11px] font-medium text-muted-foreground transition hover:border-primary/30 hover:bg-primary/5 hover:text-primary disabled:opacity-40"
            >
              <FileDown size={12} />
              {pdfLoading ? 'Génération…' : 'Exporter PDF'}
            </button>
            <button
              onClick={handleOpenCreate}
              className="flex items-center gap-1.5 rounded-xl border border-primary/30 bg-primary/8 px-3 py-2 text-[11px] font-semibold text-primary transition hover:bg-primary/15"
            >
              <Plus size={12} /> Ajouter une étape
            </button>
          </div>
        </div>
      </div>

      {/* Progress */}
      <ProgressBar done={completedCount} total={events.length} />

      {/* Tab switcher */}
      <div className="mb-6 flex gap-1 rounded-2xl bg-muted/40 p-1"
        style={{ border: '1px solid rgba(200,180,200,0.25)' }}>
        {TABS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-xl py-2.5 text-[11px] font-semibold transition-all"
            style={tab === key
              ? { background: 'linear-gradient(135deg, #5D2D5D, #7A4A7A)', color: '#fff', boxShadow: '0 2px 8px rgba(93,45,93,0.25)' }
              : { color: 'rgba(0,0,0,0.45)' }}
          >
            <Icon size={12} /> {label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === 'runsheet' && (
        <RunsheetTab
          events={sorted}
          onToggle={handleToggle}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />
      )}
      {tab === 'prestataires' && <PrestatairesTab vendors={vendors as Vendor[]} />}
      {tab === 'checklist'    && <ChecklistTab events={sorted} onToggle={handleToggle} />}

      {/* Event form dialog */}
      <EventFormDialog
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSave={handleSave}
        initial={editTarget}
        defaultDate={wedding?.weddingDate ?? new Date().toISOString().split('T')[0]}
      />
    </>
  );
}
