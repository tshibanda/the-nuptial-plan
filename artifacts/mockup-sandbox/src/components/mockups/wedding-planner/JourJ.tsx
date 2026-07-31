import { useState, useEffect } from "react";
import {
  AlertTriangle,
  Check,
  ChevronDown,
  ChevronRight,
  Clock,
  MapPin,
  Phone,
  User,
  Zap,
} from "lucide-react";
import "./_group.css";

/* ─── Data ─────────────────────────────────────────────────────────────────── */

type EventStatus = "terminé" | "en_cours" | "à_venir";

interface RunsheetEvent {
  time: string;
  title: string;
  location: string;
  responsible: string;
  responsibleInitials: string;
  status: EventStatus;
  note?: string;
}

const runsheet: RunsheetEvent[] = [
  { time: "08:30", title: "Livraisons florales & décoration", location: "The Orangery — entrée de service", responsible: "Marie Fleuriot (MF)", responsibleInitials: "MF", status: "terminé" },
  { time: "10:00", title: "Installation de la salle de réception", location: "Grand Salon", responsible: "Élise Caron", responsibleInitials: "EC", status: "terminé" },
  { time: "12:00", title: "Déjeuner équipe prestataires", location: "Cuisine du domaine", responsible: "Élise Caron", responsibleInitials: "EC", status: "terminé" },
  { time: "13:30", title: "Préparation de la mariée", location: "Chambre Wychwood — Suite A", responsible: "Élise Caron", responsibleInitials: "EC", status: "terminé" },
  { time: "15:30", title: "Arrivée & accueil des invités", location: "Allée principale — the Orangery", responsible: "Élise Caron", responsibleInitials: "EC", status: "terminé" },
  { time: "16:00", title: "Cérémonie", location: "Salle de l'Orangerie", responsible: "Élise Caron", responsibleInitials: "EC", status: "en_cours", note: "Durée estimée : 45 min" },
  { time: "17:00", title: "Séance photo — couple & famille", location: "Jardins du domaine", responsible: "Lucas Chen (LC)", responsibleInitials: "LC", status: "à_venir" },
  { time: "18:30", title: "Cocktail de bienvenue", location: "Terrasse Est", responsible: "Tom Ashford (TO)", responsibleInitials: "TO", status: "à_venir" },
  { time: "20:00", title: "Dîner & discours", location: "Grand Salon", responsible: "Tom Ashford (TO)", responsibleInitials: "TO", status: "à_venir", note: "Entrée des mariés à 20:15" },
  { time: "22:30", title: "Découpe du gâteau & première danse", location: "Grand Salon", responsible: "Élise Caron", responsibleInitials: "EC", status: "à_venir" },
  { time: "23:30", title: "Fin de soirée", location: "", responsible: "Élise Caron", responsibleInitials: "EC", status: "à_venir" },
];

interface Vendor {
  initials: string;
  name: string;
  role: string;
  contact: string;
  phone: string;
  color: string;
  status: "confirmé" | "en_attente";
}

const vendors: Vendor[] = [
  { initials: "MF", name: "Maison Floral Studio", role: "Fleurs & scénographie", contact: "Marie Fleuriot", phone: "+44 7700 900 451", color: "bg-[#e8ddd0]", status: "confirmé" },
  { initials: "TO", name: "Terrace at One & Only", role: "Traiteur & bar", contact: "Tom Ashford", phone: "+44 7700 900 782", color: "bg-[#d8e0dc]", status: "confirmé" },
  { initials: "LC", name: "Lumen & Co. Photography", role: "Photographie & vidéo", contact: "Lucas Chen", phone: "+44 7700 900 234", color: "bg-[#eadfdf]", status: "confirmé" },
  { initials: "EP", name: "Élan Press", role: "Papeterie", contact: "Emma Pelletier", phone: "+44 7700 900 567", color: "bg-[#ddd9e6]", status: "confirmé" },
];

interface CheckItem {
  id: number;
  group: string;
  label: string;
  done: boolean;
}

const initialChecklist: CheckItem[] = [
  { id: 1,  group: "Matinée",    label: "Livraisons florales confirmées",     done: true  },
  { id: 2,  group: "Matinée",    label: "Décoration de la salle terminée",    done: true  },
  { id: 3,  group: "Matinée",    label: "Menus placés sur les tables",        done: true  },
  { id: 4,  group: "Matinée",    label: "Système audio & éclairage testés",   done: false },
  { id: 5,  group: "Matinée",    label: "Équipe traiteur briefée",            done: false },
  { id: 6,  group: "Cérémonie",  label: "Placement des invités vérifié",      done: true  },
  { id: 7,  group: "Cérémonie",  label: "Fleurs de cérémonie en place",       done: true  },
  { id: 8,  group: "Cérémonie",  label: "Officiant briefé & en place",        done: false },
  { id: 9,  group: "Cérémonie",  label: "Musiciens accordés & prêts",         done: false },
  { id: 10, group: "Réception",  label: "Salle de dîner décorée",             done: false },
  { id: 11, group: "Réception",  label: "Table d'honneur vérifiée",           done: false },
  { id: 12, group: "Réception",  label: "Cocktails de bienvenue prêts",       done: false },
  { id: 13, group: "Réception",  label: "DJ ou orchestre briefé",             done: false },
  { id: 14, group: "Réception",  label: "Gâteau installé & en place",         done: false },
];

type Tab = "runsheet" | "vendors" | "checklist";

/* ─── Helper ────────────────────────────────────────────────────────────────── */

function liveTime() {
  const now = new Date();
  return now.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
}

/* ─── Sub-components ────────────────────────────────────────────────────────── */

function StatusBadge({ status }: { status: EventStatus }) {
  if (status === "terminé")
    return (
      <span className="flex items-center gap-1 rounded-full bg-[#dce8df] px-2 py-0.5 text-[9px] font-semibold text-[#5d7968]">
        <Check size={9} strokeWidth={3} /> Terminé
      </span>
    );
  if (status === "en_cours")
    return (
      <span className="flex items-center gap-1.5 rounded-full bg-[#eadfc9] px-2 py-0.5 text-[9px] font-semibold text-[#967346]">
        <span className="jourj-live-dot inline-block h-1.5 w-1.5 rounded-full bg-[#c8954a]" />
        En cours
      </span>
    );
  return (
    <span className="rounded-full bg-[#e7e4df] px-2 py-0.5 text-[9px] font-semibold text-[#6f7673]">
      À venir
    </span>
  );
}

function RunsheetTab() {
  const done = runsheet.filter((e) => e.status === "terminé").length;
  return (
    <div>
      {/* Progress bar */}
      <div className="mb-4 px-4">
        <div className="mb-1.5 flex justify-between text-[10px]">
          <span className="font-semibold text-[#637177]">Avancement du programme</span>
          <span className="text-[#9b8258]">{done}/{runsheet.length}</span>
        </div>
        <div className="h-1 overflow-hidden rounded-full bg-[#e6dfd5]">
          <div
            className="h-full rounded-full bg-[#c8aa70] transition-all"
            style={{ width: `${(done / runsheet.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Timeline */}
      <div className="space-y-1 px-4">
        {runsheet.map((event, i) => (
          <div
            key={i}
            className={`relative overflow-hidden rounded-md px-3 py-3 ${
              event.status === "en_cours"
                ? "jourj-en-cours-row border border-[#c8954a]/30 bg-[#f8f0e3]"
                : event.status === "terminé"
                ? "border border-[#e3dbd0] bg-[#f5f2ed] opacity-75"
                : "border border-[#e3dbd0] bg-[#faf8f5]"
            }`}
          >
            {/* Current-time left border accent */}
            {event.status === "en_cours" && (
              <span className="absolute inset-y-0 left-0 w-[3px] bg-[#c8954a]" />
            )}

            <div className="flex items-start gap-3">
              {/* Time */}
              <div className="w-11 shrink-0 text-right">
                <span
                  className={`font-serif text-[17px] leading-none ${
                    event.status === "en_cours"
                      ? "text-[#c8954a]"
                      : event.status === "terminé"
                      ? "text-[#a09e98]"
                      : "text-[#ad8a58]"
                  }`}
                >
                  {event.time}
                </span>
              </div>

              {/* Content */}
              <div className="min-w-0 flex-1">
                <div className="mb-1 flex items-center justify-between gap-2">
                  <p
                    className={`text-[12px] font-semibold leading-tight ${
                      event.status === "terminé" ? "text-[#8c8b86]" : "text-[#3d4d55]"
                    }`}
                  >
                    {event.title}
                  </p>
                  <StatusBadge status={event.status} />
                </div>
                {event.location && (
                  <p className="flex items-center gap-1 text-[10px] text-[#858b89]">
                    <MapPin size={9} className="shrink-0 text-[#9b8258]" />
                    {event.location}
                  </p>
                )}
                <p className="mt-0.5 flex items-center gap-1 text-[10px] text-[#a09e98]">
                  <User size={9} className="shrink-0" />
                  {event.responsible}
                </p>
                {event.note && (
                  <p className="mt-1.5 rounded bg-[#f0e8d8] px-2 py-1 text-[9px] text-[#967346]">
                    {event.note}
                  </p>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function VendorCard({ vendor, onCall }: { vendor: Vendor; onCall: (name: string) => void }) {
  return (
    <div className="overflow-hidden rounded-md border border-[#e3dbd0] bg-[#faf8f5]">
      <div className="flex items-center gap-3 px-4 py-3.5">
        <span
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full font-serif text-[15px] text-[#52616a] ${vendor.color}`}
        >
          {vendor.initials}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[12px] font-semibold text-[#3d4d55]">{vendor.name}</p>
          <p className="text-[10px] text-[#858b89]">{vendor.role}</p>
        </div>
        <span className="rounded-full bg-[#dce8df] px-2 py-0.5 text-[9px] font-semibold text-[#5d7968]">
          Confirmé
        </span>
      </div>
      <div className="flex items-center justify-between border-t border-[#e3dbd0] px-4 py-3 bg-[#f5f1eb]">
        <div>
          <p className="text-[10px] font-semibold text-[#52616a]">{vendor.contact}</p>
          <p className="text-[11px] font-mono text-[#9b8258]">{vendor.phone}</p>
        </div>
        <button
          onClick={() => onCall(vendor.name)}
          className="flex items-center gap-1.5 rounded-full bg-[#263b48] px-3 py-2 text-[10px] font-semibold text-[#f8f3ea] active:scale-95 transition-transform"
        >
          <Phone size={11} />
          Appeler
        </button>
      </div>
    </div>
  );
}

function ChecklistTab({
  items,
  onToggle,
}: {
  items: CheckItem[];
  onToggle: (id: number) => void;
}) {
  const groups = ["Matinée", "Cérémonie", "Réception"];
  const total = items.length;
  const done = items.filter((i) => i.done).length;
  const pct = Math.round((done / total) * 100);

  return (
    <div>
      {/* Progress */}
      <div className="mb-5 px-4">
        <div className="mb-1.5 flex justify-between text-[10px]">
          <span className="font-semibold text-[#637177]">
            {done} sur {total} tâches complétées
          </span>
          <span className="font-semibold text-[#9b8258]">{pct} %</span>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-[#e6dfd5]">
          <div
            className="h-full rounded-full bg-[#c8aa70] transition-all duration-500"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      {groups.map((group) => {
        const groupItems = items.filter((i) => i.group === group);
        const groupDone = groupItems.filter((i) => i.done).length;
        return (
          <div key={group} className="mb-5 px-4">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#9b8258]">
                {group}
              </p>
              <span className="text-[10px] text-[#a09e98]">
                {groupDone}/{groupItems.length}
              </span>
            </div>
            <div className="overflow-hidden rounded-md border border-[#e3dbd0] bg-[#faf8f5]">
              {groupItems.map((item, idx) => (
                <button
                  key={item.id}
                  onClick={() => onToggle(item.id)}
                  className={`flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors active:bg-[#f0ebe2] ${
                    idx > 0 ? "border-t border-[#e3dbd0]" : ""
                  }`}
                >
                  {/* Custom checkbox */}
                  <span
                    className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
                      item.done
                        ? "border-[#6e9478] bg-[#6e9478]"
                        : "border-[#c5b9aa] bg-transparent"
                    }`}
                  >
                    {item.done && (
                      <Check
                        size={10}
                        strokeWidth={3}
                        className="jourj-check-in text-white"
                      />
                    )}
                  </span>
                  {/* Label */}
                  <span className="relative min-w-0 flex-1">
                    <span
                      className={`block truncate text-[12px] transition-colors ${
                        item.done ? "text-[#a09e98]" : "text-[#3d4d55] font-medium"
                      }`}
                    >
                      {item.label}
                    </span>
                  </span>
                </button>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ─── Main Component ─────────────────────────────────────────────────────────── */

export function JourJ() {
  const [tab, setTab] = useState<Tab>("runsheet");
  const [checklist, setChecklist] = useState<CheckItem[]>(initialChecklist);
  const [time, setTime] = useState(liveTime());
  const [emergencyOpen, setEmergencyOpen] = useState(false);
  const [toast, setToast] = useState("");

  // Tick the live clock
  useEffect(() => {
    const id = setInterval(() => setTime(liveTime()), 15000);
    return () => clearInterval(id);
  }, []);

  const notify = (msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(""), 2400);
  };

  const toggleItem = (id: number) => {
    setChecklist((prev) =>
      prev.map((it) => (it.id === id ? { ...it, done: !it.done } : it)),
    );
  };

  const currentEvent = runsheet.find((e) => e.status === "en_cours");
  const nextEvent = runsheet.find((e) => e.status === "à_venir");

  const tabs: { key: Tab; label: string }[] = [
    { key: "runsheet", label: "Feuille de route" },
    { key: "vendors", label: "Prestataires clés" },
    { key: "checklist", label: "Checklist du jour" },
  ];

  return (
    <div className="min-h-[100dvh] w-full overflow-x-hidden bg-[#f5f1eb] text-[#263b48]">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;500;600;700&family=DM+Sans:wght@400;500;600;700&display=swap');
        .jourj-serif { font-family: 'Cormorant Garamond', Georgia, serif; }
        .jourj-sans  { font-family: 'DM Sans', system-ui, sans-serif; }
      `}</style>

      <div className="jourj-sans mx-auto min-h-[100dvh] max-w-[390px] pb-10">

        {/* ── Top header ──────────────────────────────────────────────────────── */}
        <header className="bg-[#263b48] px-5 pt-10 pb-5 text-[#f7f0e5]">
          {/* Live pill */}
          <div className="mb-3 flex items-center gap-2">
            <span className="jourj-live-dot inline-block h-2 w-2 rounded-full bg-[#c8954a]" />
            <span className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#c8aa70]">
              En direct · {time}
            </span>
          </div>

          <p className="jourj-serif text-[36px] leading-none">
            Sophie <span className="text-[#c8aa70]">&</span> James
          </p>
          <p className="mt-1 text-[11px] text-[#bdc8c4]">
            Samedi 18 octobre 2024 · The Orangery at Wychwood
          </p>

          {/* Current / next event summary */}
          {currentEvent && (
            <div className="mt-4 rounded-md bg-[#1e3039] px-4 py-3">
              <div className="flex items-center gap-2">
                <span className="jourj-live-dot inline-block h-1.5 w-1.5 rounded-full bg-[#c8954a]" />
                <span className="text-[9px] font-semibold uppercase tracking-[0.18em] text-[#c8954a]">
                  En cours — {currentEvent.time}
                </span>
              </div>
              <p className="mt-1 text-[13px] font-semibold text-[#f7f0e5]">
                {currentEvent.title}
              </p>
              {currentEvent.location && (
                <p className="mt-0.5 text-[10px] text-[#9eacaa]">{currentEvent.location}</p>
              )}
              {nextEvent && (
                <p className="mt-2 text-[10px] text-[#7d9098]">
                  Prochain : <span className="text-[#bdc8c4]">{nextEvent.time} · {nextEvent.title}</span>
                </p>
              )}
            </div>
          )}
        </header>

        {/* ── Emergency card ──────────────────────────────────────────────────── */}
        <div className="border-b border-[#ddd3c6] bg-[#f8f3ea]">
          <button
            onClick={() => setEmergencyOpen((v) => !v)}
            className="flex w-full items-center justify-between px-5 py-3"
          >
            <div className="flex items-center gap-2">
              <Zap size={13} className="shrink-0 text-[#c8954a]" />
              <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#9b8258]">
                Urgences & contacts essentiels
              </span>
            </div>
            <ChevronDown
              size={14}
              className={`text-[#9b8258] transition-transform ${emergencyOpen ? "rotate-180" : ""}`}
            />
          </button>

          {emergencyOpen && (
            <div className="border-t border-[#e0d5c5] px-5 pb-4 pt-3 space-y-3">
              {/* Venue address */}
              <div className="flex gap-2">
                <MapPin size={13} className="mt-0.5 shrink-0 text-[#9b8258]" />
                <div>
                  <p className="text-[10px] font-semibold text-[#52616a]">Adresse du lieu</p>
                  <p className="text-[11px] text-[#637177]">The Orangery at Wychwood</p>
                  <p className="text-[11px] text-[#637177]">Wychwood Estate, Chipping Norton OX7 3RH</p>
                </div>
              </div>
              {/* Coordinatrice */}
              <div className="flex items-center justify-between rounded-md bg-[#f0e8d8] px-3 py-2.5">
                <div className="flex gap-2">
                  <User size={13} className="mt-0.5 shrink-0 text-[#9b8258]" />
                  <div>
                    <p className="text-[10px] font-semibold text-[#52616a]">Coordinatrice</p>
                    <p className="text-[11px] text-[#637177]">Élise Caron · +44 7700 900 100</p>
                  </div>
                </div>
                <button
                  onClick={() => notify("Appel vers Élise Caron…")}
                  className="rounded-full bg-[#263b48] px-3 py-1.5 text-[9px] font-semibold text-[#f8f3ea]"
                >
                  <Phone size={10} className="inline mr-1" />
                  Appeler
                </button>
              </div>
              {/* Venue contact */}
              <div className="flex items-center justify-between rounded-md border border-[#e0d5c5] bg-[#faf8f5] px-3 py-2.5">
                <div className="flex gap-2">
                  <AlertTriangle size={13} className="mt-0.5 shrink-0 text-[#967346]" />
                  <div>
                    <p className="text-[10px] font-semibold text-[#52616a]">Contact lieu (urgence)</p>
                    <p className="text-[11px] text-[#637177]">Sarah Thornton · +44 7700 900 999</p>
                  </div>
                </div>
                <button
                  onClick={() => notify("Appel vers Sarah Thornton…")}
                  className="rounded-full border border-[#cfc2b2] bg-[#f8f5ef] px-3 py-1.5 text-[9px] font-semibold text-[#52616a]"
                >
                  <Phone size={10} className="inline mr-1" />
                  Appeler
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ── Tab bar ─────────────────────────────────────────────────────────── */}
        <div className="sticky top-0 z-20 border-b border-[#ddd3c6] bg-[#f8f5ef]/95 backdrop-blur-md">
          <div className="flex overflow-x-auto">
            {tabs.map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setTab(key)}
                className={`shrink-0 border-b-2 px-4 py-3.5 text-[10px] font-semibold whitespace-nowrap transition-colors ${
                  tab === key
                    ? "border-[#b28c55] text-[#263b48]"
                    : "border-transparent text-[#92918b]"
                }`}
              >
                {label}
                {key === "checklist" && (
                  <span className="ml-1.5 rounded-full bg-[#c8aa70] px-1.5 py-0.5 text-[8px] font-bold text-[#263b48]">
                    {checklist.filter((i) => i.done).length}/{checklist.length}
                  </span>
                )}
                {key === "runsheet" && currentEvent && (
                  <span className="ml-1.5 inline-flex h-1.5 w-1.5 rounded-full bg-[#c8954a] jourj-live-dot" />
                )}
              </button>
            ))}
          </div>
        </div>

        {/* ── Content ─────────────────────────────────────────────────────────── */}
        <main className="py-4">
          {tab === "runsheet" && <RunsheetTab />}

          {tab === "vendors" && (
            <div className="space-y-3 px-4">
              <p className="mb-4 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#9b8258]">
                Prestataires · Jour J
              </p>
              {vendors.map((v) => (
                <VendorCard
                  key={v.name}
                  vendor={v}
                  onCall={(name) => notify(`Appel vers ${name}…`)}
                />
              ))}

              {/* Quick-dial note */}
              <div className="mt-4 rounded-md bg-[#f0e8d8] px-4 py-3 text-[11px] text-[#967346]">
                <span className="font-semibold">Astuce :</span> Appuyez sur "Appeler" pour composer le numéro directement depuis votre téléphone.
              </div>
            </div>
          )}

          {tab === "checklist" && (
            <ChecklistTab items={checklist} onToggle={toggleItem} />
          )}
        </main>

        {/* ── Toast ───────────────────────────────────────────────────────────── */}
        {toast && (
          <div className="fixed bottom-6 left-1/2 z-50 flex -translate-x-1/2 items-center gap-2 whitespace-nowrap rounded-md bg-[#263b48] px-4 py-3 text-[10px] font-semibold text-[#f8f3ea] shadow-xl">
            <Check size={13} className="text-[#c8aa70]" />
            {toast}
          </div>
        )}
      </div>
    </div>
  );
}

export default JourJ;
