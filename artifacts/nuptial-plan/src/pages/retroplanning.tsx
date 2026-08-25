import { CalendarClock, CheckCircle2, Circle, MapPin, UtensilsCrossed } from 'lucide-react';
import { useMemo } from 'react';
import { useActiveWedding } from '@/lib/wedding-context';
import {
  getGetWeddingQueryKey,
  getListVendorsQueryKey,
  useGetWedding,
  useListVendors,
} from '@workspace/api-client-react';
import { PageTour } from '@/components/ui/page-tour';
import { useLanguage } from '@/lib/i18n';

type Milestone = { title: string; detail: string; date: string; tone: 'gold' | 'sage' | 'rose' };

function shiftDate(date: string, months: number, days = 0) {
  const value = new Date(`${date}T12:00:00`);
  const originalDay = value.getDate();
  value.setDate(1);
  value.setMonth(value.getMonth() + months);
  const lastDayOfTargetMonth = new Date(value.getFullYear(), value.getMonth() + 1, 0).getDate();
  value.setDate(Math.min(originalDay, lastDayOfTargetMonth));
  value.setDate(value.getDate() + days);
  return value;
}

export default function Retroplanning() {
  const { language, formatDate } = useLanguage();
  const tr = (fr: string, en: string) => language === 'fr' ? fr : en;
  const { activeWeddingId } = useActiveWedding();
  const weddingId = activeWeddingId ?? 0;
  const { data: wedding } = useGetWedding(weddingId, {
    query: {
      enabled: !!activeWeddingId,
      queryKey: getGetWeddingQueryKey(weddingId),
      staleTime: 0,
      refetchOnMount: 'always',
    },
  });
  const { data: vendors = [] } = useListVendors(weddingId, {
    query: {
      enabled: !!activeWeddingId,
      queryKey: getListVendorsQueryKey(weddingId),
      staleTime: 0,
      refetchOnMount: 'always',
    },
  });

  const caterer = vendors.find((vendor) => /traiteur|catering|caterer/i.test(`${vendor.category} ${vendor.name}`));
  const milestones = useMemo<Milestone[]>(() => {
    if (!wedding?.weddingDate) return [];
    const venue = wedding.venue || tr('votre lieu de réception', 'your reception venue');
    const catererName = caterer?.name || tr('votre traiteur', 'your caterer');
    return [
      { title: tr('Valider le lieu de réception', 'Confirm the reception venue'), detail: venue, date: formatDate(shiftDate(wedding.weddingDate, -12), { day: 'numeric', month: 'long', year: 'numeric' }), tone: 'gold' },
      { title: tr('Réserver le traiteur', 'Book the caterer'), detail: catererName, date: formatDate(shiftDate(wedding.weddingDate, -10), { day: 'numeric', month: 'long', year: 'numeric' }), tone: 'rose' },
      { title: tr('Signer les contrats principaux', 'Sign the main contracts'), detail: tr('Photographe, DJ, fleuriste et traiteur', 'Photographer, DJ, florist and caterer'), date: formatDate(shiftDate(wedding.weddingDate, -8), { day: 'numeric', month: 'long', year: 'numeric' }), tone: 'sage' },
      { title: tr('Finaliser le menu et les dégustations', 'Finalise the menu and tastings'), detail: catererName, date: formatDate(shiftDate(wedding.weddingDate, -5), { day: 'numeric', month: 'long', year: 'numeric' }), tone: 'gold' },
      { title: tr('Confirmer le planning avec les prestataires', 'Confirm the schedule with vendors'), detail: venue, date: formatDate(shiftDate(wedding.weddingDate, -2), { day: 'numeric', month: 'long', year: 'numeric' }), tone: 'rose' },
      { title: tr('Jour J', 'Wedding day'), detail: `${wedding.names} · ${venue}`, date: formatDate(new Date(`${wedding.weddingDate}T12:00:00`), { day: 'numeric', month: 'long', year: 'numeric' }), tone: 'sage' },
    ];
  }, [wedding, caterer, formatDate, language]);

  if (!activeWeddingId || !wedding) {
    return <div className="flex min-h-[50vh] items-center justify-center text-center font-serif text-2xl text-muted-foreground">{tr('Sélectionnez un mariage pour générer son rétro-planning.', 'Select a wedding to generate its timeline.')}</div>;
  }

  return (
    <div>
      <PageTour tourKey="retroplanning" pageTitle={tr('Rétro-planning', 'Timeline')} pageIcon={CalendarClock}
        steps={[{ icon: CalendarClock, title: tr('Toujours à jour', 'Always up to date'), body: tr('Les échéances se recalculent automatiquement lorsque la date, le lieu ou le traiteur change.', 'Deadlines update automatically when the date, venue, or caterer changes.') }]} />
      <div className="relative mb-8 overflow-hidden rounded-2xl hero-gradient-vivid px-8 py-7 ring-1 ring-white/60">
        <p className="eyebrow mb-2 text-[#a8893e]">{tr('Organisation sereine', 'Stress-free planning')}</p>
        <h1 className="font-serif text-[43px] leading-[0.9] text-foreground">{tr('Rétro-planning', 'Timeline')}</h1>
        <p className="mt-3 max-w-2xl text-[11px] leading-relaxed text-muted-foreground">
          {tr(`Un calendrier vivant pour ${wedding.names}. Toute modification de la date, du lieu ou du traiteur est reflétée automatiquement.`, `A living calendar for ${wedding.names}. Changes to the date, venue, or caterer are reflected automatically.`)}
        </p>
        <div className="mt-5 flex flex-wrap gap-2 text-[10px] text-muted-foreground">
          <span className="flex items-center gap-1.5 rounded-full bg-white/65 px-3 py-1.5"><CalendarClock size={12} /> {formatDate(new Date(`${wedding.weddingDate}T12:00:00`), { day: 'numeric', month: 'long', year: 'numeric' })}</span>
          <span className="flex items-center gap-1.5 rounded-full bg-white/65 px-3 py-1.5"><MapPin size={12} /> {wedding.venue}</span>
          <span className="flex items-center gap-1.5 rounded-full bg-white/65 px-3 py-1.5"><UtensilsCrossed size={12} /> {caterer?.name || tr('Traiteur à définir', 'Caterer to be confirmed')}</span>
        </div>
      </div>
      <div className="relative ml-3 border-l border-primary/20 pl-8">
        {milestones.map((milestone, index) => (
          <div key={`${milestone.title}-${milestone.date}`} className="relative mb-6 last:mb-0">
            <span className={`absolute -left-[45px] top-1 flex h-6 w-6 items-center justify-center rounded-full border-4 border-background ${index === milestones.length - 1 ? 'bg-primary text-white' : 'bg-card text-primary'}`}>
              {index === milestones.length - 1 ? <CheckCircle2 size={13} /> : <Circle size={10} />}
            </span>
            <div className="card-depth flex flex-col gap-2 p-5 sm:flex-row sm:items-center sm:justify-between">
              <div><p className="text-[13px] font-semibold text-foreground">{milestone.title}</p><p className="mt-1 text-[11px] text-muted-foreground">{milestone.detail}</p></div>
              <span className="shrink-0 text-[10px] font-semibold uppercase tracking-[0.1em] text-primary">{milestone.date}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}