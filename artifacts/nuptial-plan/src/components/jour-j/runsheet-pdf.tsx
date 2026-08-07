/**
 * RunsheetPDF — Jardin Parisien branded PDF export
 * Uses @react-pdf/renderer (browser-side, v4+)
 *
 * Fixes vs previous version:
 *  - Removed emoji (📍 👥) — react-pdf throws on unknown glyphs
 *  - Removed textDecoration:'line-through' — not supported in v4
 *  - Switched fonts to TTF via Google Fonts static CDN (WOFF2 had CORS issues)
 *  - Added Font.registerHyphenationCallback to prevent layout crashes
 */
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  pdf,
  Font,
} from '@react-pdf/renderer';

/* ── Disable automatic hyphenation (prevents layout engine crashes) ── */
Font.registerHyphenationCallback((word) => [word]);

/* ── Brand fonts via Google Fonts TTF (no CORS issues) ── */
const GF = 'https://fonts.gstatic.com/s';

Font.register({
  family: 'Cormorant',
  fonts: [
    {
      src: `${GF}/cormorantgaramond/v22/co3YmX5slCNuHLi8bLeY9MK7whWMhyjYrnFLsS6V7w.ttf`,
      fontWeight: 400,
    },
    {
      src: `${GF}/cormorantgaramond/v22/co3VmX5slCNuHLi8bLeY9MK7whWMhyjQAllvsHghyw.ttf`,
      fontWeight: 700,
    },
    {
      src: `${GF}/cormorantgaramond/v22/co3ZmX5slCNuHLi8bLeY9MK7whWMhyjYrnFLsS6V7w.ttf`,
      fontWeight: 400,
      fontStyle: 'italic',
    },
  ],
});

Font.register({
  family: 'DMSans',
  fonts: [
    {
      src: `${GF}/dmsans/v15/rP2tp2ywxg089UriI5-g4vlH9VoD8Cmcqbu0-K4.ttf`,
      fontWeight: 400,
    },
    {
      src: `${GF}/dmsans/v15/rP2tp2ywxg089UriCZ-g4vlH9VoD8Cmcqbu0-K4.ttf`,
      fontWeight: 500,
    },
    {
      src: `${GF}/dmsans/v15/rP2tp2ywxg089Uri8Z-g4vlH9VoD8Cmcqbu0-K4.ttf`,
      fontWeight: 700,
    },
  ],
});

/* ── Exact brand palette from tokens ── */
const PLUM       = '#3C1A3C';
const PLUM_MID   = '#5D2D5D';
const PLUM_LIGHT = '#8A4A8A';
const GOLD       = '#C8A96E';
const GOLD_DIM   = '#a8893e';
const SAGE       = '#6B8C72';
const ROSE       = '#CC8C94';
const CREAM      = '#F8F3EE';   // --background
const CARD       = '#faf8fa';
const MUTED      = '#7a7080';
const BORDER     = 'rgba(200,180,200,0.28)';

/* ── Tone accent map ── */
const TONE_HEX: Record<string, string> = {
  plum:     PLUM_MID,
  rose:     ROSE,
  sage:     SAGE,
  gold:     GOLD,
  lavender: '#9B89C4',
  blue:     '#6B8FC0',
};

/* ── Types ── */
export interface PDFEvent {
  id:         number;
  title:      string;
  eventDate:  string;
  eventTime?: string | null;
  location?:  string | null;
  actors?:    string | null;
  detail?:    string | null;
  tone?:      string | null;
  completed:  boolean;
}

export interface PDFWedding {
  names:       string;
  weddingDate: string;
  venue?:      string | null;
}

/* ── Styles ── */
const s = StyleSheet.create({

  /* Page */
  page: {
    fontFamily:      'DMSans',
    backgroundColor: '#ffffff',
    paddingBottom:   56,
  },

  /* ── Cover header ── */
  header: {
    backgroundColor:  PLUM,
    paddingHorizontal: 40,
    paddingTop:       36,
    paddingBottom:    28,
  },
  headerEyebrow: {
    color:        GOLD,
    fontSize:     7,
    letterSpacing: 3,
    marginBottom:  8,
    fontFamily:   'DMSans',
    fontWeight:   700,
  },
  headerTitle: {
    color:      '#ffffff',
    fontSize:   30,
    fontFamily: 'Cormorant',
    fontWeight: 700,
    lineHeight:  1.1,
    marginBottom: 6,
  },
  headerSub: {
    color:      'rgba(255,255,255,0.55)',
    fontSize:   9.5,
    letterSpacing: 0.4,
    fontFamily: 'DMSans',
    fontWeight: 400,
  },
  headerGoldBar: {
    height:          1.5,
    backgroundColor: GOLD,
    opacity:         0.40,
    marginTop:       18,
  },

  /* ── Stats band ── */
  statsBand: {
    backgroundColor:  CREAM,
    paddingHorizontal: 40,
    paddingVertical:  10,
    flexDirection:    'row',
    alignItems:       'center',
    justifyContent:   'space-between',
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  statsBandLabel: {
    fontSize:     7.5,
    color:        MUTED,
    letterSpacing: 1.6,
    fontFamily:   'DMSans',
    fontWeight:   700,
  },
  statsBandPct: {
    fontSize:   10,
    color:      PLUM_MID,
    fontFamily: 'Cormorant',
    fontWeight: 700,
  },

  /* ── Body ── */
  body: {
    paddingHorizontal: 40,
    paddingTop:        22,
  },

  /* Date group heading */
  dateGroup: {
    marginTop: 18,
    marginBottom: 8,
  },
  dateGroupRule: {
    height:          1,
    backgroundColor: BORDER,
    marginBottom:    8,
  },
  dateGroupLabel: {
    fontSize:      7,
    color:         GOLD_DIM,
    letterSpacing: 2.2,
    fontFamily:    'DMSans',
    fontWeight:    700,
  },

  /* ── Event row ── */
  eventRow: {
    flexDirection: 'row',
    marginBottom:  5,
  },
  eventAccent: {
    width:        3,
    borderRadius: 2,
    marginRight:  6,
    marginTop:    2,
    marginBottom: 2,
  },
  eventCard: {
    flex:            1,
    paddingHorizontal: 12,
    paddingVertical:   9,
    backgroundColor: CARD,
    borderWidth:     1,
    borderColor:     BORDER,
    borderRadius:    6,
  },
  eventCardDone: {
    backgroundColor: 'rgba(200,180,200,0.05)',
    opacity:         0.55,
  },

  /* Event card inner */
  eventTop: {
    flexDirection: 'row',
    alignItems:    'flex-start',
    gap:           10,
  },
  timeCol: {
    width:      38,
    alignItems: 'flex-end',
    paddingTop:  1,
  },
  timeText: {
    fontSize:   13,
    fontFamily: 'Cormorant',
    fontWeight: 700,
    lineHeight:  1,
    color:       PLUM_MID,
  },
  timeDash: {
    fontSize:   10,
    color:      'rgba(0,0,0,0.20)',
    fontFamily: 'DMSans',
    fontWeight: 400,
  },
  eventBody: {
    flex: 1,
  },
  eventTitle: {
    fontSize:     10,
    fontFamily:   'DMSans',
    fontWeight:   700,
    color:        '#1a1020',
    marginBottom:  3,
    lineHeight:    1.3,
  },
  eventTitleDone: {
    color: '#a09aaa',
  },
  metaRow: {
    flexDirection:  'row',
    alignItems:     'center',
    gap:            4,
    marginBottom:   1,
  },
  metaDot: {
    width:           4,
    height:          4,
    borderRadius:    2,
    backgroundColor: GOLD,
    opacity:         0.7,
    marginTop:       1,
  },
  metaText: {
    fontSize:   8,
    color:      MUTED,
    fontFamily: 'DMSans',
    fontWeight: 400,
    lineHeight:  1.4,
  },
  detailText: {
    fontSize:    8,
    color:       '#9e9a9d',
    fontStyle:   'italic',
    marginTop:   4,
    lineHeight:  1.4,
    fontFamily:  'Cormorant',
    fontWeight:  400,
  },

  /* Status badge */
  badge: {
    paddingHorizontal: 7,
    paddingVertical:   3,
    borderRadius:      20,
  },
  badgeText: {
    fontSize:  7,
    fontFamily: 'DMSans',
    fontWeight: 700,
  },

  /* ── Footer ── */
  footer: {
    position:        'absolute',
    bottom:          20,
    left:            40,
    right:           40,
    flexDirection:   'row',
    justifyContent:  'space-between',
    alignItems:      'center',
    borderTopWidth:  1,
    borderTopColor:  BORDER,
    paddingTop:      8,
  },
  footerText: {
    fontSize:   7,
    color:      'rgba(0,0,0,0.30)',
    fontFamily: 'DMSans',
    fontWeight: 400,
  },
  footerBrand: {
    fontSize:      7,
    color:         GOLD,
    fontFamily:    'DMSans',
    fontWeight:    700,
    letterSpacing: 1.2,
  },
  footerMonogram: {
    fontSize:   9,
    color:      PLUM_LIGHT,
    fontFamily: 'Cormorant',
    fontWeight: 700,
  },
});

/* ── Helpers ── */
function fmtDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString('fr-FR', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
    });
  } catch { return iso; }
}

function fmtTime(t?: string | null) {
  return t ? t.slice(0, 5) : null;
}

function getStatus(e: PDFEvent): { label: string; color: string; bg: string } {
  if (e.completed) return { label: 'Termine',   color: '#4a7157', bg: '#dce8df' };
  const today = new Date().toISOString().split('T')[0]!;
  if (e.eventDate < today) return { label: 'En retard', color: '#9d6246', bg: '#f1dfd0' };
  if (e.eventDate === today && e.eventTime) {
    const [h, m] = e.eventTime.split(':').map(Number);
    const t = new Date(); t.setHours(h!, m!, 0, 0);
    if (new Date() >= t) return { label: 'En cours',  color: '#8a6530', bg: '#f3e8d4' };
  }
  return { label: 'A venir', color: '#6b6672', bg: '#f0eef0' };
}

/* ── Document component ── */
function RunsheetDocument({ wedding, events }: { wedding: PDFWedding; events: PDFEvent[] }) {
  // Group events by date, sorted
  const byDate: Record<string, PDFEvent[]> = {};
  for (const e of events) {
    (byDate[e.eventDate] = byDate[e.eventDate] ?? []).push(e);
  }
  const dates = Object.keys(byDate).sort();

  const total = events.length;
  const done  = events.filter(e => e.completed).length;
  const pct   = total > 0 ? Math.round((done / total) * 100) : 0;
  const today = new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <Document
      title={`Deroulement Jour J — ${wedding.names}`}
      author="The Nuptial Plan"
      creator="The Nuptial Plan"
      producer="The Nuptial Plan"
    >
      <Page size="A4" style={s.page}>

        {/* ── Branded header ── */}
        <View style={s.header}>
          <Text style={s.headerEyebrow}>THE NUPTIAL PLAN  ·  JOUR J</Text>
          <Text style={s.headerTitle}>{wedding.names}</Text>
          {wedding.weddingDate && (
            <Text style={s.headerSub}>
              {fmtDate(wedding.weddingDate)}
              {wedding.venue ? `   ·   ${wedding.venue}` : ''}
            </Text>
          )}
          <View style={s.headerGoldBar} />
        </View>

        {/* ── Stats band ── */}
        <View style={s.statsBand}>
          <Text style={s.statsBandLabel}>
            DEROULEMENT DU PROGRAMME  ·  {done}/{total} ETAPES TERMINEES
          </Text>
          <Text style={s.statsBandPct}>{pct} %</Text>
        </View>

        {/* ── Body ── */}
        <View style={s.body}>
          {dates.length === 0 && (
            <View style={{ paddingVertical: 32, alignItems: 'center' }}>
              <Text style={{ fontSize: 10, color: MUTED, fontFamily: 'DMSans', fontWeight: 400 }}>
                Aucun evenement planifie
              </Text>
            </View>
          )}

          {dates.map((date) => (
            <View key={date}>
              {/* Date group header */}
              <View style={s.dateGroup}>
                <View style={s.dateGroupRule} />
                <Text style={s.dateGroupLabel}>
                  {fmtDate(date).toUpperCase()}
                </Text>
              </View>

              {/* Events for this date */}
              {(byDate[date] ?? []).map((ev) => {
                const accent   = ev.tone ? (TONE_HEX[ev.tone] ?? PLUM_MID) : PLUM_MID;
                const { label, color, bg } = getStatus(ev);
                const time     = fmtTime(ev.eventTime);
                const isDone   = ev.completed;

                return (
                  <View key={ev.id} style={s.eventRow} wrap={false}>
                    {/* Tone accent bar */}
                    <View style={[s.eventAccent, { backgroundColor: isDone ? 'rgba(0,0,0,0.10)' : accent }]} />

                    {/* Card */}
                    <View style={isDone ? [s.eventCard, s.eventCardDone] : s.eventCard}>
                      <View style={s.eventTop}>

                        {/* Time column */}
                        <View style={s.timeCol}>
                          {time
                            ? <Text style={[s.timeText, { color: isDone ? '#aaa' : accent }]}>{time}</Text>
                            : <Text style={s.timeDash}>-</Text>
                          }
                        </View>

                        {/* Content */}
                        <View style={s.eventBody}>
                          <Text style={isDone ? [s.eventTitle, s.eventTitleDone] : s.eventTitle}>
                            {ev.title}
                          </Text>

                          {ev.location ? (
                            <View style={s.metaRow}>
                              <View style={s.metaDot} />
                              <Text style={s.metaText}>Lieu : {ev.location}</Text>
                            </View>
                          ) : null}

                          {ev.actors ? (
                            <View style={s.metaRow}>
                              <View style={[s.metaDot, { backgroundColor: SAGE, opacity: 0.7 }]} />
                              <Text style={s.metaText}>Intervenants : {ev.actors}</Text>
                            </View>
                          ) : null}

                          {ev.detail ? (
                            <Text style={s.detailText}>{ev.detail}</Text>
                          ) : null}
                        </View>

                        {/* Status badge */}
                        <View style={[s.badge, { backgroundColor: bg }]}>
                          <Text style={[s.badgeText, { color }]}>{label}</Text>
                        </View>
                      </View>
                    </View>
                  </View>
                );
              })}
            </View>
          ))}
        </View>

        {/* ── Footer (fixed on every page) ── */}
        <View style={s.footer} fixed>
          <Text style={s.footerText}>Exporte le {today}</Text>
          <Text style={s.footerMonogram}>N</Text>
          <Text style={s.footerBrand}>THE NUPTIAL PLAN</Text>
          <Text
            style={s.footerText}
            render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`}
          />
        </View>

      </Page>
    </Document>
  );
}

/* ── Public export trigger ── */
export async function downloadRunsheetPDF(wedding: PDFWedding, events: PDFEvent[]) {
  const blob = await pdf(
    <RunsheetDocument wedding={wedding} events={events} />
  ).toBlob();

  const url = URL.createObjectURL(blob);
  const a   = document.createElement('a');
  a.href     = url;
  a.download = `deroulement-jour-j-${wedding.names.replace(/[^a-zA-Z0-9\s-]/g, '').replace(/\s+/g, '-').toLowerCase()}.pdf`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 15_000);
}
