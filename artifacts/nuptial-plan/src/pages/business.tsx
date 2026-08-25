import { useEffect, useMemo, useState } from 'react';
import { BarChart3, BriefcaseBusiness, Calculator, FileCheck2, Megaphone, PiggyBank, Plus, ShieldCheck, Trash2, TrendingDown, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PageTour } from '@/components/ui/page-tour';
import { PremiumBadge } from '@/components/premium-badge';
import { PremiumPageGate, usePremiumStatus } from '@/components/premium-page-gate';
import { useUser } from '@clerk/react';
import { useLanguage } from '@/lib/i18n';

type Entry = { id: string; month: string; type: 'income' | 'expense'; label: string; amount: number };
type BusinessData = {
  hourlyRate: number;
  annualRevenue: number;
  fixedCosts: number;
  microThreshold: number;
  packagePrice: number;
  projectHours: number;
  insurance: boolean;
  entries: Entry[];
};
const storageKey = 'tnp-business';
const defaults: BusinessData = { hourlyRate: 45, annualRevenue: 0, fixedCosts: 0, microThreshold: 77700, packagePrice: 3500, projectHours: 80, insurance: false, entries: [] };
const reviewEmail = 'thenuptialplan2@yopmail.com';
const reviewBusinessData: BusinessData = {
  hourlyRate: 68, annualRevenue: 48600, fixedCosts: 740, microThreshold: 77700,
  packagePrice: 4200, projectHours: 72, insurance: true,
  entries: [
    { id: 'review-1', month: '2026-01', type: 'income', label: 'Maya & Daniel planning retainer', amount: 2100 },
    { id: 'review-2', month: '2026-02', type: 'expense', label: 'Planning studio software', amount: 189 },
    { id: 'review-3', month: '2026-03', type: 'income', label: 'Harper & Lewis coordination', amount: 2800 },
    { id: 'review-4', month: '2026-04', type: 'expense', label: 'Spring portfolio shoot', amount: 620 },
    { id: 'review-5', month: '2026-05', type: 'income', label: 'Olivia & James planning retainer', amount: 1350 },
  ],
};

export default function Business() {
  const { language, formatCurrency, formatNumber } = useLanguage();
  const fr = language === 'fr';
  const text = (french: string, english: string) => fr ? french : english;
  const { user } = useUser();
  const { isPremium, loading: premiumLoading } = usePremiumStatus();
  const [data, setData] = useState<BusinessData>(defaults);
  const [entry, setEntry] = useState({ month: new Date().toISOString().slice(0, 7), type: 'income' as Entry['type'], label: '', amount: '' });
  useEffect(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      if (!stored && user?.primaryEmailAddress?.emailAddress?.trim().toLowerCase() === reviewEmail) {
        setData(reviewBusinessData);
        localStorage.setItem(storageKey, JSON.stringify(reviewBusinessData));
      } else {
        setData({ ...defaults, ...JSON.parse(stored || '{}') });
      }
    } catch {
      setData(defaults);
    }
  }, [user?.id]);
  const persist = (next: BusinessData) => { setData(next); localStorage.setItem(storageKey, JSON.stringify(next)); };
  const totals = useMemo(() => data.entries.reduce((acc, item) => ({ income: acc.income + (item.type === 'income' ? item.amount : 0), expense: acc.expense + (item.type === 'expense' ? item.amount : 0) }), { income: 0, expense: 0 }), [data.entries]);
  const addEntry = () => { const amount = Number(entry.amount); if (!entry.label || !amount) return; persist({ ...data, entries: [...data.entries, { ...entry, id: `${Date.now()}`, amount }] }); setEntry({ ...entry, label: '', amount: '' }); };
  const removeEntry = (id: string) => persist({ ...data, entries: data.entries.filter((item) => item.id !== id) });
  if (!premiumLoading && !isPremium) return <PremiumPageGate featureLabel={text('votre espace Business', 'your Business workspace')} />;
  return <div>
    <PageTour tourKey="business" pageTitle="Business" pageIcon={BriefcaseBusiness} steps={[{ icon: Calculator, title: text('Pilotez votre activité', 'Run your business'), body: text('Mesurez votre vrai taux horaire, anticipez les mois creux et gardez une vision claire de vos charges.', 'Measure your real hourly rate, anticipate quieter months, and keep a clear view of your costs.') }]} />
    <div className="relative mb-8 overflow-hidden rounded-2xl hero-gradient-vivid px-8 py-7 ring-1 ring-white/60"><p className="eyebrow mb-2 text-[#a8893e]">{text('Votre activité de wedding planner', 'Your wedding-planning business')}</p><div className="flex items-center gap-3"><h1 className="font-serif text-[43px] leading-[0.9]">Business</h1><PremiumBadge /></div><p className="mt-3 max-w-2xl text-[11px] leading-relaxed text-muted-foreground">{text('Un espace personnel pour sortir du pilotage au feeling : trésorerie, rentabilité, acquisition et protection.', 'A personal workspace to move beyond instinct: cash flow, profitability, acquisition, and protection.')}</p></div>
    <div className="grid gap-4 md:grid-cols-4"><Metric icon={PiggyBank} label={text('Solde suivi', 'Tracked balance')} value={formatCurrency(totals.income - totals.expense)} tone="gold" /><Metric icon={Calculator} label={text('Taux horaire cible', 'Target hourly rate')} value={`${formatNumber(data.hourlyRate)} €/h`} tone="sage" /><Metric icon={TrendingUp} label={text('CA enregistré', 'Recorded revenue')} value={formatCurrency(totals.income)} tone="rose" /><Metric icon={TrendingDown} label={text('Marge avant plafond', 'Headroom before ceiling')} value={formatCurrency(Math.max(0, data.microThreshold - data.annualRevenue))} tone="gold" /></div>
    <div className="mt-6 grid gap-6 xl:grid-cols-[1.4fr_1fr]"><section className="card-depth p-6"><div className="mb-5 flex items-center gap-3"><BarChart3 size={18} className="text-primary" /><div><h2 className="font-serif text-2xl">{text('Trésorerie', 'Cash flow')}</h2><p className="text-[10px] text-muted-foreground">{text('Suivez les mois creux avant qu’ils ne vous surprennent.', 'Track quiet months before they catch you by surprise.')}</p></div></div><div className="grid gap-3 sm:grid-cols-5"><Input type="month" value={entry.month} onChange={(e) => setEntry({ ...entry, month: e.target.value })} /><Input placeholder={text('Libellé', 'Label')} value={entry.label} onChange={(e) => setEntry({ ...entry, label: e.target.value })} /><select value={entry.type} onChange={(e) => setEntry({ ...entry, type: e.target.value as Entry['type'] })} className="h-10 rounded-md border border-input bg-background px-3 text-[11px]"><option value="income">{text('Recette', 'Income')}</option><option value="expense">{text('Charge', 'Expense')}</option></select><Input type="number" placeholder={text('Montant €', 'Amount €')} value={entry.amount} onChange={(e) => setEntry({ ...entry, amount: e.target.value })} /><Button onClick={addEntry} className="gap-2"><Plus size={14} /> {text('Ajouter', 'Add')}</Button></div><div className="mt-5 space-y-2">{data.entries.length === 0 ? <p className="py-8 text-center text-[11px] text-muted-foreground">{text('Ajoutez vos encaissements et charges mensuels.', 'Add your monthly income and expenses.')}</p> : data.entries.slice().reverse().map((item) => <div key={item.id} className="flex items-center gap-3 border-b border-border/40 py-3 text-[11px]"><span className={`h-2 w-2 rounded-full ${item.type === 'income' ? 'bg-sage' : 'bg-rose-400'}`} /><span className="flex-1">{item.month} · {item.label}</span><strong className={item.type === 'income' ? 'text-sage' : 'text-destructive'}>{item.type === 'income' ? '+' : '-'}{item.amount} €</strong><button onClick={() => removeEntry(item.id)} className="text-muted-foreground hover:text-destructive"><Trash2 size={13} /></button></div>)}</div></section>
      <section className="card-depth p-6"><h2 className="font-serif text-2xl">{text('Garde-fous', 'Safeguards')}</h2><p className="mt-1 text-[10px] text-muted-foreground">{text('Les chiffres qui protègent vos décisions.', 'The numbers that protect your decisions.')}</p><div className="mt-5 space-y-4"><Setting label={text('Taux horaire réel minimum', 'Minimum actual hourly rate')} value={data.hourlyRate} suffix="€/h" onChange={(value) => persist({ ...data, hourlyRate: value })} /><Setting label={text('Charges fixes mensuelles', 'Monthly fixed costs')} value={data.fixedCosts} suffix="€" onChange={(value) => persist({ ...data, fixedCosts: value })} /><Setting label={text('CA annuel déjà sécurisé', 'Annual revenue already secured')} value={data.annualRevenue} suffix="€" onChange={(value) => persist({ ...data, annualRevenue: value })} /><Setting label={text('Plafond micro à surveiller', 'Micro-business cap to monitor')} value={data.microThreshold} suffix="€" onChange={(value) => persist({ ...data, microThreshold: value })} /></div><div className="mt-6 border-t border-border/40 pt-5"><div className="flex items-center gap-3"><ShieldCheck size={18} className={data.insurance ? 'text-sage' : 'text-primary'} /><div className="flex-1"><p className="text-[12px] font-semibold">{text('RC professionnelle', 'Professional liability insurance')}</p><p className="text-[10px] text-muted-foreground">{data.insurance ? text('À jour', 'Up to date') : text('À vérifier avant la prochaine saison', 'Check before next season')}</p></div><Button size="sm" variant="outline" onClick={() => persist({ ...data, insurance: !data.insurance })}>{data.insurance ? text('À jour', 'Up to date') : text('Marquer vérifiée', 'Mark as checked')}</Button></div></div></section></div>
    <div className="mt-6 grid gap-4 md:grid-cols-3"><Insight icon={TrendingDown} title={text('Hiver creux', 'Quiet season')} text={text('Constituez une réserve de 3 mois de charges fixes avant la haute saison.', 'Build a three-month fixed-cost reserve before the busy season.')} /><Insight icon={Megaphone} title={text('Acquisition diversifiée', 'Diversified acquisition')} text={text('Suivez les prospects venant du réseau, du SEO, des partenaires et des plateformes séparément.', 'Track prospects from referrals, SEO, partners and platforms separately.')} /><Insight icon={FileCheck2} title={text('Cadre professionnel', 'Professional framework')} text={text('Vérifiez plafond de CA, RC pro et clauses de responsabilité en cas de défaillance d’un prestataire.', 'Review revenue cap, liability cover and supplier failure clauses.')} /></div>
    <section className="card-depth mt-6 p-6"><div className="flex items-center gap-3"><Calculator size={18} className="text-primary" /><div><h2 className="font-serif text-2xl">{text('Tester un forfait', 'Test a package')}</h2><p className="text-[10px] text-muted-foreground">{text('Vérifiez votre taux horaire réel avant d’accepter un dossier.', 'Check your actual hourly rate before accepting a project.')}</p></div></div><div className="mt-5 grid gap-4 md:grid-cols-3"><Setting label={text('Prix du forfait', 'Package price')} value={data.packagePrice} suffix="€" onChange={(value) => persist({ ...data, packagePrice: value })} /><Setting label={text('Heures estimées, réunions incluses', 'Estimated hours, meetings included')} value={data.projectHours} suffix="h" onChange={(value) => persist({ ...data, projectHours: value })} /><div className="rounded-xl bg-primary/[0.06] p-4"><p className="text-[10px] text-muted-foreground">{text('Taux réel du dossier', 'Actual project rate')}</p><p className="mt-1 font-serif text-2xl text-primary">{data.projectHours > 0 ? Math.round(data.packagePrice / data.projectHours) : 0} €/h</p></div></div></section>
  </div>;
}
function Metric({ icon: Icon, label, value, tone }: { icon: typeof PiggyBank; label: string; value: string; tone: string }) { return <div className={`card-depth border-l-4 p-5 ${tone === 'gold' ? 'border-l-[#c8a96e]' : tone === 'sage' ? 'border-l-sage' : 'border-l-rose-300'}`}><Icon size={17} className="mb-4 text-primary" /><p className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground">{label}</p><p className="mt-1 font-serif text-2xl">{value}</p></div>; }
function Setting({ label, value, suffix, onChange }: { label: string; value: number; suffix: string; onChange: (value: number) => void }) { return <label className="block"><span className="mb-1 block text-[10px] text-muted-foreground">{label}</span><div className="flex items-center gap-2"><Input type="number" value={value} onChange={(e) => onChange(Number(e.target.value))} /><span className="text-[11px] text-muted-foreground">{suffix}</span></div></label>; }
function Insight({ icon: Icon, title, text }: { icon: typeof TrendingDown; title: string; text: string }) { return <div className="card-depth p-5"><Icon size={17} className="mb-3 text-primary" /><h3 className="font-serif text-xl">{title}</h3><p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">{text}</p></div>; }