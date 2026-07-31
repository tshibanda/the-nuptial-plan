import { useState } from "react";
import {
  Bell,
  CalendarDays,
  Check,
  ChevronRight,
  ClipboardList,
  Clock3,
  Menu,
  MoreHorizontal,
  Users,
  WalletCards,
  X,
} from "lucide-react";

type Section = "Overview" | "Timeline" | "Vendors" | "Budget";

const milestones = [
  { day: "06", month: "SEP", title: "Final menu tasting", detail: "Terrace at One & Only", tone: "bg-[#eee2c8]" },
  { day: "12", month: "SEP", title: "Stationery proof approval", detail: "Due to Élan Press", tone: "bg-[#eadfdf]" },
  { day: "19", month: "SEP", title: "Ceremony rehearsal", detail: "The Orangery · 17:30", tone: "bg-[#dce7df]" },
];

const vendors = [
  { initials: "MF", name: "Maison Floral Studio", type: "Florals & styling", status: "Confirmed", color: "bg-[#e8ddd0]", badge: "bg-[#dce8df] text-[#5b796a]" },
  { initials: "TO", name: "Terrace at One & Only", type: "Catering & bar", status: "Confirmed", color: "bg-[#d8e0dc]", badge: "bg-[#dce8df] text-[#5b796a]" },
  { initials: "LC", name: "Lumen & Co. Photography", type: "Photography", status: "Awaiting contract", color: "bg-[#eadfdf]", badge: "bg-[#f0e2cb] text-[#967346]" },
  { initials: "EP", name: "Élan Press", type: "Stationery", status: "Deposit paid", color: "bg-[#ddd9e6]", badge: "bg-[#e7e0ee] text-[#76677e]" },
];

const budget = [
  { label: "Venue & catering", spent: "£32,400", total: "£38,000", pct: 85, color: "bg-[#ab8b52]" },
  { label: "Design & florals", spent: "£12,650", total: "£15,000", pct: 84, color: "bg-[#bd9b73]" },
  { label: "Photography", spent: "£4,200", total: "£6,000", pct: 70, color: "bg-[#879b93]" },
  { label: "Stationery", spent: "£2,180", total: "£3,500", pct: 62, color: "bg-[#9d8b9c]" },
];

function Metric({ label, value, note }: { label: string; value: string; note: string }) {
  return (
    <div className="border-l border-[#d9cdbd] pl-3.5">
      <p className="text-[9px] font-semibold uppercase tracking-[0.16em] text-[#938b82]">{label}</p>
      <p className="mt-2 font-serif text-[29px] leading-none text-[#263b48]">{value}</p>
      <p className="mt-2 text-[10px] text-[#7e9589]">{note}</p>
    </div>
  );
}

export function Mobile() {
  const [active, setActive] = useState<Section>("Overview");
  const [menuOpen, setMenuOpen] = useState(false);
  const [notice, setNotice] = useState(false);

  const notify = () => {
    setNotice(true);
    window.setTimeout(() => setNotice(false), 2200);
  };

  return (
    <div className="min-h-[100dvh] w-full overflow-x-hidden bg-[#f5f1eb] text-[#263b48]">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;500;600;700&family=DM+Sans:wght@400;500;600;700&display=swap');
        .aurelia-serif { font-family: 'Cormorant Garamond', Georgia, serif; }
        .aurelia-sans { font-family: 'DM Sans', sans-serif; }
      `}</style>
      <div className="aurelia-sans mx-auto min-h-[100dvh] max-w-[520px] pb-24">
        <header className="sticky top-0 z-30 flex h-[68px] items-center justify-between border-b border-[#ded3c5] bg-[#f8f5ef]/95 px-5 backdrop-blur-sm">
          <button aria-label="Open menu" onClick={() => setMenuOpen(true)} className="flex h-9 w-9 items-center justify-center text-[#52616a]">
            <Menu size={19} strokeWidth={1.7} />
          </button>
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center border border-[#c3a269] aurelia-serif text-[21px] text-[#ab8b52]">A</span>
            <div>
              <p className="aurelia-serif text-[21px] leading-[18px]">Aurelia</p>
              <p className="text-[7px] uppercase tracking-[0.22em] text-[#91877b]">Event atelier</p>
            </div>
          </div>
          <button aria-label="Notifications" onClick={notify} className="relative flex h-9 w-9 items-center justify-center text-[#52616a]">
            <Bell size={18} strokeWidth={1.6} />
            <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-[#b48c4c]" />
          </button>
        </header>

        <main className="px-5 pt-5">
          <div className="mb-5 flex items-end justify-between">
            <div>
              <p className="text-[9px] font-semibold uppercase tracking-[0.2em] text-[#9b8258]">Active wedding</p>
              <h1 className="aurelia-serif mt-1 text-[27px] leading-[25px]">Sophie &amp; James<br />Hartwell</h1>
            </div>
            <button onClick={notify} className="mb-1 flex h-9 w-9 items-center justify-center border border-[#d4c6b6] text-[#8d7554]">
              <MoreHorizontal size={17} />
            </button>
          </div>

          <section className="relative mb-6 min-h-[190px] overflow-hidden bg-[#263b48] text-[#f8f3ea] shadow-[0_10px_30px_rgba(38,59,72,0.16)]">
            <img src="/__mockup/images/hartwell-venue.jpg" alt="The Orangery at Wychwood" className="absolute inset-0 h-full w-full object-cover opacity-50" />
            <div className="absolute inset-0 bg-gradient-to-br from-[#263b48]/95 via-[#263b48]/65 to-[#263b48]/30" />
            <div className="relative flex min-h-[190px] flex-col justify-between p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-[9px] uppercase tracking-[0.22em] text-[#d6bd87]">The celebration</p>
                  <p className="mt-2 max-w-[200px] aurelia-serif text-[23px] leading-[23px]">A day to remember, beautifully planned.</p>
                </div>
                <div className="text-right">
                  <p className="aurelia-serif text-[45px] leading-[34px] text-[#d8bd84]">49</p>
                  <p className="mt-2 text-[8px] uppercase tracking-[0.16em] text-[#d5d8d2]">days until</p>
                </div>
              </div>
              <div className="flex items-end justify-between border-t border-[#71808a]/50 pt-3">
                <div>
                  <p className="text-[11px] font-medium">The Orangery at Wychwood</p>
                  <p className="mt-1 text-[10px] text-[#c4cbc8]">Saturday, 18 October 2024</p>
                </div>
                <CalendarDays size={16} className="text-[#d6bd87]" />
              </div>
            </div>
          </section>

          <div className="-mx-5 mb-7 flex gap-2 overflow-x-auto px-5 pb-1 [scrollbar-width:none]">
            {(["Overview", "Timeline", "Vendors", "Budget"] as Section[]).map((item) => (
              <button key={item} onClick={() => setActive(item)} className={`shrink-0 rounded-full border px-4 py-2 text-[10px] font-semibold tracking-[0.02em] transition ${active === item ? "border-[#263b48] bg-[#263b48] text-[#f8f3ea]" : "border-[#d7ccbf] bg-[#f8f5ef] text-[#817c75]"}`}>
                {item}
              </button>
            ))}
          </div>

          {active === "Overview" ? (
            <>
              <section className="mb-8">
                <div className="mb-4 flex items-end justify-between">
                  <div><p className="text-[9px] font-semibold uppercase tracking-[0.19em] text-[#9b8258]">At a glance</p><h2 className="aurelia-serif mt-1 text-[25px] leading-none">The essentials</h2></div>
                  <span className="text-[10px] text-[#938b82]">30 Aug 2024</span>
                </div>
                <div className="grid grid-cols-2 gap-y-6 border-y border-[#ded3c5] bg-[#f8f5ef] px-4 py-5">
                  <Metric label="Days until" value="49" note="On track for October" />
                  <Metric label="Guests" value="126" note="2 RSVPs outstanding" />
                  <Metric label="Budget remaining" value="£14.5k" note="61% committed" />
                  <Metric label="Tasks done" value="78%" note="12 to review" />
                </div>
              </section>
              <section className="mb-8">
                <div className="mb-4 flex items-end justify-between"><div><p className="text-[9px] font-semibold uppercase tracking-[0.19em] text-[#9b8258]">The weeks ahead</p><h2 className="aurelia-serif mt-1 text-[25px] leading-none">Upcoming</h2></div><button onClick={() => setActive("Timeline")} className="text-[9px] font-semibold uppercase tracking-[0.13em] text-[#8d7554]">View all</button></div>
                <div className="border-y border-[#ded3c5] bg-[#f8f5ef]">
                  {milestones.map((item, index) => <div key={item.title} className="flex items-center gap-3 border-b border-[#e5ddd2] px-3 py-3.5 last:border-0"><div className={`flex h-11 w-11 shrink-0 flex-col items-center justify-center ${item.tone}`}><span className="aurelia-serif text-[20px] leading-[18px]">{item.day}</span><span className="text-[8px] font-bold tracking-[0.1em] text-[#887d73]">{item.month}</span></div><div className="min-w-0 flex-1"><p className="truncate text-[11px] font-semibold">{item.title}</p><p className="mt-1 truncate text-[10px] text-[#898c89]">{item.detail}</p></div><span className="hidden text-[9px] text-[#9b8258] min-[370px]:block">{index === 0 ? "7 days" : index === 1 ? "13 days" : "20 days"}</span></div>)}
                </div>
              </section>
              <section className="mb-8">
                <div className="mb-4 flex items-end justify-between"><div><p className="text-[9px] font-semibold uppercase tracking-[0.19em] text-[#9b8258]">Carefully chosen</p><h2 className="aurelia-serif mt-1 text-[25px] leading-none">Vendor team</h2></div><button onClick={() => setActive("Vendors")} className="text-[9px] font-semibold uppercase tracking-[0.13em] text-[#8d7554]">Manage</button></div>
                <div className="border-y border-[#ded3c5] bg-[#f8f5ef]">
                  {vendors.map((vendor) => <button key={vendor.name} onClick={notify} className="flex w-full items-center gap-3 border-b border-[#e5ddd2] px-3 py-3.5 text-left last:border-0"><span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full aurelia-serif text-[14px] text-[#52616a] ${vendor.color}`}>{vendor.initials}</span><span className="min-w-0 flex-1"><span className="block truncate text-[11px] font-semibold">{vendor.name}</span><span className="mt-1 block text-[9px] text-[#898c89]">{vendor.type}</span></span><span className={`shrink-0 rounded-full px-2 py-1 text-[8px] font-semibold ${vendor.badge}`}>{vendor.status}</span></button>)}
                </div>
              </section>
              <section className="mb-5">
                <div className="mb-4 flex items-end justify-between"><div><p className="text-[9px] font-semibold uppercase tracking-[0.19em] text-[#9b8258]">Where it stands</p><h2 className="aurelia-serif mt-1 text-[25px] leading-none">Budget overview</h2></div><button onClick={() => setActive("Budget")} className="text-[9px] font-semibold uppercase tracking-[0.13em] text-[#8d7554]">Open</button></div>
                <div className="border-y border-[#ded3c5] bg-[#f8f5ef] px-4 py-5"><div className="mb-5 flex items-end justify-between"><div><p className="text-[9px] uppercase tracking-[0.16em] text-[#8c8b86]">Committed</p><p className="aurelia-serif mt-1 text-[29px]">£45,430 <span className="aurelia-sans text-[10px] text-[#8c8b86]">/ £60,000</span></p></div><span className="text-[10px] font-semibold text-[#718c7f]">75.7%</span></div>{budget.map((item) => <div key={item.label} className="mb-4 last:mb-0"><div className="mb-1.5 flex justify-between text-[9px]"><span className="text-[#637177]">{item.label}</span><span className="text-[#8c8b86]">{item.spent} <span className="text-[#b6afa6]">/ {item.total}</span></span></div><div className="h-1 bg-[#e6dfd5]"><div className={`h-full ${item.color}`} style={{ width: `${item.pct}%` }} /></div></div>)}</div>
              </section>
            </>
          ) : (
            <section className="border-y border-[#ded3c5] bg-[#f8f5ef] px-4 py-7">
              <p className="text-[9px] font-semibold uppercase tracking-[0.19em] text-[#9b8258]">Aurelia workspace</p>
              <h2 className="aurelia-serif mt-2 text-[32px]">{active}</h2>
              <p className="mt-2 max-w-[280px] text-[11px] leading-relaxed text-[#7e8584]">Your {active.toLowerCase()} view is ready for a deeper look at the Hartwell celebration.</p>
              <div className="mt-7 space-y-3">
                {(active === "Timeline" ? milestones : active === "Vendors" ? vendors : budget).map((item, index) => <div key={index} className="flex items-center justify-between border-b border-[#e5ddd2] pb-3 text-[11px]"><span>{("title" in item ? item.title : "name" in item ? item.name : item.label)}</span><ChevronRight size={14} className="text-[#ab8b52]" /></div>)}
              </div>
            </section>
          )}
        </main>
      </div>

      <nav className="fixed bottom-0 left-0 right-0 z-30 mx-auto flex h-[74px] max-w-[520px] items-start justify-around border-t border-[#d9cebf] bg-[#f8f5ef]/97 px-2 pt-3 backdrop-blur-md">
        {[
          { label: "Overview", icon: ClipboardList },
          { label: "Timeline", icon: CalendarDays },
          { label: "Vendors", icon: Users },
          { label: "Budget", icon: WalletCards },
          { label: "More", icon: MoreHorizontal },
        ].map(({ label, icon: Icon }) => <button key={label} onClick={() => label === "More" ? setMenuOpen(true) : setActive(label as Section)} className={`flex min-w-[54px] flex-col items-center gap-1 text-[9px] ${active === label ? "text-[#8d6f3f]" : "text-[#89908d]"}`}><Icon size={18} strokeWidth={active === label ? 2 : 1.5} /><span>{label}</span>{active === label && <span className="mt-0.5 h-0.5 w-3 bg-[#b18b51]" />}</button>)}
      </nav>

      {menuOpen && <div className="fixed inset-0 z-50 bg-[#1e3039]/35" onClick={() => setMenuOpen(false)}><div className="absolute bottom-0 left-0 right-0 mx-auto max-w-[520px] rounded-t-[22px] bg-[#f8f5ef] p-5 pb-9 shadow-2xl" onClick={(event) => event.stopPropagation()}><div className="mb-5 flex items-center justify-between"><div><p className="text-[9px] uppercase tracking-[0.2em] text-[#9b8258]">Aurelia</p><p className="aurelia-serif text-[27px]">Studio menu</p></div><button aria-label="Close menu" onClick={() => setMenuOpen(false)} className="flex h-8 w-8 items-center justify-center border border-[#d7ccbf]"><X size={16} /></button></div><button onClick={() => { setMenuOpen(false); notify(); }} className="flex w-full items-center justify-between border-y border-[#ded3c5] py-4 text-left text-[11px]"><span>Notifications</span><span className="flex items-center gap-2 text-[#9b8258]">1 new <Bell size={14} /></span></button><button onClick={() => { setMenuOpen(false); setActive("Timeline"); }} className="flex w-full items-center justify-between border-b border-[#ded3c5] py-4 text-left text-[11px]"><span>Day-of checklist</span><Clock3 size={15} className="text-[#9b8258]" /></button></div></div>}
      {notice && <div className="fixed bottom-[88px] left-1/2 z-50 flex -translate-x-1/2 items-center gap-2 whitespace-nowrap bg-[#263b48] px-4 py-3 text-[10px] text-[#f8f3ea] shadow-xl"><Check size={14} className="text-[#d4bd8d]" /> Saved to the Hartwell workspace</div>}
    </div>
  );
}
