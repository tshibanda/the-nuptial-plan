import { useState, useCallback } from "react";
import { Check, ChevronLeft, ChevronRight, Leaf, Users, X, AlertCircle, LayoutGrid, List } from "lucide-react";

// ─── Design tokens ───────────────────────────────────────────────────────────
const T = {
  navy: "#263b48",
  navyLight: "#2f4a59",
  ivory: "#f8f5ef",
  ivoryDark: "#f0ebe1",
  gold: "#ab8b52",
  goldLight: "#d6bd87",
  goldPale: "#eee2c8",
  sage: "#718c7f",
  sageLight: "#dce8df",
  sageDark: "#5b796a",
  sand: "#e6dfd5",
  muted: "#898c89",
  mutedBg: "#faf8f5",
  border: "#ded3c5",
  borderLight: "#e5ddd2",
  text: "#263b48",
  textMuted: "#7e8584",
  warm: "#9b8258",
  error: "#c0392b",
  errorBg: "#fae9e7",
};

// ─── Data model ──────────────────────────────────────────────────────────────
interface Guest {
  id: string;
  name: string;
  initials: string;
  dietary: "Viande" | "Végétarien" | "Poisson" | "Vegan" | "Sans gluten";
  status: "Confirmé" | "En attente";
  color: string;
}

interface Seat {
  id: string;
  guestId: string | null;
}

interface Table {
  id: string;
  name: string;
  isHonneur: boolean;
  shape: "round" | "rect";
  capacity: number;
  seats: Seat[];
  x: number; // percent of canvas
  y: number;
}

const dietaryColor: Record<Guest["dietary"], { bg: string; text: string; icon: boolean }> = {
  "Viande":        { bg: "#f0ebe1", text: T.warm, icon: false },
  "Végétarien":    { bg: T.sageLight, text: T.sageDark, icon: true },
  "Poisson":       { bg: "#dde3f0", text: "#4d6080", icon: false },
  "Vegan":         { bg: "#d8edde", text: "#3b6e46", icon: true },
  "Sans gluten":   { bg: "#f0e2cb", text: "#7d5c2a", icon: false },
};

const GUEST_COLORS = [
  "#ebe2d4","#dce4e5","#e2dceb","#d8e0dc","#eadfdf","#ddd9e6","#e8ddd0","#dce7df",
  "#e5dce8","#d5e2e8","#e8e0d5","#dbe5db",
];

const INITIAL_GUESTS: Guest[] = [
  { id: "g1",  name: "Claire Fontaine",       initials: "CF", dietary: "Végétarien",  status: "Confirmé",   color: GUEST_COLORS[0] },
  { id: "g2",  name: "Marc Duvall",            initials: "MD", dietary: "Viande",      status: "Confirmé",   color: GUEST_COLORS[1] },
  { id: "g3",  name: "Sophie Duvall",          initials: "SD", dietary: "Poisson",     status: "Confirmé",   color: GUEST_COLORS[2] },
  { id: "g4",  name: "Jean-Pierre Moreau",     initials: "JP", dietary: "Viande",      status: "Confirmé",   color: GUEST_COLORS[3] },
  { id: "g5",  name: "Isabelle Laurent",       initials: "IL", dietary: "Végétarien",  status: "Confirmé",   color: GUEST_COLORS[4] },
  { id: "g6",  name: "Thomas Bernard",         initials: "TB", dietary: "Viande",      status: "Confirmé",   color: GUEST_COLORS[5] },
  { id: "g7",  name: "Émilie Rousseau",        initials: "ER", dietary: "Sans gluten", status: "Confirmé",   color: GUEST_COLORS[6] },
  { id: "g8",  name: "Nicolas Petit",          initials: "NP", dietary: "Viande",      status: "Confirmé",   color: GUEST_COLORS[7] },
  { id: "g9",  name: "Camille Morel",          initials: "CM", dietary: "Vegan",       status: "Confirmé",   color: GUEST_COLORS[8] },
  { id: "g10", name: "Pierre Leclerc",         initials: "PL", dietary: "Poisson",     status: "En attente", color: GUEST_COLORS[9] },
  { id: "g11", name: "Anne-Sophie Girard",     initials: "AG", dietary: "Végétarien",  status: "En attente", color: GUEST_COLORS[10] },
  { id: "g12", name: "François Dupont",        initials: "FD", dietary: "Viande",      status: "Confirmé",   color: GUEST_COLORS[11] },
  { id: "g13", name: "Hélène Martin",          initials: "HM", dietary: "Sans gluten", status: "Confirmé",   color: GUEST_COLORS[0] },
  { id: "g14", name: "Louis Chevalier",        initials: "LC", dietary: "Viande",      status: "Confirmé",   color: GUEST_COLORS[1] },
  { id: "g15", name: "Juliette Blanc",         initials: "JB", dietary: "Végétarien",  status: "En attente", color: GUEST_COLORS[2] },
  { id: "g16", name: "Mathieu Simon",          initials: "MS", dietary: "Viande",      status: "Confirmé",   color: GUEST_COLORS[3] },
];

function makeSeat(id: string, guestId?: string): Seat {
  return { id, guestId: guestId ?? null };
}

function makeTable(
  id: string, name: string, isHonneur: boolean, shape: "round" | "rect",
  capacity: number, x: number, y: number, preplaced: Array<[string, string]> = []
): Table {
  const seats: Seat[] = [];
  for (let i = 0; i < capacity; i++) {
    const preplaced_entry = preplaced.find(([, sid]) => sid === `s${id}_${i}`);
    seats.push(makeSeat(`s${id}_${i}`, preplaced_entry ? preplaced_entry[0] : undefined));
  }
  return { id, name, isHonneur, shape, capacity, seats, x, y };
}

const INITIAL_TABLES: Table[] = [
  makeTable("honneur",  "Table de honneur",  true,  "rect",  10, 50,  6,  [
    ["g1","shonneur_0"],["g2","shonneur_1"],["g3","shonneur_2"],["g4","shonneur_3"],
    ["g5","shonneur_4"],["g6","shonneur_5"],
  ]),
  makeTable("1",  "Table 1",  false, "round",  8, 14, 32,  [["g7","s1_0"],["g8","s1_1"],["g9","s1_2"]]),
  makeTable("2",  "Table 2",  false, "round",  8, 34, 32,  [["g10","s2_0"],["g11","s2_1"]]),
  makeTable("3",  "Table 3",  false, "round",  8, 66, 32,  [["g12","s3_0"],["g13","s3_1"],["g14","s3_2"]]),
  makeTable("4",  "Table 4",  false, "round",  8, 86, 32,  [["g15","s4_0"],["g16","s4_1"]]),
  makeTable("5",  "Table 5",  false, "round",  8, 14, 70,  []),
  makeTable("6",  "Table 6",  false, "round",  8, 34, 70,  []),
  makeTable("7",  "Table 7",  false, "round",  8, 66, 70,  []),
  makeTable("8",  "Table 8",  false, "round",  8, 86, 70,  []),
];

// Pre-assign seats properly using indices, not seat-id matching
const TABLES_INIT: Table[] = INITIAL_TABLES.map(t => {
  const assignments: Record<number, string> = {};
  if (t.id === "honneur") {
    const gs = ["g1","g2","g3","g4","g5","g6"];
    gs.forEach((gid, i) => { assignments[i] = gid; });
  } else if (t.id === "1") {
    assignments[0] = "g7"; assignments[1] = "g8"; assignments[2] = "g9";
  } else if (t.id === "2") {
    assignments[0] = "g10"; assignments[1] = "g11";
  } else if (t.id === "3") {
    assignments[0] = "g12"; assignments[1] = "g13"; assignments[2] = "g14";
  } else if (t.id === "4") {
    assignments[0] = "g15"; assignments[1] = "g16";
  }
  return {
    ...t,
    seats: t.seats.map((_, i) => makeSeat(`s${t.id}_${i}`, assignments[i])),
  };
});

// ─── Helpers ─────────────────────────────────────────────────────────────────
function seatPosition(index: number, total: number, radius: number): { x: number; y: number } {
  const angle = (2 * Math.PI * index) / total - Math.PI / 2;
  return { x: Math.cos(angle) * radius, y: Math.sin(angle) * radius };
}

function guestById(guests: Guest[], id: string | null): Guest | undefined {
  if (!id) return undefined;
  return guests.find(g => g.id === id);
}

function DietaryBadge({ dietary }: { dietary: Guest["dietary"] }) {
  const c = dietaryColor[dietary];
  return (
    <span className="inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[7px] font-semibold leading-tight"
      style={{ background: c.bg, color: c.text }}>
      {c.icon && <Leaf size={7} />}
      {dietary}
    </span>
  );
}

// ─── Round Table SVG component ────────────────────────────────────────────────
function RoundTableSVG({
  table, guests, selected, focusedTableId,
  onSeatClick, onTableFocus,
}: {
  table: Table;
  guests: Guest[];
  selected: Guest | null;
  focusedTableId: string | null;
  onSeatClick: (tableId: string, seatIndex: number) => void;
  onTableFocus: (tableId: string) => void;
}) {
  const size = 148;
  const cx = size / 2, cy = size / 2;
  const tableR = 28;
  const seatR = 16;
  const orbitR = tableR + seatR + 6;
  const isFocused = focusedTableId === table.id;
  const filledSeats = table.seats.filter(s => s.guestId).length;

  return (
    <g onClick={() => onTableFocus(table.id)} style={{ cursor: "pointer" }}>
      {/* Table circle */}
      <circle cx={cx} cy={cy} r={tableR}
        fill={isFocused ? T.navy : "#e8e2d8"}
        stroke={isFocused ? T.gold : T.border}
        strokeWidth={isFocused ? 1.5 : 1}
      />
      <text x={cx} y={cy - 4} textAnchor="middle" fontSize="8" fontWeight="600"
        fill={isFocused ? T.goldLight : T.warm}
        fontFamily="'Cormorant Garamond', Georgia, serif"
      >
        {table.name}
      </text>
      <text x={cx} y={cy + 7} textAnchor="middle" fontSize="7"
        fill={isFocused ? "#c4cbc8" : T.muted}>
        {filledSeats}/{table.capacity}
      </text>

      {/* Seats */}
      {table.seats.map((seat, i) => {
        const { x, y } = seatPosition(i, table.capacity, orbitR);
        const sx = cx + x, sy = cy + y;
        const guest = guestById(guests, seat.guestId);
        const isEmpty = !guest;
        const canDrop = isEmpty && selected !== null;
        const dietC = guest ? dietaryColor[guest.dietary] : null;

        return (
          <g key={seat.id}
            onClick={e => { e.stopPropagation(); onSeatClick(table.id, i); }}
            style={{ cursor: canDrop || guest ? "pointer" : "default" }}>
            <circle cx={sx} cy={sy} r={seatR}
              fill={
                canDrop
                  ? T.goldPale
                  : guest
                    ? (dietC?.bg ?? T.ivoryDark)
                    : T.ivoryDark
              }
              stroke={
                canDrop
                  ? T.gold
                  : selected?.id === guest?.id
                    ? T.navy
                    : guest
                      ? T.border
                      : T.sand
              }
              strokeWidth={canDrop ? 1.5 : selected?.id === guest?.id ? 2 : 0.8}
              strokeDasharray={canDrop ? "3,2" : undefined}
            />
            {guest ? (
              <>
                <text x={sx} y={sy + 1} textAnchor="middle" dominantBaseline="middle"
                  fontSize="8" fontWeight="600" fill={T.navy}
                  fontFamily="'Cormorant Garamond', Georgia, serif">
                  {guest.initials}
                </text>
                {/* Dietary dot */}
                <circle cx={sx + seatR - 4} cy={sy - seatR + 4} r={4}
                  fill={dietC?.bg ?? T.sand}
                  stroke={T.ivory} strokeWidth={0.8}
                />
                {(guest.dietary === "Végétarien" || guest.dietary === "Vegan") && (
                  <text x={sx + seatR - 4} y={sy - seatR + 4}
                    textAnchor="middle" dominantBaseline="middle"
                    fontSize="4.5" fill={dietC?.text ?? T.warm}>v</text>
                )}
              </>
            ) : (
              <text x={sx} y={sy + 1} textAnchor="middle" dominantBaseline="middle"
                fontSize="8" fill={T.sand}>+</text>
            )}
          </g>
        );
      })}
    </g>
  );
}

// ─── Head table (rectangular) ─────────────────────────────────────────────────
function HeadTableSVG({
  table, guests, selected, focusedTableId,
  onSeatClick, onTableFocus,
}: {
  table: Table;
  guests: Guest[];
  selected: Guest | null;
  focusedTableId: string | null;
  onSeatClick: (tableId: string, seatIndex: number) => void;
  onTableFocus: (tableId: string) => void;
}) {
  const svgW = 480, svgH = 90;
  const tableW = 380, tableH = 30;
  const tx = (svgW - tableW) / 2, ty = (svgH - tableH) / 2;
  const seatR = 14;
  const perRow = Math.ceil(table.capacity / 2);
  const seatSpacing = tableW / (perRow - 1);
  const isFocused = focusedTableId === table.id;

  const seatPos = (i: number) => {
    const row = i < perRow ? 0 : 1;
    const col = i < perRow ? i : i - perRow;
    const x = tx + col * seatSpacing;
    const y = row === 0 ? ty - seatR - 6 : ty + tableH + seatR + 6;
    return { x, y };
  };

  return (
    <g onClick={() => onTableFocus(table.id)} style={{ cursor: "pointer" }}>
      <rect x={tx} y={ty} width={tableW} height={tableH} rx={4}
        fill={isFocused ? T.navy : "#e8e2d8"}
        stroke={isFocused ? T.gold : T.border}
        strokeWidth={isFocused ? 1.5 : 1}
      />
      <text x={svgW / 2} y={ty + tableH / 2 + 1} textAnchor="middle" dominantBaseline="middle"
        fontSize="10" fontWeight="600"
        fill={isFocused ? T.goldLight : T.warm}
        fontFamily="'Cormorant Garamond', Georgia, serif" letterSpacing="0.05em">
        {table.name.toUpperCase()}
      </text>

      {table.seats.map((seat, i) => {
        const { x, y } = seatPos(i);
        const guest = guestById(guests, seat.guestId);
        const isEmpty = !guest;
        const canDrop = isEmpty && selected !== null;
        const dietC = guest ? dietaryColor[guest.dietary] : null;

        return (
          <g key={seat.id}
            onClick={e => { e.stopPropagation(); onSeatClick(table.id, i); }}
            style={{ cursor: canDrop || guest ? "pointer" : "default" }}>
            <circle cx={x} cy={y} r={seatR}
              fill={canDrop ? T.goldPale : guest ? (dietC?.bg ?? T.ivoryDark) : T.ivoryDark}
              stroke={canDrop ? T.gold : guest ? T.border : T.sand}
              strokeWidth={canDrop ? 1.5 : 0.8}
              strokeDasharray={canDrop ? "3,2" : undefined}
            />
            {guest ? (
              <>
                <text x={x} y={y + 1} textAnchor="middle" dominantBaseline="middle"
                  fontSize="7.5" fontWeight="600" fill={T.navy}
                  fontFamily="'Cormorant Garamond', Georgia, serif">
                  {guest.initials}
                </text>
                <circle cx={x + seatR - 4} cy={y - seatR + 4} r={3.5}
                  fill={dietC?.bg ?? T.sand} stroke={T.ivory} strokeWidth={0.8}/>
              </>
            ) : (
              <text x={x} y={y + 1} textAnchor="middle" dominantBaseline="middle"
                fontSize="8" fill={T.sand}>+</text>
            )}
          </g>
        );
      })}
    </g>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export function SeatingChart() {
  const [tables, setTables] = useState<Table[]>(TABLES_INIT);
  const [guests] = useState<Guest[]>(INITIAL_GUESTS);
  const [selected, setSelected] = useState<Guest | null>(null);
  const [focusedTableId, setFocusedTableId] = useState<string | null>(null);
  const [notice, setNotice] = useState("");
  const [sidePanel, setSidePanel] = useState<"unassigned" | "detail">("unassigned");

  const showNotice = (msg: string) => {
    setNotice(msg);
    setTimeout(() => setNotice(""), 2400);
  };

  // Derive state
  const assignedGuestIds = new Set(
    tables.flatMap(t => t.seats.map(s => s.guestId).filter(Boolean))
  );
  const unassignedGuests = guests.filter(g => !assignedGuestIds.has(g.id));
  const focusedTable = tables.find(t => t.id === focusedTableId) ?? null;
  const totalSeats = tables.reduce((acc, t) => acc + t.capacity, 0);
  const takenSeats = tables.reduce((acc, t) => acc + t.seats.filter(s => s.guestId).length, 0);

  const handleSeatClick = useCallback((tableId: string, seatIndex: number) => {
    const table = tables.find(t => t.id === tableId);
    if (!table) return;
    const seat = table.seats[seatIndex];
    const occupant = guestById(guests, seat.guestId);

    if (!selected) {
      // No guest selected: if seat has an occupant, select them for moving
      if (occupant) {
        setSelected(occupant);
        showNotice(`${occupant.name} sélectionné(e) — cliquez sur un siège pour déplacer`);
      }
      return;
    }

    // A guest is selected
    if (occupant && occupant.id === selected.id) {
      // Clicking their own seat → deselect
      setSelected(null);
      return;
    }

    setTables(prev => prev.map(t => {
      if (t.id !== tableId) {
        // Remove selected guest from any other table
        return {
          ...t,
          seats: t.seats.map(s => s.guestId === selected.id ? { ...s, guestId: null } : s),
        };
      }
      // Place selected guest into the clicked seat, swap if occupied
      const evicted = seat.guestId;
      return {
        ...t,
        seats: t.seats.map((s, i) => {
          if (i === seatIndex) return { ...s, guestId: selected.id };
          if (s.guestId === selected.id) return { ...s, guestId: evicted ?? null };
          return s;
        }),
      };
    }));

    showNotice(`${selected.name} placé(e) à ${table.name}`);
    setSelected(null);
  }, [selected, tables, guests]);

  const handleTableFocus = useCallback((tableId: string) => {
    setFocusedTableId(prev => prev === tableId ? null : tableId);
    setSidePanel("detail");
  }, []);

  const handleGuestSelect = useCallback((guest: Guest) => {
    if (selected?.id === guest.id) {
      setSelected(null);
    } else {
      setSelected(guest);
      showNotice(`${guest.name} sélectionné(e) — cliquez sur un siège pour placer`);
    }
  }, [selected]);

  const handleRemoveFromSeat = useCallback((tableId: string, seatIndex: number) => {
    setTables(prev => prev.map(t => {
      if (t.id !== tableId) return t;
      return {
        ...t,
        seats: t.seats.map((s, i) => i === seatIndex ? { ...s, guestId: null } : s),
      };
    }));
    showNotice("Invité retiré du siège");
  }, []);

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen w-full" style={{ background: T.ivory, color: T.navy, fontFamily: "'DM Sans', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;0,700;1,400;1,600&family=DM+Sans:wght@400;500;600;700&display=swap');
        .nuptial-serif { font-family: 'Cormorant Garamond', Georgia, serif; }
        .seat-drop-target:hover { stroke-width: 2 !important; }
      `}</style>

      {/* Header */}
      <header style={{ background: "rgba(248,245,239,0.97)", borderBottom: `1px solid ${T.border}` }}
        className="sticky top-0 z-30 flex h-[62px] items-center justify-between px-6 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <span className="nuptial-serif flex h-8 w-8 items-center justify-center border text-[21px]"
            style={{ borderColor: T.gold, color: T.gold }}>N</span>
          <div>
            <p className="nuptial-serif text-[20px] leading-[17px]">Plan de table</p>
            <p className="text-[7px] font-semibold uppercase tracking-[0.22em]" style={{ color: T.warm }}>
              Sophie &amp; James Hartwell · 18 Octobre 2024
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {unassignedGuests.length > 0 && (
            <div className="flex items-center gap-2 rounded-full px-3 py-1.5 text-[9px] font-semibold"
              style={{ background: T.goldPale, color: T.warm }}>
              <AlertCircle size={12} />
              {unassignedGuests.length} invité{unassignedGuests.length > 1 ? "s" : ""} non placé{unassignedGuests.length > 1 ? "s" : ""}
            </div>
          )}
          {unassignedGuests.length === 0 && (
            <div className="flex items-center gap-2 rounded-full px-3 py-1.5 text-[9px] font-semibold"
              style={{ background: T.sageLight, color: T.sageDark }}>
              <Check size={12} />
              Tous les invités placés
            </div>
          )}
        </div>
      </header>

      <div className="flex h-[calc(100vh-62px)]">
        {/* ── Left: Floor plan canvas ───────────────────────────────────────── */}
        <div className="flex-1 overflow-auto p-4" style={{ background: T.ivoryDark }}>
          {/* Stats bar */}
          <div className="mb-3 flex items-center gap-4">
            <div className="flex items-center gap-1.5 text-[10px]" style={{ color: T.textMuted }}>
              <Users size={12} />
              <span>{takenSeats} / {totalSeats} sièges occupés</span>
            </div>
            <div className="h-1 flex-1 rounded-full" style={{ background: T.sand }}>
              <div className="h-full rounded-full transition-all duration-500"
                style={{ width: `${Math.round((takenSeats / totalSeats) * 100)}%`, background: T.sage }} />
            </div>
            <span className="text-[10px] font-semibold" style={{ color: T.sage }}>
              {Math.round((takenSeats / totalSeats) * 100)}%
            </span>
          </div>

          {/* Canvas */}
          <div className="relative rounded-sm" style={{ background: "#ede7db", border: `1px solid ${T.border}`, minHeight: 540 }}>
            {/* Venue label */}
            <div className="absolute left-0 right-0 top-2 flex justify-center">
              <span className="text-[8px] font-semibold uppercase tracking-[0.25em]" style={{ color: T.muted }}>
                The Orangery at Wychwood
              </span>
            </div>

            {/* Dance floor indicator */}
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center justify-center rounded-full"
              style={{ width: 100, height: 60, background: "rgba(255,255,255,0.35)", border: `1px dashed ${T.border}` }}>
              <span className="text-[7px] uppercase tracking-[0.18em]" style={{ color: T.muted }}>Piste de danse</span>
            </div>

            {/* Head table */}
            <div className="absolute" style={{ left: "50%", top: "7%", transform: "translateX(-50%)", width: 480 }}>
              <svg width="480" height="90" style={{ overflow: "visible" }}>
                <HeadTableSVG
                  table={tables.find(t => t.id === "honneur")!}
                  guests={guests}
                  selected={selected}
                  focusedTableId={focusedTableId}
                  onSeatClick={handleSeatClick}
                  onTableFocus={handleTableFocus}
                />
              </svg>
            </div>

            {/* Round tables — top row */}
            {[
              { id: "1",  left: "3%",  top: "25%" },
              { id: "2",  left: "22%", top: "25%" },
              { id: "3",  left: "57%", top: "25%" },
              { id: "4",  left: "76%", top: "25%" },
            ].map(({ id, left, top }) => {
              const table = tables.find(t => t.id === id);
              if (!table) return null;
              return (
                <div key={id} className="absolute" style={{ left, top, width: 148, height: 148 }}>
                  <svg width="148" height="148" style={{ overflow: "visible" }}>
                    <RoundTableSVG table={table} guests={guests} selected={selected}
                      focusedTableId={focusedTableId}
                      onSeatClick={handleSeatClick} onTableFocus={handleTableFocus}
                    />
                  </svg>
                </div>
              );
            })}

            {/* Round tables — bottom row */}
            {[
              { id: "5", left: "3%",  top: "58%" },
              { id: "6", left: "22%", top: "58%" },
              { id: "7", left: "57%", top: "58%" },
              { id: "8", left: "76%", top: "58%" },
            ].map(({ id, left, top }) => {
              const table = tables.find(t => t.id === id);
              if (!table) return null;
              return (
                <div key={id} className="absolute" style={{ left, top, width: 148, height: 148 }}>
                  <svg width="148" height="148" style={{ overflow: "visible" }}>
                    <RoundTableSVG table={table} guests={guests} selected={selected}
                      focusedTableId={focusedTableId}
                      onSeatClick={handleSeatClick} onTableFocus={handleTableFocus}
                    />
                  </svg>
                </div>
              );
            })}
          </div>

          {/* Legend */}
          <div className="mt-3 flex flex-wrap items-center gap-4 text-[8.5px]" style={{ color: T.textMuted }}>
            <span className="font-semibold uppercase tracking-[0.12em]">Régimes :</span>
            {Object.entries(dietaryColor).map(([label, c]) => (
              <span key={label} className="flex items-center gap-1">
                <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: c.bg, border: `1px solid ${T.border}` }}/>
                {label}
              </span>
            ))}
          </div>
        </div>

        {/* ── Right: Side panel ────────────────────────────────────────────── */}
        <div className="flex w-[280px] shrink-0 flex-col border-l" style={{ borderColor: T.border, background: T.ivory }}>
          {/* Panel tabs */}
          <div className="flex border-b" style={{ borderColor: T.border }}>
            <button
              onClick={() => setSidePanel("unassigned")}
              className="flex flex-1 items-center justify-center gap-1.5 py-3 text-[9px] font-semibold uppercase tracking-[0.13em] transition"
              style={{
                borderBottom: sidePanel === "unassigned" ? `2px solid ${T.gold}` : "2px solid transparent",
                color: sidePanel === "unassigned" ? T.warm : T.muted,
                background: "transparent",
              }}>
              <List size={12} />
              Invités non placés
              {unassignedGuests.length > 0 && (
                <span className="ml-1 rounded-full px-1.5 py-0.5 text-[7px] font-bold"
                  style={{ background: T.goldPale, color: T.warm }}>
                  {unassignedGuests.length}
                </span>
              )}
            </button>
            <button
              onClick={() => setSidePanel("detail")}
              className="flex flex-1 items-center justify-center gap-1.5 py-3 text-[9px] font-semibold uppercase tracking-[0.13em] transition"
              style={{
                borderBottom: sidePanel === "detail" ? `2px solid ${T.gold}` : "2px solid transparent",
                color: sidePanel === "detail" ? T.warm : T.muted,
                background: "transparent",
              }}>
              <LayoutGrid size={12} />
              Détail table
            </button>
          </div>

          {/* Selected guest banner */}
          {selected && (
            <div className="flex items-center gap-2 border-b px-3 py-2.5"
              style={{ background: "#f0ebe0", borderColor: T.border }}>
              <span className="nuptial-serif flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[12px]"
                style={{ background: selected.color, color: T.navy }}>
                {selected.initials}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[10px] font-semibold">{selected.name}</p>
                <p className="text-[8px]" style={{ color: T.warm }}>Cliquez un siège pour placer</p>
              </div>
              <button onClick={() => setSelected(null)} style={{ color: T.muted }}
                className="flex h-5 w-5 shrink-0 items-center justify-center">
                <X size={12} />
              </button>
            </div>
          )}

          {/* Panel content */}
          <div className="flex-1 overflow-y-auto">
            {sidePanel === "unassigned" && (
              <div>
                {unassignedGuests.length === 0 ? (
                  <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full"
                      style={{ background: T.sageLight }}>
                      <Check size={20} style={{ color: T.sage }} />
                    </div>
                    <div>
                      <p className="nuptial-serif text-[18px]">Tous placés !</p>
                      <p className="mt-1 text-[9px]" style={{ color: T.textMuted }}>
                        Tous les invités ont un siège.
                      </p>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="px-4 pb-1 pt-3">
                      <p className="text-[8.5px] font-semibold uppercase tracking-[0.16em]" style={{ color: T.warm }}>
                        Invités non placés · {unassignedGuests.length}
                      </p>
                      <p className="mt-0.5 text-[8px]" style={{ color: T.textMuted }}>
                        Cliquez pour sélectionner, puis cliquez un siège
                      </p>
                    </div>
                    {unassignedGuests.map(guest => (
                      <GuestRow key={guest.id} guest={guest} selected={selected}
                        onClick={() => handleGuestSelect(guest)} />
                    ))}
                  </>
                )}

                {/* All assigned guests (collapsed list) */}
                {assignedGuestIds.size > 0 && (
                  <div className="mt-2 border-t px-4 pt-3" style={{ borderColor: T.border }}>
                    <p className="mb-2 text-[8.5px] font-semibold uppercase tracking-[0.16em]" style={{ color: T.muted }}>
                      Placés · {assignedGuestIds.size}
                    </p>
                    {guests.filter(g => assignedGuestIds.has(g.id)).map(guest => (
                      <GuestRow key={guest.id} guest={guest} selected={selected}
                        onClick={() => handleGuestSelect(guest)} compact />
                    ))}
                  </div>
                )}
              </div>
            )}

            {sidePanel === "detail" && (
              <div>
                {!focusedTable ? (
                  <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
                    <LayoutGrid size={28} style={{ color: T.sand }} />
                    <p className="text-[10px]" style={{ color: T.textMuted }}>
                      Cliquez sur une table<br />pour voir ses détails
                    </p>
                  </div>
                ) : (
                  <TableDetail
                    table={focusedTable} guests={guests}
                    onRemove={handleRemoveFromSeat}
                    onSelectGuest={handleGuestSelect}
                    selected={selected}
                  />
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Navigation hint */}
      {!selected && (
        <div className="pointer-events-none fixed bottom-5 left-1/2 -translate-x-1/2 text-[8.5px] font-medium"
          style={{ color: T.muted }}>
          Cliquez sur un siège occupé pour sélectionner · Cliquez un siège vide pour placer
        </div>
      )}

      {/* Toast */}
      {notice && (
        <div className="fixed bottom-8 left-1/2 z-50 flex -translate-x-1/2 items-center gap-2 whitespace-nowrap px-4 py-2.5 text-[10px] shadow-xl"
          style={{ background: T.navy, color: "#f8f3ea" }}>
          <Check size={13} style={{ color: T.goldLight }} />
          {notice}
        </div>
      )}
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────
function GuestRow({
  guest, selected, onClick, compact = false,
}: {
  guest: Guest;
  selected: Guest | null;
  onClick: () => void;
  compact?: boolean;
}) {
  const isSelected = selected?.id === guest.id;
  return (
    <button
      onClick={onClick}
      className="flex w-full items-center gap-2.5 border-b px-4 text-left transition"
      style={{
        padding: compact ? "8px 16px" : "10px 16px",
        borderColor: T.borderLight,
        background: isSelected ? "#f0ebe0" : "transparent",
        outline: isSelected ? `2px solid ${T.gold}` : "none",
        outlineOffset: -2,
      }}>
      <span className="nuptial-serif flex shrink-0 items-center justify-center rounded-full font-semibold"
        style={{
          width: compact ? 28 : 32, height: compact ? 28 : 32,
          fontSize: compact ? 11 : 13,
          background: guest.color, color: T.navy,
        }}>
        {guest.initials}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate font-semibold" style={{ fontSize: compact ? 9.5 : 10.5, color: T.navy }}>
          {guest.name}
        </p>
        <div className="mt-0.5 flex items-center gap-1.5">
          <DietaryBadge dietary={guest.dietary} />
          {guest.status === "En attente" && (
            <span className="rounded-full px-1.5 py-0.5 text-[7px] font-semibold"
              style={{ background: "#f0e2cb", color: "#967346" }}>
              En attente
            </span>
          )}
        </div>
      </div>
      {isSelected && <Check size={12} style={{ color: T.gold, flexShrink: 0 }} />}
    </button>
  );
}

function TableDetail({
  table, guests, onRemove, onSelectGuest, selected,
}: {
  table: Table;
  guests: Guest[];
  onRemove: (tableId: string, seatIndex: number) => void;
  onSelectGuest: (guest: Guest) => void;
  selected: Guest | null;
}) {
  const occupants = table.seats
    .map((seat, i) => ({ seat, i, guest: guestById(guests, seat.guestId) }))
    .filter(s => s.guest);
  const emptySeats = table.seats.filter(s => !s.guestId).length;

  return (
    <div>
      <div className="border-b px-4 pb-4 pt-3" style={{ borderColor: T.border }}>
        <p className="text-[8px] font-semibold uppercase tracking-[0.16em]" style={{ color: T.warm }}>
          {table.isHonneur ? "Table de honneur" : "Table ronde"}
        </p>
        <h3 className="nuptial-serif mt-0.5 text-[22px] leading-none">{table.name}</h3>
        <div className="mt-2 flex items-center gap-3 text-[9px]" style={{ color: T.textMuted }}>
          <span>{occupants.length} / {table.capacity} invités</span>
          <span>·</span>
          <span style={{ color: emptySeats > 0 ? T.warm : T.sage }}>
            {emptySeats > 0 ? `${emptySeats} siège${emptySeats > 1 ? "s" : ""} libre${emptySeats > 1 ? "s" : ""}` : "Table complète"}
          </span>
        </div>
        <div className="mt-2 h-1 rounded-full" style={{ background: T.sand }}>
          <div className="h-full rounded-full transition-all"
            style={{
              width: `${(occupants.length / table.capacity) * 100}%`,
              background: occupants.length === table.capacity ? T.sage : T.gold,
            }} />
        </div>
      </div>

      {occupants.length === 0 ? (
        <div className="px-4 py-6 text-center text-[9px]" style={{ color: T.textMuted }}>
          Aucun invité placé à cette table
        </div>
      ) : (
        <div>
          {occupants.map(({ seat, i, guest }) => (
            guest && (
              <div key={seat.id}
                className="flex items-center gap-2.5 border-b px-4 py-2.5"
                style={{ borderColor: T.borderLight }}>
                <span className="nuptial-serif flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[11px]"
                  style={{ background: guest.color, color: T.navy }}>
                  {guest.initials}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[10px] font-semibold">{guest.name}</p>
                  <div className="mt-0.5 flex items-center gap-1">
                    <DietaryBadge dietary={guest.dietary} />
                    <span className="text-[7px]" style={{ color: T.muted }}>Siège {i + 1}</span>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <button
                    onClick={() => onSelectGuest(guest)}
                    className="flex h-6 w-6 items-center justify-center rounded transition"
                    style={{
                      background: selected?.id === guest.id ? T.goldPale : "transparent",
                      color: T.muted,
                    }}
                    title="Sélectionner pour déplacer">
                    <ChevronRight size={11} />
                  </button>
                  <button
                    onClick={() => onRemove(table.id, i)}
                    className="flex h-6 w-6 items-center justify-center rounded transition"
                    style={{ color: T.muted }}
                    title="Retirer du siège">
                    <X size={11} />
                  </button>
                </div>
              </div>
            )
          ))}
        </div>
      )}

      {/* Dietary summary */}
      {occupants.length > 0 && (
        <div className="px-4 pt-3">
          <p className="mb-2 text-[8px] font-semibold uppercase tracking-[0.14em]" style={{ color: T.muted }}>
            Résumé régimes
          </p>
          {Object.entries(
            occupants.reduce<Record<string, number>>((acc, { guest }) => {
              if (guest) acc[guest.dietary] = (acc[guest.dietary] ?? 0) + 1;
              return acc;
            }, {})
          ).map(([diet, count]) => (
            <div key={diet} className="mb-1 flex items-center justify-between text-[9px]">
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full" style={{ background: dietaryColor[diet as Guest["dietary"]]?.bg ?? T.sand }} />
                {diet}
              </span>
              <span style={{ color: T.textMuted }}>{count} invité{count > 1 ? "s" : ""}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
