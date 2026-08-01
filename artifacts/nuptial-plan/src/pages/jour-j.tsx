import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import {
  Clock, Check, MapPin, User, Plus, Heart,
  Mail, CheckCircle2, Circle, AlertCircle, ClipboardList, Calendar,
} from 'lucide-react';
import { PageTour } from '@/components/ui/page-tour';
import { useActiveWedding } from '@/lib/wedding-context';
import {
  useListEvents,
  useUpdateEvent,
  getListEventsQueryKey,
  useListVendors,
  useGetWedding,
} from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import { formatDate } from '@/lib/format';
import { useToast } from '@/hooks/use-toast';

/* ── Types ── */
type Tab = 'runsheet' | 'prestataires' | 'checklist';
type EventStatus = 'terminé' | 'en_cours' | 'en_retard' | 'à_venir';

interface CalEvent {
  id: number;
  title: string;
  detail?: string | null;
  eventDate: string;
  eventTime?: string | null;
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

/* ── Helpers ── */
function deriveStatus(event: CalEvent): EventStatus {
  if (event.completed) return 'terminé';
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];
  if (event.eventDate < todayStr) return 'en_retard';
  if (event.eventDate === todayStr && event.eventTime) {
    const [h, m] = event.eventTime.split(':').map(Number);
    const t = new Date();
    t.setHours(h, m, 0, 0);
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

const TONE_COLORS: Record<string, string> = {
  plum: '#5D2D5D', rose: '#CC8C94', sage: '#6B8C72',
  gold: '#C8A96E', blue: '#6B8FC0', lavender: '#9B89C4',
};

/* ── Status badge ── */
function StatusBadge({ status }: { status: EventStatus }) {
  const map = {
    terminé:   { bg: 'bg-[#dce8df]', text: 'text-[#4a7157]', label: 'Terminé' },
    en_cours:  { bg: 'bg-[#f3e8d4]', text: 'text-[#8a6530]', label: 'En cours' },
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
function RunsheetTab({ events, onToggle }: { events: CalEvent[]; onToggle: (id: number, v: boolean) => void }) {
  if (events.length === 0) {
    return (
      <div className="py-16 text-center">
        <ClipboardList size={32} className="mx-auto mb-3 text-muted-foreground/30" />
        <p className="text-[14px] text-muted-foreground">Aucun événement planifié</p>
        <p className="text-[12px] text-muted-foreground/60">Ajoutez des étapes depuis le Calendrier</p>
      </div>
    );
  }

  // Group by date
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
              const accent = event.tone ? (TONE_COLORS[event.tone] ?? '#5D2D5D') : '#5D2D5D';
              return (
                <div key={event.id} className="relative overflow-hidden rounded-xl transition-all"
                  style={{
                    background: status === 'terminé' ? 'rgba(200,180,200,0.06)'
                              : status === 'en_cours' ? 'rgba(200,150,74,0.06)'
                              : 'rgba(255,255,255,0.70)',
                    border: status === 'en_cours'
                      ? '1px solid rgba(200,150,74,0.30)'
                      : '1px solid rgba(200,180,200,0.30)',
                    opacity: status === 'terminé' ? 0.60 : 1,
                  }}>
                  {status === 'en_cours' && (
                    <span className="absolute inset-y-0 left-0 w-[3px] rounded-l-xl" style={{ background: '#c8954a' }} />
                  )}
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
                      {event.detail && (
                        <p className="mt-0.5 text-[11px] text-muted-foreground">{event.detail}</p>
                      )}
                    </div>

                    {/* Toggle */}
                    <button onClick={() => onToggle(event.id, !event.completed)}
                      className="shrink-0 text-muted-foreground/30 transition hover:text-primary"
                      aria-label={event.completed ? 'Marquer non terminé' : 'Marquer terminé'}>
                      {event.completed
                        ? <CheckCircle2 size={20} className="text-[#4a7157]" />
                        : <Circle size={20} />}
                    </button>
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
    ['Matinée',     events.filter(e => !e.eventTime || e.eventTime < '12:00')],
    ['Après-midi',  events.filter(e => !!e.eventTime && e.eventTime >= '12:00' && e.eventTime < '18:00')],
    ['Soirée',      events.filter(e => !!e.eventTime && e.eventTime >= '18:00')],
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
            <div className="overflow-hidden rounded-2xl"
              style={{ border: '1px solid rgba(200,180,200,0.30)' }}>
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

/* ── Main page ── */
export default function JourJ() {
  const { activeWeddingId } = useActiveWedding();
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [tab, setTab] = useState<Tab>('runsheet');
  const [clock, setClock] = useState('');

  const { data: wedding, isLoading: weddingLoading } = useGetWedding(activeWeddingId ?? 0, {
    query: { enabled: !!activeWeddingId },
  });
  const { data: rawEvents = [], isLoading: eventsLoading } = useListEvents(activeWeddingId!);
  const { data: vendors = [] } = useListVendors(activeWeddingId!);
  const updateEvent = useUpdateEvent();

  // Cast to our CalEvent interface
  const events = rawEvents as CalEvent[];

  // Live clock — updates every minute
  useEffect(() => {
    const fmt = () => new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    setClock(fmt());
    const iv = setInterval(() => setClock(fmt()), 60_000);
    return () => clearInterval(iv);
  }, []);

  const handleToggle = (id: number, completed: boolean) => {
    if (!activeWeddingId) return;
    updateEvent.mutate(
      { weddingId: activeWeddingId, id, data: { completed } },
      {
        onSuccess: () => queryClient.invalidateQueries({ queryKey: getListEventsQueryKey(activeWeddingId) }),
        onError: () => toast({ title: 'Erreur', description: 'Impossible de mettre à jour.', variant: 'destructive' }),
      }
    );
  };

  const sorted = sortEvents(events);
  const completedCount = events.filter(e => e.completed).length;

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
          { icon: Heart,        title: 'Déroulé du Jour J',  body: 'Cet espace centralise tout le programme du grand jour — chronologie, prestataires joignables et liste de contrôle.' },
          { icon: ClipboardList, title: 'Runsheet',           body: 'Retrouvez tous vos événements dans l\'ordre chronologique. Cochez-les au fil du déroulé pour suivre l\'avancement en temps réel.' },
          { icon: User,         title: 'Prestataires',        body: 'Accédez rapidement aux coordonnées de chaque prestataire pour les contacter en cas d\'imprévu.' },
          { icon: Check,        title: 'Checklist',           body: 'Vos tâches regroupées par moment de la journée pour un suivi visuel rapide.' },
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
          <button
            onClick={() => navigate('/calendrier')}
            className="flex items-center gap-1.5 rounded-xl border border-border/50 bg-card/60 px-3 py-2 text-[11px] font-medium text-muted-foreground transition hover:border-primary/30 hover:bg-primary/5 hover:text-primary"
          >
            <Plus size={12} /> Ajouter un événement
          </button>
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
              : { color: 'rgba(0,0,0,0.45)' }
            }
          >
            <Icon size={12} /> {label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === 'runsheet'     && <RunsheetTab     events={sorted}  onToggle={handleToggle} />}
      {tab === 'prestataires' && <PrestatairesTab vendors={vendors as Vendor[]} />}
      {tab === 'checklist'    && <ChecklistTab    events={sorted}  onToggle={handleToggle} />}
    </>
  );
}
