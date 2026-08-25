import {
  CalendarDays, Sparkles, ChevronRight, Plus, Clock3, MoreHorizontal,
  Users, Wallet, CheckSquare, TrendingUp,
} from 'lucide-react';
import { useUser } from '@clerk/react';
import { PageTour } from '@/components/ui/page-tour';
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
import { useLocation } from 'wouter';
import { useLanguage } from '@/lib/i18n';

/* ── Botanical SVG decoration ── */
function BotanicalSVG({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 120 220" fill="currentColor" xmlns="http://www.w3.org/2000/svg" className={className} aria-hidden>
      <path d="M60 215 Q56 175 52 135 Q48 90 58 48" stroke="currentColor" strokeWidth="1.4" fill="none" opacity="0.7"/>
      <path d="M58 48 Q32 28 18 50 Q12 72 58 68 Z" opacity="0.65"/>
      <path d="M54 85 Q26 68 14 92 Q10 114 54 104 Z" opacity="0.55"/>
      <path d="M52 122 Q78 104 90 128 Q94 150 52 138 Z" opacity="0.60"/>
      <path d="M50 158 Q24 140 14 165 Q10 188 50 174 Z" opacity="0.50"/>
      <circle cx="58" cy="42" r="5.5" opacity="0.60"/>
      <circle cx="68" cy="33" r="4" opacity="0.45"/>
      <circle cx="50" cy="31" r="4" opacity="0.45"/>
      <circle cx="62" cy="23" r="7" opacity="0.55"/>
      <circle cx="75" cy="22" r="3" opacity="0.35"/>
      <circle cx="50" cy="18" r="3" opacity="0.35"/>
    </svg>
  );
}

/* ── Section header ── */
function SectionTitle({
  eyebrow, title, action, onAction,
}: { eyebrow: string; title: string; action?: string; onAction?: () => void }) {
  return (
    <div className="mb-5 flex items-end justify-between">
      <div>
        <p className="eyebrow mb-1.5 text-[#a8893e]">{eyebrow}</p>
        <h2 className="font-serif text-[26px] leading-none text-foreground">{title}</h2>
      </div>
      {action && (
        <button
          onClick={onAction}
          className="flex items-center gap-1 text-[11px] font-semibold uppercase tracking-[0.15em] text-primary/60 transition hover:text-primary"
        >
          {action} <ChevronRight size={12} />
        </button>
      )}
    </div>
  );
}

/* ── Metric card ── */
type MetricColor = 'plum' | 'rose' | 'gold' | 'sage';
const metricStyles: Record<MetricColor, { card: string; icon: string; iconBg: string; note: string }> = {
  plum: {
    card: 'metric-plum',
    icon: 'text-primary',
    iconBg: 'bg-primary/10',
    note: 'text-primary/65',
  },
  rose: {
    card: 'metric-rose',
    icon: 'text-accent',
    iconBg: 'bg-accent/10',
    note: 'text-accent/70',
  },
  gold: {
    card: 'metric-gold',
    icon: 'text-[#a8893e]',
    iconBg: 'bg-[rgba(200,169,110,0.14)]',
    note: 'text-[#a8893e]/75',
  },
  sage: {
    card: 'metric-sage',
    icon: 'text-secondary',
    iconBg: 'bg-secondary/12',
    note: 'text-secondary/70',
  },
};

function MetricCard({
  color, icon: Icon, label, value, note,
}: { color: MetricColor; icon: React.ElementType; label: string; value: string; note: string }) {
  const s = metricStyles[color];
  return (
    <div className={`relative overflow-hidden rounded-2xl p-5 ${s.card}`}>
      <div className="absolute inset-x-0 top-0 h-px bg-white/80" />
      <div className={`mb-3 inline-flex items-center justify-center rounded-xl p-2 ${s.iconBg}`}>
        <Icon size={14} className={s.icon} strokeWidth={1.8} />
      </div>
      <p className="eyebrow mb-1 text-foreground/35">{label}</p>
      <p className="font-serif text-[32px] leading-none text-foreground">{value}</p>
      <p className={`mt-2 text-[11px] font-medium ${s.note}`}>{note}</p>
    </div>
  );
}

/* ── Vendor status styles ── */
const vendorStatusLabel: Record<string, string> = {
  confirmed: 'Confirmé',
  awaiting_contract: 'Contrat en attente',
  deposit_paid: 'Acompte versé',
  cancelled: 'Annulé',
};
const vendorBadgeClass: Record<string, string> = {
  confirmed: 'badge-confirmed',
  awaiting_contract: 'badge-pending',
  deposit_paid: 'badge-deposit',
  cancelled: 'badge-cancelled',
};
const vendorAvatarGradient: Record<string, string> = {
  confirmed: 'from-[rgba(100,144,100,0.25)] to-[rgba(100,144,100,0.10)]',
  awaiting_contract: 'from-[rgba(200,169,110,0.28)] to-[rgba(200,169,110,0.10)]',
  deposit_paid: 'from-[rgba(180,120,180,0.25)] to-[rgba(180,120,180,0.10)]',
  cancelled: 'from-[rgba(204,140,148,0.25)] to-[rgba(204,140,148,0.10)]',
};

/* ── Event tone date chip colors ── */
const toneChipClass: Record<string, string> = {
  gold: 'from-[rgba(200,169,110,0.22)] to-[rgba(200,169,110,0.08)] border-[rgba(200,169,110,0.35)]',
  rose: 'from-[rgba(204,140,148,0.22)] to-[rgba(204,140,148,0.08)] border-[rgba(204,140,148,0.35)]',
  sage: 'from-[rgba(100,144,100,0.20)] to-[rgba(100,144,100,0.08)] border-[rgba(100,144,100,0.30)]',
};

export default function Dashboard() {
  const { language, locale, formatDate: formatLocalizedDate, formatNumber } = useLanguage();
  const tr = (fr: string, en: string) => language === 'fr' ? fr : en;
  const { activeWeddingId } = useActiveWedding();
  const [, navigate] = useLocation();
  const { user } = useUser();
  const firstName = user?.firstName?.trim() || '';
  const hour = new Date().getHours();
  const greetingWord = hour < 12 ? tr('Bonjour', 'Good morning') : hour < 18 ? tr('Bonjour', 'Good afternoon') : tr('Bonsoir', 'Good evening');

  const { data: wedding, isLoading: weddingLoading } = useGetWedding(activeWeddingId!, {
    query: { enabled: !!activeWeddingId, queryKey: getGetWeddingQueryKey(activeWeddingId!) },
  });
  const { data: summary } = useGetWeddingSummary(activeWeddingId!);
  const { data: activity = [] } = useGetWeddingActivity(activeWeddingId!);
  const { data: vendors = [] } = useListVendors(activeWeddingId!);
  const { data: events = [] } = useListEvents(activeWeddingId!);

  if (!activeWeddingId || weddingLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <p className="font-serif text-2xl text-muted-foreground">{tr('Chargement…', 'Loading…')}</p>
      </div>
    );
  }
  if (!wedding) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <p className="font-serif text-2xl text-muted-foreground">{tr('Aucun mariage sélectionné', 'No wedding selected')}</p>
      </div>
    );
  }

  const upcomingEvents = events
    .filter((e) => !e.completed)
    .sort((a, b) => new Date(a.eventDate).getTime() - new Date(b.eventDate).getTime())
    .slice(0, 3);

  const safePct = (num: number, den: number) => (den > 0 ? Math.min(100, Math.round((num / den) * 100)) : 0);
  const budgetPct = summary ? safePct(summary.budgetSpent, summary.budgetTotal) : 0;
  const tasksPct = summary ? safePct(summary.tasksComplete, summary.tasksTotal) : 0;

  const activityColors = [
    'from-[rgba(204,140,148,0.30)] to-[rgba(204,140,148,0.12)]',
    'from-[rgba(200,169,110,0.30)] to-[rgba(200,169,110,0.12)]',
    'from-[rgba(180,120,180,0.28)] to-[rgba(180,120,180,0.10)]',
    'from-[rgba(100,144,100,0.25)] to-[rgba(100,144,100,0.10)]',
    'from-[rgba(204,140,148,0.22)] to-[rgba(204,140,148,0.08)]',
  ];

  return (
    <div>
      <PageTour
        tourKey="dashboard"
        pageTitle={tr('Aperçu', 'Overview')}
        pageIcon={Sparkles}
        steps={[
          { icon: TrendingUp, title: tr('Vue globale', 'Overview'), body: tr('Le bandeau du haut affiche les statistiques clés du mariage actif — budget consommé, invités confirmés, tâches complétées et compte à rebours jusqu\'au grand jour.', 'The header displays key statistics for the active wedding—budget spent, confirmed guests, completed tasks, and the countdown to the big day.') },
          { icon: CalendarDays, title: tr('Événements à venir', 'Upcoming events'), body: tr('Visualisez vos prochains rendez-vous, dégustations et répétitions. Cliquez sur « Voir le planning » pour ouvrir le calendrier complet.', 'View your upcoming appointments, tastings, and rehearsals. Click “View calendar” to open the full calendar.') },
          { icon: Users, title: tr('Prestataires récents', 'Recent vendors'), body: tr('Retrouvez vos derniers prestataires avec leur statut et leur devis. Cliquez sur une ligne pour accéder directement à la page Prestataires.', 'Find your latest vendors, along with their status and quote. Click a row to go directly to the Vendors page.') },
          { icon: Wallet, title: tr('Suivi budgétaire', 'Budget tracking'), body: tr('La progression budgétaire est résumée ici. Cliquez sur « Ouvrir le budget » pour consulter le détail par catégorie de dépenses.', 'Your budget progress is summarised here. Click “Open budget” for a breakdown by spending category.') },
        ]}
      />
      {/* ════════════════ HERO ════════════════ */}
      <div className="relative mb-8 overflow-hidden rounded-2xl hero-gradient-vivid p-8 ring-1 ring-white/60"
        style={{ boxShadow: '0 8px 40px rgba(93,45,93,0.10), inset 0 1px 0 rgba(255,255,255,0.85)' }}>

        {/* Botanical decoration */}
        <div className="pointer-events-none absolute -right-2 -top-4 w-44 text-primary opacity-[0.07]">
          <BotanicalSVG />
        </div>
        <div className="pointer-events-none absolute bottom-0 right-36 w-28 rotate-[160deg] text-accent opacity-[0.05]">
          <BotanicalSVG />
        </div>
        {/* Rim highlight */}
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/80 to-transparent" />

        <p className="eyebrow mb-3 flex items-center gap-2 text-[#a8893e]">
          <Sparkles size={12} strokeWidth={2} /> {tr('Mariage actif', 'Active wedding')}
        </p>

        <p className="mb-2 font-serif text-[18px] text-foreground/55 italic">
          {firstName ? `${greetingWord}, ${firstName}` : greetingWord}
        </p>

        <h1 className="font-serif text-[44px] leading-[0.88] text-foreground sm:text-[56px]">
          {wedding.names.split('&').map((name, idx) => (
            <span key={idx}>
              {idx > 0 && <span className="text-accent"> & </span>}
              {name.trim()}
            </span>
          ))}
        </h1>

        <p className="mt-4 flex items-center gap-2 text-[12px] text-muted-foreground">
          <CalendarDays size={13} className="text-[#a8893e]" />
          {formatLocalizedDate(wedding.weddingDate, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          <span className="text-border">·</span>
          {wedding.venue}
        </p>

        <div className="mt-7 flex flex-wrap gap-3">
          <button
            className="btn-glass flex items-center gap-2 rounded-xl px-5 py-2.5 text-[11px] font-semibold uppercase tracking-[0.12em]"
            data-testid="button-add-task"
            onClick={() => navigate('/calendrier')}
          >
            <Plus size={13} /> {tr('Ajouter une tâche', 'Add a task')}
          </button>
          <button
            className="btn-glow flex items-center gap-2 rounded-xl px-5 py-2.5 text-[11px] font-semibold uppercase tracking-[0.12em]"
            data-testid="button-open-workspace"
            onClick={() => navigate('/parametres')}
          >
            {tr('Modifier les informations', 'Edit details')} <ChevronRight size={13} />
          </button>
        </div>
      </div>

      {/* ════════════════ METRICS ════════════════ */}
      <div className="mb-10 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <MetricCard
          color="plum" icon={Clock3} label={tr('Jours restants', 'Days remaining')}
          value={summary?.daysUntil !== undefined ? formatNumber(summary.daysUntil) : '—'}
          note={summary?.daysUntil ? (summary.daysUntil > 60 ? tr('Planification lancée', 'Planning underway') : tr('Dernière ligne droite', 'Final stretch')) : '—'}
        />
        <MetricCard
          color="rose" icon={Users} label={tr('Invités', 'Guests')}
          value={summary?.totalGuests !== undefined ? formatNumber(summary.totalGuests) : '—'}
          note={summary ? tr(`${formatNumber(summary.totalGuests - summary.confirmedGuests)} à confirmer`, `${formatNumber(summary.totalGuests - summary.confirmedGuests)} to confirm`) : '—'}
        />
        <MetricCard
          color="gold" icon={Wallet} label={tr('Budget restant', 'Budget remaining')}
          value={summary ? formatCurrency(summary.budgetTotal - summary.budgetSpent) : '—'}
          note={tr(`${formatNumber(budgetPct)}% engagé`, `${formatNumber(budgetPct)}% committed`)}
        />
        <MetricCard
          color="sage" icon={CheckSquare} label={tr('Tâches terminées', 'Tasks completed')}
          value={`${formatNumber(tasksPct)}%`}
          note={summary ? tr(`${formatNumber(summary.tasksTotal - summary.tasksComplete)} à revoir`, `${formatNumber(summary.tasksTotal - summary.tasksComplete)} to review`) : '—'}
        />
      </div>

      {/* ════════════════ MAIN GRID ════════════════ */}
      <div className="grid gap-9 xl:grid-cols-[1.25fr_0.75fr]">

        {/* ── LEFT COL ── */}
        <section className="space-y-9">

          {/* Timeline */}
          <div>
            <SectionTitle eyebrow={tr('Les semaines à venir', 'The weeks ahead')} title={tr('Calendrier de planification', 'Planning calendar')}
              action={tr('Voir le planning', 'View calendar')} onAction={() => navigate('/calendrier')} />
            <div className="card-depth overflow-hidden">
              {upcomingEvents.length === 0 ? (
                <div className="px-6 py-10 text-center">
                  <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-primary/8">
                    <CalendarDays size={18} className="text-primary/50" />
                  </div>
                  <p className="text-[12px] text-muted-foreground">{tr('Aucun événement à venir', 'No upcoming events')}</p>
                </div>
              ) : (
                upcomingEvents.map((event, i) => {
                  const d = new Date(event.eventDate);
                  const day = d.getDate().toString().padStart(2, '0');
                   const month = d.toLocaleDateString(locale, { month: 'short' }).slice(0, 3).toUpperCase();
                  const chipClass = toneChipClass[event.tone ?? 'gold'] ?? toneChipClass.gold;

                  return (
                    <div key={event.id}
                      className={`group flex items-center gap-4 px-5 py-4 transition hover:bg-primary/[0.03] ${i < upcomingEvents.length - 1 ? 'border-b border-border/50' : ''}`}>
                      <div className={`flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-xl bg-gradient-to-br border ${chipClass}`}>
                        <span className="font-serif text-[22px] leading-5 text-foreground">{day}</span>
                        <span className="text-[7px] font-bold tracking-[0.14em] text-foreground/45">{month}</span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-[12px] font-semibold text-foreground">{event.title}</p>
                        <p className="mt-1 truncate text-[11px] text-muted-foreground">
                          {event.detail || '—'}{event.eventTime && ` · ${event.eventTime}`}
                        </p>
                      </div>
                      <button className="text-muted-foreground/40 opacity-0 transition-all group-hover:opacity-100">
                        <MoreHorizontal size={17} />
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Vendors */}
          <div>
            <SectionTitle eyebrow={tr('Choisis avec soin', 'Chosen with care')} title={tr('Votre équipe prestataires', 'Your vendor team')}
              action={tr('Gérer les prestataires', 'Manage vendors')} onAction={() => navigate('/prestataires')} />
            <div className="card-depth overflow-hidden">
              {vendors.slice(0, 4).map((vendor, i) => {
                const initials = vendor.name.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2);
                const avGrad = vendorAvatarGradient[vendor.status] ?? vendorAvatarGradient.confirmed;
                const badgeCls = vendorBadgeClass[vendor.status] ?? 'badge-pending';

                return (
                  <div key={vendor.id}
                    className={`flex items-center gap-4 px-5 py-4 transition hover:bg-primary/[0.03] ${i < Math.min(vendors.length, 4) - 1 ? 'border-b border-border/50' : ''}`}>
                    <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br font-serif text-[14px] text-foreground/70 ${avGrad}`}>
                      {initials}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[12px] font-semibold text-foreground">{vendor.name}</p>
                      <p className="mt-0.5 text-[10px] text-muted-foreground">{vendor.category}</p>
                    </div>
                    <span className={`hidden rounded-full px-2.5 py-1 text-[9px] font-semibold sm:inline ${badgeCls}`}>
                       {language === 'fr' ? (vendorStatusLabel[vendor.status] ?? vendor.status) : ({ confirmed: 'Confirmed', awaiting_contract: 'Contract pending', deposit_paid: 'Deposit paid', cancelled: 'Cancelled' }[vendor.status] ?? vendor.status)}
                    </span>
                    <span className="w-[72px] text-right font-serif text-[18px] text-muted-foreground">
                       {formatCurrency(vendor.totalAmountCents)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* ── RIGHT COL ── */}
        <aside className="space-y-9">

          {/* Budget */}
          <div>
            <SectionTitle eyebrow="Où en est-on" title="Aperçu du budget"
              action="Ouvrir le budget" onAction={() => navigate('/budget')} />
            <div className="card-depth relative p-6">
              <div className="absolute inset-x-0 top-0 h-px bg-white/80" />
              <div className="mb-5 flex items-end justify-between">
                <div>
                  <p className="eyebrow mb-1 text-foreground/35">Engagé</p>
                  <p className="font-serif text-[30px] leading-none text-foreground">
                    {summary ? formatCurrency(summary.budgetSpent) : '—'}
                    <span className="ml-1 font-sans text-[11px] text-muted-foreground">
                      / {summary ? formatCurrency(summary.budgetTotal) : '—'}
                    </span>
                  </p>
                </div>
                <span className={`rounded-full px-3 py-1 text-[11px] font-bold ${budgetPct > 80 ? 'badge-cancelled' : budgetPct > 50 ? 'badge-pending' : 'badge-confirmed'}`}>
                  {budgetPct}%
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-border/40">
                <div
                  className="h-full progress-gradient rounded-full transition-all duration-700"
                  style={{ width: `${budgetPct}%` }}
                />
              </div>
              {summary && (
                <p className="mt-3 text-[10px] text-muted-foreground">
                  {formatCurrency(summary.budgetTotal - summary.budgetSpent)} restant à engager
                </p>
              )}
            </div>
          </div>

          {/* Activity */}
          <div>
            <SectionTitle eyebrow="Votre studio" title="Activité récente" />
            <div className="space-y-4">
              {activity.slice(0, 5).map((item, i) => (
                <div className="flex gap-3" key={item.id}>
                  <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br text-[9px] font-semibold text-foreground/60 ${activityColors[i % activityColors.length]}`}>
                    {item.initials || '?'}
                  </span>
                  <div>
                    <p className="text-[11px] leading-snug text-foreground/75">{item.description}</p>
                    <p className="mt-1 text-[10px] text-muted-foreground/60">
                      {formatDate(item.createdAt, 'd MMM, HH:mm')}
                    </p>
                  </div>
                </div>
              ))}
              {activity.length === 0 && (
                <p className="text-[12px] text-muted-foreground">Aucune activité récente.</p>
              )}
            </div>
            {activity.length > 0 && (
              <button className="mt-6 flex items-center gap-1 text-[10px] font-semibold uppercase tracking-[0.15em] text-primary/55 transition hover:text-primary"
                data-testid="button-see-all-activity">
                Voir toute l'activité <ChevronRight size={12} />
              </button>
            )}
          </div>

          {/* Quick stats pill band */}
          {summary && (
            <div className="grid grid-cols-2 gap-3">
              <div className="metric-rose relative overflow-hidden rounded-2xl p-4">
                <div className="absolute inset-x-0 top-0 h-px bg-white/80" />
                <p className="eyebrow mb-1 text-foreground/35">Confirmés</p>
                <p className="font-serif text-[26px] leading-none text-foreground">{summary.confirmedGuests}</p>
                <p className="mt-1 text-[10px] text-accent/70">invités confirmés</p>
              </div>
              <div className="metric-sage relative overflow-hidden rounded-2xl p-4">
                <div className="absolute inset-x-0 top-0 h-px bg-white/80" />
                <p className="eyebrow mb-1 text-foreground/35">Terminées</p>
                <p className="font-serif text-[26px] leading-none text-foreground">{summary.tasksComplete}</p>
                <p className="mt-1 text-[10px] text-secondary/70">sur {summary.tasksTotal} tâches</p>
              </div>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
