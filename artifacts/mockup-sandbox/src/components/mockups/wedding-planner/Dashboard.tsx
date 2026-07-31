import { useState } from "react";
import {
  Bell,
  CalendarDays,
  Check,
  ChevronDown,
  ChevronRight,
  CircleEllipsis,
  Clock3,
  FileText,
  Home,
  Menu,
  MoreHorizontal,
  Plus,
  Search,
  Settings,
  Sparkles,
  Users,
  WalletCards,
  X,
} from "lucide-react";

const navItems = [
  { label: "Aperçu", icon: Home },
  { label: "Calendrier", icon: CalendarDays },
  { label: "Prestataires", icon: Users },
  { label: "Budget", icon: WalletCards },
  { label: "Documents", icon: FileText },
];

const weddings = [
  { names: "Sophie & James Hartwell", date: "18 OCT 2024", venue: "The Orangery at Wychwood", initials: "SH", active: true },
  { names: "Amelia & Theo Laurent", date: "02 NOV 2024", venue: "Villa Edera, Lake Como", initials: "AL" },
  { names: "Clara & Henry Whitmore", date: "14 JUN 2025", venue: "The Ned, London", initials: "CW" },
];

const milestones = [
  { date: "06", month: "SEP", title: "Final menu tasting", detail: "Terrace at One & Only", tone: "gold" },
  { date: "12", month: "SEP", title: "Stationery proof approval", detail: "Due to Élan Press", tone: "rose" },
  { date: "19", month: "SEP", title: "Ceremony rehearsal", detail: "The Orangery · 17:30", tone: "sage" },
];

const vendors = [
  { name: "Maison Floral Studio", category: "Florals & styling", status: "Confirmed", amount: "£8,450", initials: "MF", color: "bg-[#e8ddd0]" },
  { name: "Terrace at One & Only", category: "Catering & bar", status: "Confirmed", amount: "£18,900", initials: "TO", color: "bg-[#d8e0dc]" },
  { name: "Lumen & Co. Photography", category: "Photography", status: "Awaiting contract", amount: "£4,200", initials: "LC", color: "bg-[#eadfdf]" },
  { name: "Élan Press", category: "Stationery", status: "Deposit paid", amount: "£1,280", initials: "EP", color: "bg-[#ddd9e6]" },
];

const budget = [
  { label: "Venue & catering", spent: "£32,400", total: "£38,000", pct: 85, color: "bg-[#ab8b52]" },
  { label: "Design & florals", spent: "£12,650", total: "£15,000", pct: 84, color: "bg-[#bd9b73]" },
  { label: "Photography & film", spent: "£4,200", total: "£6,000", pct: 70, color: "bg-[#879b93]" },
  { label: "Stationery & details", spent: "£2,180", total: "£3,500", pct: 62, color: "bg-[#9d8b9c]" },
];

function SectionTitle({ eyebrow, title, action }: { eyebrow: string; title: string; action?: string }) {
  return <div className="mb-5 flex items-end justify-between"><div><p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-[#9b8258]">{eyebrow}</p><h2 className="font-serif text-[25px] leading-none text-[#263b48]">{title}</h2></div>{action && <button className="text-[11px] font-semibold uppercase tracking-[0.15em] text-[#8d7554] hover:text-[#263b48]">{action}</button>}</div>;
}

function Metric({ label, value, note, accent }: { label: string; value: string; note: string; accent: string }) {
  return <div className="border-l border-[#d8ccb9] pl-5"><p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.17em] text-[#8b837b]">{label}</p><p className="font-serif text-[34px] leading-none text-[#263b48]">{value}</p><p className={`mt-2 text-[11px] ${accent}`}>{note}</p></div>;
}

function LegacyDashboard() {
  const [activeNav, setActiveNav] = useState("Overview");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [selectedWedding, setSelectedWedding] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);

  const addTask = () => { setShowToast(true); window.setTimeout(() => setShowToast(false), 2600); };

  return (
    <div className="min-h-[100dvh] bg-[#f5f1eb] text-[#263b48]">
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;500;600;700&family=DM+Sans:wght@400;500;600;700&display=swap'); .font-serif{font-family:'Cormorant Garamond',serif}.font-sans{font-family:'DM Sans',sans-serif}`}</style>
      <div className="flex min-h-[100dvh] font-sans">
        <aside className={`fixed inset-y-0 left-0 z-30 w-[285px] -translate-x-full bg-[#263b48] text-[#f8f3ea] transition-transform duration-300 md:relative md:translate-x-0 ${mobileOpen ? "translate-x-0" : ""}`}>
          <div className="flex h-full flex-col px-7 py-8">
            <div className="mb-14 flex items-center justify-between"><div className="flex items-center gap-3"><span className="flex h-9 w-9 items-center justify-center border border-[#c3a269] font-serif text-[23px] text-[#d7bd88]">N</span><div><p className="font-serif text-[21px] leading-none">The Nuptial Plan</p><p className="mt-1 text-[9px] uppercase tracking-[0.17em] text-[#aeb8b6]">Atelier de planification nuptiale</p></div></div><button className="md:hidden" onClick={() => setMobileOpen(false)}><X size={18}/></button></div>
            <p className="mb-4 text-[9px] font-semibold uppercase tracking-[0.22em] text-[#9eacaa]">Your weddings</p>
            <div className="space-y-2">{weddings.map((w, i) => <button key={w.names} onClick={() => setSelectedWedding(i)} className={`group w-full rounded-sm px-3 py-3 text-left transition ${selectedWedding === i ? "bg-[#314c59]" : "hover:bg-[#2d4653]"}`}><div className="flex items-start gap-3"><span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[9px] font-semibold ${selectedWedding === i ? "bg-[#c8aa70] text-[#263b48]" : "bg-[#4b6169] text-[#d7ded8]"}`}>{w.initials}</span><span className="min-w-0"><span className="block truncate text-[12px] font-semibold text-[#f4eee5]">{w.names}</span><span className="mt-1 block text-[10px] text-[#aeb8b6]">{w.date}</span></span></div>{selectedWedding === i && <span className="ml-11 mt-2 block truncate text-[10px] text-[#c3c9c2]">{w.venue}</span>}</button>)}</div>
            <button className="mt-5 flex items-center gap-2 px-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#c8aa70] hover:text-[#e0c997]"><Plus size={14}/> Add wedding</button>
            <div className="mt-auto border-t border-[#415560] pt-5"><button className="flex w-full items-center gap-3 rounded-sm px-3 py-3 text-left hover:bg-[#2d4653]"><span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#d6c6af] text-[10px] font-bold text-[#263b48]">EC</span><span className="flex-1"><span className="block text-[12px] font-semibold">Elise Carter</span><span className="block text-[10px] text-[#aeb8b6]">Creative director</span></span><ChevronDown size={14} className="text-[#aeb8b6]"/></button></div>
          </div>
        </aside>
        {mobileOpen && <button aria-label="Close menu" className="fixed inset-0 z-20 bg-[#172a34]/40 md:hidden" onClick={() => setMobileOpen(false)} />}
        <main className="min-w-0 flex-1">
          <header className="flex h-[79px] items-center justify-between border-b border-[#ddd3c6] bg-[#f8f5ef] px-5 sm:px-9 lg:px-12"><div className="flex items-center gap-4"><button className="md:hidden" onClick={() => setMobileOpen(true)}><Menu size={20}/></button><div><p className="text-[10px] uppercase tracking-[0.2em] text-[#8d8981]">Friday, 30 August 2024</p><p className="mt-1 text-[12px] font-medium text-[#52616a]">Good morning, Elise</p></div></div><div className="flex items-center gap-5"><button className="hidden text-[#718087] sm:block"><Search size={18}/></button><button className="relative text-[#718087]"><Bell size={18}/><span className="absolute -right-1 -top-1 h-1.5 w-1.5 rounded-full bg-[#b48c4c]"/></button><div className="hidden h-6 w-px bg-[#ddd3c6] sm:block"/><button className="flex items-center gap-2 text-[11px] font-semibold text-[#52616a]" onClick={() => setMenuOpen(!menuOpen)}><span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#d6c6af] text-[9px] text-[#263b48]">EC</span><span className="hidden lg:block">Elise Carter</span><ChevronDown size={14}/></button>{menuOpen && <div className="absolute right-8 top-16 z-10 w-40 border border-[#ded4c8] bg-[#fffdf9] p-2 shadow-lg"><button className="flex w-full gap-2 p-2 text-left text-xs hover:bg-[#f5f1eb]"><Settings size={14}/> Settings</button></div>}</div></header>
          <div className="border-b border-[#ddd3c6] bg-[#f8f5ef] px-5 pt-8 sm:px-9 lg:px-12"><div className="flex gap-7 overflow-x-auto">{navItems.map(({ label, icon: Icon }) => <button key={label} onClick={() => setActiveNav(label)} className={`flex shrink-0 items-center gap-2 border-b-2 pb-4 text-[11px] font-semibold ${activeNav === label ? "border-[#b28c55] text-[#263b48]" : "border-transparent text-[#92918b] hover:text-[#52616a]"}`}><Icon size={14} strokeWidth={1.6}/>{label}</button>)}</div></div>
          <div className="mx-auto max-w-[1390px] px-5 py-9 sm:px-9 lg:px-12 lg:py-12">
            <div className="mb-10 flex flex-col justify-between gap-5 xl:flex-row xl:items-end"><div><p className="mb-3 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-[#9b8258]"><Sparkles size={13}/> Active wedding</p><h1 className="font-serif text-[43px] leading-[0.9] text-[#263b48] sm:text-[54px]">Sophie <span className="text-[#ad8a58]">&</span> James Hartwell</h1><p className="mt-4 flex items-center gap-2 text-[12px] text-[#758087]"><CalendarDays size={14} className="text-[#ad8a58]"/> Saturday, 18 October 2024 <span className="text-[#c5b9aa]">·</span> The Orangery at Wychwood</p></div><div className="flex gap-2"><button onClick={addTask} className="flex items-center gap-2 border border-[#cfc2b2] bg-[#f8f5ef] px-4 py-2.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#52616a] hover:border-[#a88a5d]"><Plus size={14}/> Add task</button><button onClick={addTask} className="flex items-center gap-2 bg-[#263b48] px-4 py-2.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#f8f3ea] hover:bg-[#344f5c]">Open workspace <ChevronRight size={14}/></button></div></div>
            <div className="mb-12 grid grid-cols-2 gap-y-7 sm:grid-cols-4 sm:gap-0"><Metric label="Days until" value="49" note="On track for October" accent="text-[#788c83]"/><Metric label="Guest count" value="126" note="2 RSVPs outstanding" accent="text-[#9b8258]"/><Metric label="Budget remaining" value="£14,570" note="61% committed" accent="text-[#788c83]"/><Metric label="Tasks complete" value="78%" note="12 tasks to review" accent="text-[#9b8258]"/></div>
            <div className="grid gap-9 xl:grid-cols-[1.22fr_0.78fr]">
              <section><SectionTitle eyebrow="The weeks ahead" title="Planning timeline" action="View full timeline"/><div className="border-y border-[#ddd3c6] bg-[#f8f5ef]">{milestones.map((m, i) => <div key={m.title} className="group flex items-center gap-4 border-b border-[#e3dbd0] px-4 py-4 last:border-0 sm:px-6"><div className={`flex h-12 w-12 shrink-0 flex-col items-center justify-center ${m.tone === "gold" ? "bg-[#eadfc9]" : m.tone === "rose" ? "bg-[#eadede]" : "bg-[#dce5df]"}`}><span className="font-serif text-[22px] leading-5 text-[#263b48]">{m.date}</span><span className="text-[8px] font-bold tracking-[0.13em] text-[#8c8177]">{m.month}</span></div><div className="min-w-0 flex-1"><p className="text-[12px] font-semibold text-[#3d4d55]">{m.title}</p><p className="mt-1 truncate text-[11px] text-[#858b89]">{m.detail}</p></div><span className="hidden items-center gap-1 text-[10px] text-[#9b8258] sm:flex"><Clock3 size={12}/> {i === 0 ? "In 7 days" : i === 1 ? "In 13 days" : "In 20 days"}</span><button className="text-[#9aa09c] opacity-0 transition group-hover:opacity-100"><MoreHorizontal size={18}/></button></div>)}</div><div className="mt-9"><SectionTitle eyebrow="Carefully chosen" title="Your vendor team" action="Manage vendors"/><div className="overflow-hidden border-y border-[#ddd3c6] bg-[#f8f5ef]">{vendors.map(v => <div key={v.name} className="flex items-center gap-3 border-b border-[#e3dbd0] px-4 py-4 last:border-0 sm:px-5"><span className={`flex h-9 w-9 items-center justify-center rounded-full font-serif text-[14px] text-[#52616a] ${v.color}`}>{v.initials}</span><div className="min-w-0 flex-1"><p className="truncate text-[12px] font-semibold text-[#3d4d55]">{v.name}</p><p className="mt-1 text-[10px] text-[#858b89]">{v.category}</p></div><span className={`hidden rounded-full px-2.5 py-1 text-[9px] font-semibold sm:block ${v.status === "Confirmed" ? "bg-[#dce8df] text-[#5d7968]" : v.status === "Deposit paid" ? "bg-[#e7e0ee] text-[#76677e]" : "bg-[#f0e2cb] text-[#967346]"}`}>{v.status}</span><span className="w-[72px] text-right font-serif text-[18px] text-[#52616a]">{v.amount}</span><button className="text-[#a5a19a]"><CircleEllipsis size={17}/></button></div>)}</div></div></section>
              <aside><div className="mb-9 overflow-hidden bg-[#263b48] text-[#f7f0e5]"><div className="relative h-36 overflow-hidden"><img src="/__mockup/images/hartwell-venue.jpg" alt="The Orangery at Wychwood" className="h-full w-full object-cover opacity-75"/><div className="absolute inset-0 bg-gradient-to-t from-[#263b48]/80 to-transparent"/><p className="absolute bottom-4 left-5 text-[10px] uppercase tracking-[0.2em] text-[#d4bd8d]">Venue dossier</p></div><div className="p-5"><p className="font-serif text-[25px]">The Orangery at Wychwood</p><p className="mt-2 text-[11px] leading-relaxed text-[#bdc8c4]">A private estate in the Cotswolds, reserved exclusively for the Hartwell celebration.</p><button className="mt-5 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.15em] text-[#d4bd8d]">View venue details <ChevronRight size={13}/></button></div></div><SectionTitle eyebrow="Where it stands" title="Budget overview" action="Open budget"/><div className="border-y border-[#ddd3c6] bg-[#f8f5ef] px-5 py-5"><div className="mb-6 flex items-end justify-between"><div><p className="text-[10px] uppercase tracking-[0.16em] text-[#8c8b86]">Committed</p><p className="mt-1 font-serif text-[30px] text-[#263b48]">£45,430 <span className="font-sans text-[11px] text-[#8c8b86]">/ £60,000</span></p></div><span className="text-[11px] font-semibold text-[#7c8e83]">75.7%</span></div>{budget.map(b => <div key={b.label} className="mb-5 last:mb-0"><div className="mb-2 flex justify-between text-[10px]"><span className="text-[#637177]">{b.label}</span><span className="text-[#8c8b86]">{b.spent} <span className="text-[#b6afa6]">/ {b.total}</span></span></div><div className="h-1 bg-[#e6dfd5]"><div className={`h-full ${b.color}`} style={{ width: `${b.pct}%` }}/></div></div>)}</div><div className="mt-9"><SectionTitle eyebrow="Your studio" title="Recent activity"/><div className="space-y-5">{[["LC","Lumen & Co. sent a revised contract","Today, 09:42","bg-[#eadfdf]"],["SH","Sophie approved the floral moodboard","Yesterday, 16:18","bg-[#eadfc9]"],["MF","Maison Floral Studio uploaded 3 files","Yesterday, 11:06","bg-[#e8ddd0]"]].map(a => <div className="flex gap-3" key={a[1]}><span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[9px] font-semibold text-[#52616a] ${a[3]}`}>{a[0]}</span><div><p className="text-[11px] leading-snug text-[#52616a]">{a[1]}</p><p className="mt-1 text-[10px] text-[#a09e98]">{a[2]}</p></div></div>)}</div><button className="mt-6 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.15em] text-[#8d7554]">See all activity <ChevronRight size={13}/></button></div></aside>
            </div>
          </div>
        </main>
      </div>
      {showToast && <div className="fixed bottom-6 right-6 z-40 flex items-center gap-3 bg-[#263b48] px-5 py-3 text-[11px] text-[#f8f3ea] shadow-xl"><Check size={15} className="text-[#d4bd8d]"/> New task ready to be added to the timeline.</div>}
    </div>
  );
}

const frenchNav = [
  { label: "Aperçu", icon: Home },
  { label: "Calendrier", icon: CalendarDays },
  { label: "Prestataires", icon: Users },
  { label: "Budget", icon: WalletCards },
  { label: "Invités", icon: Users },
  { label: "Contrats", icon: FileText },
  { label: "Documents", icon: FileText },
];

const contractRows = [
  ["Maison Floral Studio", "Signé", "£8 450", "£2 535", "12 Mar 2024"],
  ["Terrace at One & Only", "Signé", "£18 900", "£5 670", "08 Fév 2024"],
  ["Lumen & Co. Photography", "En attente", "£4 200", "—", "—"],
  ["Élan Press", "Partiel", "£1 280", "£640", "01 Avr 2024"],
];

export function Dashboard() {
  const [activeNav, setActiveNav] = useState("Aperçu");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [runsheetOpen, setRunsheetOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [showToast, setShowToast] = useState(false);

  const notify = (message = "Action enregistrée dans votre espace.") => {
    setShowToast(true);
    window.setTimeout(() => setShowToast(false), 2400);
    return message;
  };

  const guests = [
    ["Claire Fontaine", "Table 5", "Végétarien", "Confirmé", "bg-[#dce8df] text-[#5d7968]"],
    ["Marc & Sophie Duvall", "Table 2", "Viande", "En attente", "bg-[#f0e2cb] text-[#967346]"],
    ["Jean-Pierre Moreau", "Table 8", "Poisson", "Confirmé", "bg-[#dce8df] text-[#5d7968]"],
  ];

  return (
    <div className="min-h-[100dvh] bg-[#f5f1eb] text-[#263b48]">
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;500;600;700&family=DM+Sans:wght@400;500;600;700&display=swap'); .font-serif{font-family:'Cormorant Garamond',serif}.font-sans{font-family:'DM Sans',sans-serif}`}</style>
      <div className="flex min-h-[100dvh] font-sans">
        <aside className={`fixed inset-y-0 left-0 z-30 w-[285px] -translate-x-full bg-[#263b48] text-[#f8f3ea] transition-transform duration-300 md:relative md:translate-x-0 ${mobileOpen ? "translate-x-0" : ""}`}>
          <div className="flex h-full flex-col px-7 py-8">
            <div className="mb-14 flex items-center justify-between"><div className="flex items-center gap-3"><span className="flex h-9 w-9 items-center justify-center border border-[#c3a269] font-serif text-[23px] text-[#d7bd88]">N</span><div><p className="font-serif text-[21px] leading-none">The Nuptial Plan</p><p className="mt-1 text-[9px] uppercase tracking-[0.17em] text-[#aeb8b6]">Atelier de planification nuptiale</p></div></div><button className="md:hidden" onClick={() => setMobileOpen(false)}><X size={18}/></button></div>
            <p className="mb-4 text-[9px] font-semibold uppercase tracking-[0.22em] text-[#9eacaa]">Vos mariages</p>
            <div className="space-y-2">{weddings.map((w, i) => <button key={w.names} onClick={() => notify()} className={`group w-full rounded-sm px-3 py-3 text-left transition ${i === 0 ? "bg-[#314c59]" : "hover:bg-[#2d4653]"}`}><div className="flex items-start gap-3"><span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[9px] font-semibold ${i === 0 ? "bg-[#c8aa70] text-[#263b48]" : "bg-[#4b6169] text-[#d7ded8]"}`}>{w.initials}</span><span className="min-w-0"><span className="block truncate text-[12px] font-semibold text-[#f4eee5]">{w.names}</span><span className="mt-1 block text-[10px] text-[#aeb8b6]">{w.date}</span></span></div>{i === 0 && <span className="ml-11 mt-2 block truncate text-[10px] text-[#c3c9c2]">{w.venue}</span>}</button>)}</div>
            <button onClick={() => notify()} className="mt-5 flex items-center gap-2 px-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#c8aa70] hover:text-[#e0c997]"><Plus size={14}/> Ajouter un mariage</button>
            <div className="mt-auto border-t border-[#415560] pt-5"><button onClick={() => setMenuOpen(!menuOpen)} className="flex w-full items-center gap-3 rounded-sm px-3 py-3 text-left hover:bg-[#2d4653]"><span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#d6c6af] text-[10px] font-bold text-[#263b48]">EC</span><span className="flex-1"><span className="block text-[12px] font-semibold">Élise Caron</span><span className="block text-[10px] text-[#aeb8b6]">Directrice artistique</span></span><ChevronDown size={14} className="text-[#aeb8b6]"/></button></div>
          </div>
        </aside>
        {mobileOpen && <button aria-label="Fermer le menu" className="fixed inset-0 z-20 bg-[#172a34]/40 md:hidden" onClick={() => setMobileOpen(false)} />}
        <main className="min-w-0 flex-1">
          <header className="flex h-[79px] items-center justify-between border-b border-[#ddd3c6] bg-[#f8f5ef] px-5 sm:px-9 lg:px-12"><div className="flex items-center gap-4"><button className="md:hidden" onClick={() => setMobileOpen(true)}><Menu size={20}/></button><div><p className="text-[10px] uppercase tracking-[0.2em] text-[#8d8981]">Vendredi 30 août 2024</p><p className="mt-1 text-[12px] font-medium text-[#52616a]">Bonjour, Élise</p></div></div><div className="flex items-center gap-5"><button className="hidden text-[#718087] sm:block" onClick={() => notify()}><Search size={18}/></button><button className="relative text-[#718087]" onClick={() => notify()}><Bell size={18}/><span className="absolute -right-1 -top-1 h-1.5 w-1.5 rounded-full bg-[#b48c4c]"/></button><div className="hidden h-6 w-px bg-[#ddd3c6] sm:block"/><button className="flex items-center gap-2 text-[11px] font-semibold text-[#52616a]" onClick={() => setMenuOpen(!menuOpen)}><span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#d6c6af] text-[9px] text-[#263b48]">EC</span><span className="hidden lg:block">Élise Caron</span><ChevronDown size={14}/></button>{menuOpen && <div className="absolute right-8 top-16 z-10 w-48 border border-[#ded4c8] bg-[#fffdf9] p-2 shadow-lg"><button onClick={() => notify()} className="flex w-full gap-2 p-2 text-left text-xs hover:bg-[#f5f1eb]"><Settings size={14}/> Paramètres</button></div>}</div></header>
          <div className="border-b border-[#ddd3c6] bg-[#f8f5ef] px-5 pt-8 sm:px-9 lg:px-12"><div className="flex gap-7 overflow-x-auto">{frenchNav.map(({ label, icon: Icon }) => <button key={label} onClick={() => setActiveNav(label)} className={`flex shrink-0 items-center gap-2 border-b-2 pb-4 text-[11px] font-semibold ${activeNav === label ? "border-[#b28c55] text-[#263b48]" : "border-transparent text-[#92918b] hover:text-[#52616a]"}`}><Icon size={14} strokeWidth={1.6}/>{label}</button>)}</div></div>
          <div className="mx-auto max-w-[1390px] px-5 py-9 sm:px-9 lg:px-12 lg:py-12">
            {activeNav === "Contrats" ? <ContractTracker onAction={notify} /> : <><div className="mb-10 flex flex-col justify-between gap-5 xl:flex-row xl:items-end"><div><p className="mb-3 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-[#9b8258]"><Sparkles size={13}/> Mariage actif</p><h1 className="font-serif text-[43px] leading-[0.9] text-[#263b48] sm:text-[54px]">Sophie <span className="text-[#ad8a58]">&</span> James Hartwell</h1><p className="mt-4 flex items-center gap-2 text-[12px] text-[#758087]"><CalendarDays size={14} className="text-[#ad8a58]"/> Samedi 18 octobre 2024 <span className="text-[#c5b9aa]">·</span> The Orangery at Wychwood</p></div><div className="flex gap-2"><button onClick={() => notify()} className="flex items-center gap-2 border border-[#cfc2b2] bg-[#f8f5ef] px-4 py-2.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#52616a] hover:border-[#a88a5d]"><Plus size={14}/> Ajouter une tâche</button><button onClick={() => notify()} className="flex items-center gap-2 bg-[#263b48] px-4 py-2.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#f8f3ea] hover:bg-[#344f5c]">Ouvrir l'espace <ChevronRight size={14}/></button></div></div>
            <div className="mb-9 grid grid-cols-2 gap-y-7 sm:grid-cols-4 sm:gap-0"><Metric label="Jours restants" value="49" note="En bonne voie pour octobre" accent="text-[#788c83]"/><Metric label="Invités" value="126" note="2 RSVP à confirmer" accent="text-[#9b8258]"/><Metric label="Budget restant" value="£14 570" note="61 % engagé" accent="text-[#788c83]"/><Metric label="Tâches terminées" value="78 %" note="12 tâches à revoir" accent="text-[#9b8258]"/></div>
            <PendingApprovals onAction={notify}/><div className="grid gap-9 xl:grid-cols-[1.22fr_0.78fr]">
              <section><SectionTitle eyebrow="Les semaines à venir" title="Calendrier de planification" action="Voir le planning complet"/><div className="border-y border-[#ddd3c6] bg-[#f8f5ef]">{milestones.map((m, i) => <div key={m.title} className="group flex items-center gap-4 border-b border-[#e3dbd0] px-4 py-4 last:border-0 sm:px-6"><div className={`flex h-12 w-12 shrink-0 flex-col items-center justify-center ${m.tone === "gold" ? "bg-[#eadfc9]" : m.tone === "rose" ? "bg-[#eadede]" : "bg-[#dce5df]"}`}><span className="font-serif text-[22px] leading-5 text-[#263b48]">{m.date}</span><span className="text-[8px] font-bold tracking-[0.13em] text-[#8c8177]">{m.month}</span></div><div className="min-w-0 flex-1"><p className="text-[12px] font-semibold text-[#3d4d55]">{["Dégustation finale du menu", "Validation des épreuves de papeterie", "Répétition de la cérémonie"][i]}</p><p className="mt-1 truncate text-[11px] text-[#858b89]">{["Terrace at One & Only", "À remettre à Élan Press", "The Orangery · 17 h 30"][i]}</p></div><span className="hidden items-center gap-1 text-[10px] text-[#9b8258] sm:flex"><Clock3 size={12}/> Dans {i === 0 ? "7 jours" : i === 1 ? "13 jours" : "20 jours"}</span><button onClick={() => notify()} className="text-[#9aa09c] opacity-0 transition group-hover:opacity-100"><MoreHorizontal size={18}/></button></div>)}</div>
              <div className="mt-9"><SectionTitle eyebrow="Choisis avec soin" title="Votre équipe prestataires" action="Gérer les prestataires"/><div className="overflow-hidden border-y border-[#ddd3c6] bg-[#f8f5ef]">{vendors.map(v => <div key={v.name} className="flex items-center gap-3 border-b border-[#e3dbd0] px-4 py-4 last:border-0 sm:px-5"><span className={`flex h-9 w-9 items-center justify-center rounded-full font-serif text-[14px] text-[#52616a] ${v.color}`}>{v.initials}</span><div className="min-w-0 flex-1"><p className="truncate text-[12px] font-semibold text-[#3d4d55]">{v.name}</p><p className="mt-1 text-[10px] text-[#858b89]">{["Fleurs & scénographie", "Traiteur & bar", "Photographie", "Papeterie"][vendors.indexOf(v)]}</p></div><span className={`hidden rounded-full px-2.5 py-1 text-[9px] font-semibold sm:block ${v.status === "Confirmed" ? "bg-[#dce8df] text-[#5d7968]" : v.status === "Deposit paid" ? "bg-[#e7e0ee] text-[#76677e]" : "bg-[#f0e2cb] text-[#967346]"}`}>{v.status === "Confirmed" ? "Confirmé" : v.status === "Deposit paid" ? "Acompte versé" : "Contrat en attente"}</span><span className="w-[72px] text-right font-serif text-[18px] text-[#52616a]">{v.amount}</span><button onClick={() => notify()} className="text-[#a5a19a]"><CircleEllipsis size={17}/></button></div>)}</div></div>
              <PaymentTracker onAction={notify}/>
              </section>
              <aside><div className="mb-9 overflow-hidden bg-[#263b48] text-[#f7f0e5]"><div className="relative h-36 overflow-hidden"><img src="/__mockup/images/hartwell-venue.jpg" alt="The Orangery at Wychwood" className="h-full w-full object-cover opacity-75"/><div className="absolute inset-0 bg-gradient-to-t from-[#263b48]/80 to-transparent"/><p className="absolute bottom-4 left-5 text-[10px] uppercase tracking-[0.2em] text-[#d4bd8d]">Dossier du lieu</p></div><div className="p-5"><p className="font-serif text-[25px]">The Orangery at Wychwood</p><p className="mt-2 text-[11px] leading-relaxed text-[#bdc8c4]">Un domaine privé dans les Cotswolds, réservé exclusivement pour la célébration Hartwell.</p><button onClick={() => notify()} className="mt-5 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.15em] text-[#d4bd8d]">Voir les détails du lieu <ChevronRight size={13}/></button></div></div>
              <GuestManagement guests={guests} onAction={notify}/><div className="mt-9"><SectionTitle eyebrow="Où en est-on" title="Aperçu du budget" action="Ouvrir le budget"/><div className="border-y border-[#ddd3c6] bg-[#f8f5ef] px-5 py-5"><div className="mb-6 flex items-end justify-between"><div><p className="text-[10px] uppercase tracking-[0.16em] text-[#8c8b86]">Engagé</p><p className="mt-1 font-serif text-[30px] text-[#263b48]">£45 430 <span className="font-sans text-[11px] text-[#8c8b86]">/ £60 000</span></p></div><span className="text-[11px] font-semibold text-[#7c8e83]">75,7 %</span></div>{budget.map(b => <div key={b.label} className="mb-5 last:mb-0"><div className="mb-2 flex justify-between text-[10px]"><span className="text-[#637177]">{["Lieu & traiteur", "Design & fleurs", "Photo & vidéo", "Papeterie & détails"][budget.indexOf(b)]}</span><span className="text-[#8c8b86]">{b.spent.replace(",", " ")} <span className="text-[#b6afa6]">/ {b.total.replace(",", " ")}</span></span></div><div className="h-1 bg-[#e6dfd5]"><div className={`h-full ${b.color}`} style={{ width: `${b.pct}%` }}/></div></div>)}</div></div>
              <Runsheet open={runsheetOpen} onToggle={() => setRunsheetOpen(!runsheetOpen)}/><div className="mt-9"><SectionTitle eyebrow="Votre studio" title="Activité récente"/><div className="space-y-5">{[["LC","Lumen & Co. a envoyé un contrat révisé","Aujourd'hui, 09 h 42","bg-[#eadfdf]"],["SH","Sophie a approuvé le moodboard floral","Hier, 16 h 18","bg-[#eadfc9]"],["MF","Maison Floral Studio a ajouté 3 fichiers","Hier, 11 h 06","bg-[#e8ddd0]"]].map(a => <div className="flex gap-3" key={a[1]}><span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[9px] font-semibold text-[#52616a] ${a[3]}`}>{a[0]}</span><div><p className="text-[11px] leading-snug text-[#52616a]">{a[1]}</p><p className="mt-1 text-[10px] text-[#a09e98]">{a[2]}</p></div></div>)}</div><button onClick={() => notify()} className="mt-6 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.15em] text-[#8d7554]">Voir toute l'activité <ChevronRight size={13}/></button></div></aside>
            </div></>}
          </div>
        </main>
      </div>
      {showToast && <div className="fixed bottom-6 right-6 z-40 flex items-center gap-3 bg-[#263b48] px-5 py-3 text-[11px] text-[#f8f3ea] shadow-xl"><Check size={15} className="text-[#d4bd8d]"/> Action enregistrée</div>}
    </div>
  );
}

function PendingApprovals({ onAction }: { onAction: () => void }) {
  const items = [["Moodboard floral", "En attente de Sophie", "depuis 2 jours"], ["Proposition menu", "En attente de James", "depuis 4 jours"], ["Contrat Lumen & Co.", "Signature requise", "urgent"]];
  return <div className="mb-9 border border-[#d8c6a7] bg-[#f3eadb] px-5 py-4"><div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center"><div><p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#9b8258]">À votre attention</p><p className="mt-1 font-serif text-[23px] text-[#263b48]">Approbations en attente <span className="font-sans text-[11px] text-[#8c8177]">· 3 actions client</span></p></div><div className="flex flex-wrap gap-2">{items.map(item => <div key={item[0]} className="flex items-center gap-3 border border-[#d6bd91] bg-[#f8f3ea] px-3 py-2"><div><p className="text-[10px] font-semibold text-[#3d4d55]">{item[0]}</p><p className="text-[9px] text-[#8b837b]">{item[1]} · {item[2]}</p></div><button onClick={onAction} className="border border-[#b28c55] px-2 py-1 text-[9px] font-semibold text-[#967346] hover:bg-[#eadfc9]">Relancer</button></div>)}</div></div></div>;
}

function GuestManagement({ guests, onAction }: { guests: string[][]; onAction: () => void }) {
  return <div><SectionTitle eyebrow="La liste d'invités" title="Invités" action="Gérer les invités →"/><div className="border-y border-[#ddd3c6] bg-[#f8f5ef] px-5 py-5"><div className="flex items-end justify-between"><div><p className="font-serif text-[29px] text-[#263b48]">126 <span className="font-sans text-[11px] text-[#8c8b86]">invités</span></p><p className="mt-1 text-[10px] text-[#8c8b86]">98 confirmés · 18 en attente · 10 déclinés</p></div><span className="font-serif text-[24px] text-[#7c8e83]">89 %</span></div><div className="my-4 h-1.5 bg-[#e6dfd5]"><div className="h-full bg-[#879b93]" style={{ width: "89%" }}/></div>{guests.map(g => <div key={g[0]} className="flex items-center gap-3 border-t border-[#e3dbd0] py-3"><span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#e7e0d7] font-serif text-[13px] text-[#52616a]">{g[0].split(" ").map(n => n[0]).slice(0, 2).join("")}</span><div className="min-w-0 flex-1"><p className="truncate text-[11px] font-semibold text-[#3d4d55]">{g[0]}</p><p className="text-[9px] text-[#8c8b86]">{g[1]} · {g[2]}</p></div><span className={`rounded-full px-2 py-1 text-[9px] font-semibold ${g[4]}`}>{g[3]}</span></div>)}<button onClick={onAction} className="mt-3 flex items-center text-[10px] font-semibold uppercase tracking-[0.12em] text-[#8d7554]">Gérer les invités <ChevronRight size={13}/></button></div></div>;
}

function PaymentTracker({ onAction }: { onAction: () => void }) {
  const payments = [["Maison Floral Studio", "Solde final", "£6 800", "01 Oct 2024", "Urgent"], ["Lumen & Co.", "Acompte contrat", "£2 100", "15 Sep 2024", "À régler"], ["Élan Press", "Solde", "£960", "30 Sep 2024", "Programmé"]];
  return <div className="mt-9"><SectionTitle eyebrow="Échéances à venir" title="Suivi des paiements"/><div className="border-y border-[#ddd3c6] bg-[#f8f5ef]">{payments.map(p => <div key={p[0]} className="flex flex-wrap items-center gap-3 border-b border-[#e3dbd0] px-4 py-3 last:border-0"><div className="min-w-[150px] flex-1"><p className="text-[11px] font-semibold text-[#3d4d55]">{p[0]}</p><p className="mt-1 text-[10px] text-[#858b89]">{p[1]}</p></div><span className="border border-[#d8ccb9] px-2 py-1 text-[9px] text-[#8c8177]">Dû le {p[3]}</span><span className="font-serif text-[19px] text-[#52616a]">{p[2]}</span><span className={`rounded-full px-2 py-1 text-[9px] font-semibold ${p[4] === "Urgent" ? "bg-[#eadede] text-[#936c68]" : p[4] === "À régler" ? "bg-[#f0e2cb] text-[#967346]" : "bg-[#dce8df] text-[#5d7968]"}`}>{p[4]}</span></div>)}<div className="flex items-center justify-between px-4 py-4"><span className="text-[10px] font-semibold uppercase tracking-[0.15em] text-[#8c8b86]">Total à régler</span><span className="font-serif text-[25px] text-[#263b48]">£9 860</span></div></div><button onClick={onAction} className="mt-4 text-[10px] font-semibold uppercase tracking-[0.15em] text-[#8d7554]">Ouvrir le registre des paiements →</button></div>;
}

function Runsheet({ open, onToggle }: { open: boolean; onToggle: () => void }) {
  const rows = [["15:00", "Arrivée des prestataires", "The Orangery"], ["16:30", "Préparation de la mariée", "Chambre Wychwood"], ["18:00", "Cérémonie", "Salle de l'Orangerie"], ["19:30", "Cocktail", "Terrasse Est"], ["20:30", "Dîner", "Grand Salon"], ["23:30", "Fin de soirée", ""]];
  return <div className="mt-9 border border-[#ddd3c6] bg-[#f8f5ef]"><button onClick={onToggle} className="flex w-full items-center justify-between px-5 py-4 text-left"><div><p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#9b8258]">Feuille de route</p><p className="mt-1 font-serif text-[23px] text-[#263b48]">Jour J <span className="font-sans text-[10px] text-[#8c8b86]">· 18 Oct 2024</span></p></div><ChevronDown size={16} className={`text-[#8d7554] transition-transform ${open ? "rotate-180" : ""}`}/></button>{open && <div className="border-t border-[#e3dbd0] px-5">{rows.map(r => <div key={r[0]} className="flex gap-4 border-b border-[#e3dbd0] py-3 last:border-0"><span className="w-11 font-serif text-[17px] text-[#ad8a58]">{r[0]}</span><div><p className="text-[11px] font-semibold text-[#3d4d55]">{r[1]}</p><p className="text-[10px] text-[#858b89]">{r[2]}</p></div></div>)}</div>}</div>;
}

function ContractTracker({ onAction }: { onAction: () => void }) {
  return <section><div className="mb-10 flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-[#9b8258]">Documents & engagements</p><h1 className="font-serif text-[48px] leading-[0.9] text-[#263b48]">Suivi des contrats</h1><p className="mt-4 text-[12px] text-[#758087]">Gardez chaque signature et acompte à portée de main.</p></div><button onClick={onAction} className="flex items-center gap-2 bg-[#263b48] px-4 py-2.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#f8f3ea]">Ajouter un contrat <Plus size={14}/></button></div><div className="overflow-x-auto border-y border-[#ddd3c6] bg-[#f8f5ef]"><table className="w-full min-w-[780px] text-left"><thead><tr className="border-b border-[#ddd3c6] text-[9px] font-semibold uppercase tracking-[0.15em] text-[#8c8b86]"><th className="px-5 py-4">Prestataire</th><th>Statut</th><th>Montant total</th><th>Acompte versé</th><th>Signé le</th><th>Actions</th></tr></thead><tbody>{contractRows.map((r, i) => <tr key={r[0]} className="border-b border-[#e3dbd0] text-[11px] last:border-0"><td className="px-5 py-4 font-semibold text-[#3d4d55]">{r[0]}</td><td><span className={`rounded-full px-2.5 py-1 text-[9px] font-semibold ${r[1] === "Signé" ? "bg-[#dce8df] text-[#5d7968]" : r[1] === "Partiel" ? "bg-[#e7e0ee] text-[#76677e]" : "bg-[#f0e2cb] text-[#967346]"}`}>{r[1]}</span></td><td className="font-serif text-[18px] text-[#52616a]">{r[2]}</td><td className="text-[#637177]">{r[3]}</td><td className="text-[#637177]">{r[4]}</td><td><button onClick={onAction} className="font-semibold text-[#967346] underline underline-offset-4">{i === 2 ? "Relancer" : i === 3 ? "Compléter" : "Voir"}</button></td></tr>)}</tbody></table></div></section>;
}