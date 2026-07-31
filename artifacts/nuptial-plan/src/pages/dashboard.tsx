import { CalendarDays, Sparkles, ChevronRight, Plus, Clock3, MoreHorizontal, CircleEllipsis } from 'lucide-react';
import { useActiveWedding } from '@/lib/wedding-context';
import {
  useGetWedding,
  useGetWeddingSummary,
  useGetWeddingActivity,
  useListVendors,
  useListEvents,
  getGetWeddingQueryKey,
} from '@workspace/api-client-react';
import { formatDate, formatCurrency, formatDateShort } from '@/lib/format';
import { useQueryClient } from '@tanstack/react-query';

function SectionTitle({ eyebrow, title, action, onAction }: { eyebrow: string; title: string; action?: string; onAction?: () => void }) {
  return (
    <div className="mb-5 flex items-end justify-between">
      <div>
        <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-[#9b8258]">{eyebrow}</p>
        <h2 className="font-serif text-[25px] leading-none text-foreground">{title}</h2>
      </div>
      {action && (
        <button onClick={onAction} className="text-[11px] font-semibold uppercase tracking-[0.15em] text-ring/80 hover:text-foreground" data-testid={`button-${action.toLowerCase().replace(/\s+/g, '-')}`}>
          {action}
        </button>
      )}
    </div>
  );
}

function Metric({ label, value, note, accent }: { label: string; value: string; note: string; accent: string }) {
  return (
    <div className="border-l border-[#d8ccb9] pl-5">
      <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.17em] text-[#8b837b]">{label}</p>
      <p className="font-serif text-[34px] leading-none text-foreground">{value}</p>
      <p className={`mt-2 text-[11px] ${accent}`}>{note}</p>
    </div>
  );
}

export default function Dashboard() {
  const { activeWeddingId } = useActiveWedding();
  const queryClient = useQueryClient();
  
  const { data: wedding, isLoading: weddingLoading } = useGetWedding(activeWeddingId!, {
    query: { enabled: !!activeWeddingId, queryKey: getGetWeddingQueryKey(activeWeddingId!) },
  });
  
  const { data: summary, isLoading: summaryLoading } = useGetWeddingSummary(activeWeddingId!);
  const { data: activity = [], isLoading: activityLoading } = useGetWeddingActivity(activeWeddingId!);
  const { data: vendors = [], isLoading: vendorsLoading } = useListVendors(activeWeddingId!);
  const { data: events = [], isLoading: eventsLoading } = useListEvents(activeWeddingId!);

  if (!activeWeddingId || weddingLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="text-center">
          <p className="font-serif text-2xl text-muted-foreground">Chargement...</p>
        </div>
      </div>
    );
  }

  if (!wedding) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="text-center">
          <p className="font-serif text-2xl text-muted-foreground">Aucun mariage sélectionné</p>
        </div>
      </div>
    );
  }

  const upcomingEvents = events
    .filter((e) => !e.completed)
    .sort((a, b) => new Date(a.eventDate).getTime() - new Date(b.eventDate).getTime())
    .slice(0, 3);

  const vendorStatusMap: Record<string, string> = {
    confirmed: 'Confirmé',
    awaiting_contract: 'Contrat en attente',
    deposit_paid: 'Acompte versé',
    cancelled: 'Annulé',
  };

  const vendorColorMap: Record<string, string> = {
    confirmed: 'bg-[#dce8df] text-[#5d7968]',
    awaiting_contract: 'bg-[#f0e2cb] text-[#967346]',
    deposit_paid: 'bg-[#e7e0ee] text-[#76677e]',
    cancelled: 'bg-[#f0ddd9] text-[#9d5449]',
  };

  const toneColorMap: Record<string, string> = {
    gold: 'bg-[#eadfc9]',
    rose: 'bg-[#eadede]',
    sage: 'bg-[#dce5df]',
  };

  const safePct = (num: number, den: number) => (den > 0 ? Math.min(100, Math.round((num / den) * 100)) : 0);
  const budgetPercentage = summary ? safePct(summary.budgetSpent, summary.budgetTotal) : 0;
  const tasksPercentage = summary ? safePct(summary.tasksComplete, summary.tasksTotal) : 0;

  return (
    <div>
      {/* Header */}
      <div className="mb-10 flex flex-col justify-between gap-5 xl:flex-row xl:items-end">
        <div>
          <p className="mb-3 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-[#9b8258]">
            <Sparkles size={13} /> Mariage actif
          </p>
          <h1 className="font-serif text-[43px] leading-[0.9] text-foreground sm:text-[54px]">
            {wedding.names.split('&').map((name, idx) => (
              <span key={idx}>
                {idx > 0 && <span className="text-[#ad8a58]"> & </span>}
                {name.trim()}
              </span>
            ))}
          </h1>
          <p className="mt-4 flex items-center gap-2 text-[12px] text-muted-foreground">
            <CalendarDays size={14} className="text-[#ad8a58]" />
            {formatDate(wedding.weddingDate, 'EEEE d MMMM yyyy')} <span className="text-[#c5b9aa]">·</span>{' '}
            {wedding.venue}
          </p>
        </div>
        <div className="flex gap-2">
          <button className="flex items-center gap-2 border border-border bg-card px-4 py-2.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground hover:border-[#a88a5d]" data-testid="button-add-task">
            <Plus size={14} /> Ajouter une tâche
          </button>
          <button className="flex items-center gap-2 bg-primary px-4 py-2.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-primary-foreground hover:bg-primary/90" data-testid="button-open-workspace">
            Ouvrir l'espace <ChevronRight size={14} />
          </button>
        </div>
      </div>

      {/* Metrics */}
      <div className="mb-12 grid grid-cols-2 gap-y-7 sm:grid-cols-4 sm:gap-0">
        <Metric
          label="Jours restants"
          value={summary?.daysUntil.toString() || '—'}
          note={summary?.daysUntil ? `${summary.daysUntil > 60 ? 'Planification lancée' : 'Entrée finale'}` : '—'}
          accent="text-[#788c83]"
        />
        <Metric
          label="Invités"
          value={summary?.totalGuests.toString() || '—'}
          note={summary ? `${summary.totalGuests - summary.confirmedGuests} à confirmer` : '—'}
          accent="text-[#9b8258]"
        />
        <Metric
          label="Budget restant"
          value={summary ? formatCurrency(summary.budgetTotal - summary.budgetSpent) : '—'}
          note={`${budgetPercentage}% engagé`}
          accent="text-[#788c83]"
        />
        <Metric
          label="Tâches terminées"
          value={`${tasksPercentage}%`}
          note={summary ? `${summary.tasksTotal - summary.tasksComplete} à revoir` : '—'}
          accent="text-[#9b8258]"
        />
      </div>

      {/* Main content grid */}
      <div className="grid gap-9 xl:grid-cols-[1.22fr_0.78fr]">
        <section>
          {/* Timeline */}
          <SectionTitle eyebrow="Les semaines à venir" title="Calendrier de planification" action="Voir le planning complet" />
          <div className="border-y border-border bg-card">
            {upcomingEvents.length === 0 ? (
              <div className="px-6 py-8 text-center text-[11px] text-[#858b89]">
                Aucun événement à venir
              </div>
            ) : (
              upcomingEvents.map((event) => {
                const eventDate = new Date(event.eventDate);
                const day = eventDate.getDate().toString().padStart(2, '0');
                const month = eventDate
                  .toLocaleDateString('fr-FR', { month: 'short' })
                  .slice(0, 3)
                  .toUpperCase();
                
                return (
                  <div
                    key={event.id}
                    className="group flex items-center gap-4 border-b border-[#e3dbd0] px-4 py-4 last:border-0 sm:px-6"
                  >
                    <div
                      className={`flex h-12 w-12 shrink-0 flex-col items-center justify-center ${event.tone ? toneColorMap[event.tone] : 'bg-[#eadfc9]'}`}
                    >
                      <span className="font-serif text-[22px] leading-5 text-foreground">{day}</span>
                      <span className="text-[8px] font-bold tracking-[0.13em] text-[#8c8177]">{month}</span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[12px] font-semibold text-[#3d4d55]">{event.title}</p>
                      <p className="mt-1 truncate text-[11px] text-[#858b89]">
                        {event.detail || '—'}
                        {event.eventTime && ` · ${event.eventTime}`}
                      </p>
                    </div>
                    <button className="text-[#9aa09c] opacity-0 transition group-hover:opacity-100" data-testid={`button-event-${event.id}`}>
                      <MoreHorizontal size={18} />
                    </button>
                  </div>
                );
              })
            )}
          </div>

          {/* Vendors */}
          <div className="mt-9">
            <SectionTitle eyebrow="Choisis avec soin" title="Votre équipe prestataires" action="Gérer les prestataires" />
            <div className="overflow-hidden border-y border-border bg-card">
              {vendors.slice(0, 4).map((vendor) => {
                const initials = vendor.name
                  .split(' ')
                  .map((w) => w[0])
                  .join('')
                  .toUpperCase()
                  .slice(0, 2);
                
                return (
                  <div
                    key={vendor.id}
                    className="flex items-center gap-3 border-b border-[#e3dbd0] px-4 py-4 last:border-0 sm:px-5"
                  >
                    <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#e8ddd0] font-serif text-[14px] text-muted-foreground">
                      {initials}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[12px] font-semibold text-[#3d4d55]">{vendor.name}</p>
                      <p className="mt-1 text-[10px] text-[#858b89]">{vendor.category}</p>
                    </div>
                    <span
                      className={`hidden rounded-full px-2.5 py-1 text-[9px] font-semibold sm:block ${vendorColorMap[vendor.status] || 'bg-[#f0e2cb] text-[#967346]'}`}
                    >
                      {vendorStatusMap[vendor.status] || vendor.status}
                    </span>
                    <span className="w-[72px] text-right font-serif text-[18px] text-muted-foreground">
                      {formatCurrency(vendor.totalAmountCents)}
                    </span>
                    <button className="text-[#a5a19a]" data-testid={`button-vendor-${vendor.id}`}>
                      <CircleEllipsis size={17} />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Sidebar */}
        <aside>
          {/* Budget overview */}
          <SectionTitle eyebrow="Où en est-on" title="Aperçu du budget" action="Ouvrir le budget" />
          <div className="border-y border-border bg-card px-5 py-5">
            <div className="mb-6 flex items-end justify-between">
              <div>
                <p className="text-[10px] uppercase tracking-[0.16em] text-[#8c8b86]">Engagé</p>
                <p className="mt-1 font-serif text-[30px] text-foreground">
                  {summary ? formatCurrency(summary.budgetSpent) : '—'}{' '}
                  <span className="font-sans text-[11px] text-[#8c8b86]">
                    / {summary ? formatCurrency(summary.budgetTotal) : '—'}
                  </span>
                </p>
              </div>
              <span className="text-[11px] font-semibold text-[#7c8e83]">{budgetPercentage}%</span>
            </div>
            <div className="h-1 bg-[#e6dfd5]">
              <div className="h-full bg-[#ab8b52]" style={{ width: `${budgetPercentage}%` }} />
            </div>
          </div>

          {/* Recent activity */}
          <div className="mt-9">
            <SectionTitle eyebrow="Votre studio" title="Activité récente" />
            <div className="space-y-5">
              {activity.slice(0, 3).map((item) => {
                const colorClasses = [
                  'bg-[#eadfdf]',
                  'bg-[#eadfc9]',
                  'bg-[#e8ddd0]',
                  'bg-[#dce5df]',
                  'bg-[#e7e0ee]',
                ];
                const colorIndex = item.id % colorClasses.length;
                
                return (
                  <div className="flex gap-3" key={item.id}>
                    <span
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[9px] font-semibold text-muted-foreground ${colorClasses[colorIndex]}`}
                    >
                      {item.initials || '—'}
                    </span>
                    <div>
                      <p className="text-[11px] leading-snug text-muted-foreground">{item.description}</p>
                      <p className="mt-1 text-[10px] text-[#a09e98]">
                        {formatDate(item.createdAt, 'd MMM, HH:mm')}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
            <button className="mt-6 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.15em] text-ring/80" data-testid="button-see-all-activity">
              Voir toute l'activité <ChevronRight size={13} />
            </button>
          </div>
        </aside>
      </div>
    </div>
  );
}
