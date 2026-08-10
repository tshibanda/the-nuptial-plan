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

function formatDate(date: Date) {
  return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
}

export default function Retroplanning() {
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
    const venue = wedding.venue || 'votre lieu de réception';
    const catererName = caterer?.name || 'votre traiteur';
    return [
      { title: 'Valider le lieu de réception', detail: venue, date: formatDate(shiftDate(wedding.weddingDate, -12)), tone: 'gold' },
      { title: 'Réserver le traiteur', detail: catererName, date: formatDate(shiftDate(wedding.weddingDate, -10)), tone: 'rose' },
      { title: 'Signer les contrats principaux', detail: 'Photographe, DJ, fleuriste et traiteur', date: formatDate(shiftDate(wedding.weddingDate, -8)), tone: 'sage' },
      { title: 'Finaliser le menu et les dégustations', detail: catererName, date: formatDate(shiftDate(wedding.weddingDate, -5)), tone: 'gold' },
      { title: 'Confirmer le planning avec les prestataires', detail: venue, date: formatDate(shiftDate(wedding.weddingDate, -2)), tone: 'rose' },
      { title: 'Jour J', detail: `${wedding.names} · ${venue}`, date: formatDate(new Date(`${wedding.weddingDate}T12:00:00`)), tone: 'sage' },
    ];
  }, [wedding, caterer]);

  if (!activeWeddingId || !wedding) {
    return <div className="flex min-h-[50vh] items-center justify-center text-center font-serif text-2xl text-muted-foreground">Sélectionnez un mariage pour générer son rétro-planning.</div>;
  }

  return (
    <div>
      <PageTour tourKey="retroplanning" pageTitle="Rétro-planning" pageIcon={CalendarClock}
        steps={[{ icon: CalendarClock, title: 'Toujours à jour', body: 'Les échéances se recalculent automatiquement lorsque la date, le lieu ou le traiteur change.' }]} />
      <div className="relative mb-8 overflow-hidden rounded-2xl hero-gradient-vivid px-8 py-7 ring-1 ring-white/60">
        <p className="eyebrow mb-2 text-[#a8893e]">Organisation sereine</p>
        <h1 className="font-serif text-[43px] leading-[0.9] text-foreground">Rétro-planning</h1>
        <p className="mt-3 max-w-2xl text-[11px] leading-relaxed text-muted-foreground">
          Un calendrier vivant pour {wedding.names}. Toute modification de la date, du lieu ou du traiteur est reflétée automatiquement.
        </p>
        <div className="mt-5 flex flex-wrap gap-2 text-[10px] text-muted-foreground">
          <span className="flex items-center gap-1.5 rounded-full bg-white/65 px-3 py-1.5"><CalendarClock size={12} /> {formatDate(new Date(`${wedding.weddingDate}T12:00:00`))}</span>
          <span className="flex items-center gap-1.5 rounded-full bg-white/65 px-3 py-1.5"><MapPin size={12} /> {wedding.venue}</span>
          <span className="flex items-center gap-1.5 rounded-full bg-white/65 px-3 py-1.5"><UtensilsCrossed size={12} /> {caterer?.name || 'Traiteur à définir'}</span>
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