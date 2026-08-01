/**
 * RunsheetPDF — Jardin Parisien branded PDF export
 * Uses @react-pdf/renderer (browser-side)
 * Fonts: Cormorant Garamond (headings/numbers) + DM Sans (body/labels)
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

/* ── Brand fonts ── */
const CDN = 'https://cdn.jsdelivr.net/npm';

Font.register({
  family: 'Cormorant Garamond',
  fonts: [
    { src: `${CDN}/@fontsource/cormorant-garamond/files/cormorant-garamond-latin-400-normal.woff2`, fontWeight: 400 },
    { src: `${CDN}/@fontsource/cormorant-garamond/files/cormorant-garamond-latin-600-normal.woff2`, fontWeight: 600 },
    { src: `${CDN}/@fontsource/cormorant-garamond/files/cormorant-garamond-latin-700-normal.woff2`, fontWeight: 700 },
    { src: `${CDN}/@fontsource/cormorant-garamond/files/cormorant-garamond-latin-400-italic.woff2`, fontWeight: 400, fontStyle: 'italic' },
  ],
});

Font.register({
  family: 'DM Sans',
  fonts: [
    { src: `${CDN}/@fontsource/dm-sans/files/dm-sans-latin-400-normal.woff2`, fontWeight: 400 },
    { src: `${CDN}/@fontsource/dm-sans/files/dm-sans-latin-500-normal.woff2`, fontWeight: 500 },
    { src: `${CDN}/@fontsource/dm-sans/files/dm-sans-latin-600-normal.woff2`, fontWeight: 600 },
    { src: `${CDN}/@fontsource/dm-sans/files/dm-sans-latin-700-normal.woff2`, fontWeight: 700 },
  ],
});

/* ── Palette ── */
const PLUM   = '#3C1A3C';
const PLUM2  = '#5D2D5D';
const GOLD   = '#C8A96E';
const GOLD_L = '#e8d5a8';
const SAGE   = '#6B8C72';
const GREY   = '#6b6672';
const LIGHT  = '#f7f3f7';

/* ── Tone accent colours ── */
const TONE_HEX: Record<string, string> = {
  plum: PLUM2, rose: '#CC8C94', sage: SAGE,
  gold: GOLD,  lavender: '#9B89C4', blue: '#6B8FC0',
};

/* ── Types (mirrored from app) ── */
export interface PDFEvent {
  id: number;
  title: string;
  eventDate: string;
  eventTime?: string | null;
  location?: string | null;
  actors?: string | null;
  detail?: string | null;
  tone?: string | null;
  completed: boolean;
}

export interface PDFWedding {
  names: string;
  weddingDate: string;
  venue?: string | null;
}

/* ── Styles ── */
const s = StyleSheet.create({
  page: {
    fontFamily: 'DM Sans',
    backgroundColor: '#ffffff',
    paddingBottom: 48,
  },

  // Header
  header: {
    backgroundColor: PLUM,
    paddingHorizontal: 36,
    paddingTop: 32,
    paddingBottom: 24,
  },
  headerEyebrow: {
    color: GOLD,
    fontSize: 7.5,
    letterSpacing: 2.5,
    marginBottom: 6,
    fontFamily: 'DM Sans',
    fontWeight: 600,
  },
  headerTitle: {
    color: '#ffffff',
    fontSize: 28,
    fontFamily: 'Cormorant Garamond',
    fontWeight: 700,
    marginBottom: 4,
    lineHeight: 1.1,
  },
  headerSub: {
    color: 'rgba(255,255,255,0.55)',
    fontSize: 9,
    letterSpacing: 0.5,
    marginTop: 2,
    fontFamily: 'DM Sans',
    fontWeight: 400,
  },
  goldBar: {
    height: 1.5,
    backgroundColor: GOLD,
    opacity: 0.45,
    marginTop: 16,
  },

  // Date band
  dateBand: {
    backgroundColor: LIGHT,
    paddingHorizontal: 36,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(200,180,200,0.30)',
  },
  dateBandText: {
    fontSize: 8,
    color: GREY,
    letterSpacing: 1.8,
    fontFamily: 'DM Sans',
    fontWeight: 700,
  },

  // Body
  body: {
    paddingHorizontal: 36,
    paddingTop: 20,
  },

  // Date group heading
  dateHeading: {
    fontSize: 7.5,
    color: '#a8893e',
    letterSpacing: 2,
    fontFamily: 'DM Sans',
    fontWeight: 700,
    marginBottom: 8,
    marginTop: 16,
  },

  // Event row
  eventRow: {
    flexDirection: 'row',
    marginBottom: 6,
    borderRadius: 6,
    overflow: 'hidden',
  },
  eventAccent: {
    width: 3,
    borderRadius: 2,
    backgroundColor: PLUM2,
  },
  eventContent: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#faf8fa',
    borderWidth: 1,
    borderColor: 'rgba(200,180,200,0.28)',
    borderRadius: 6,
    marginLeft: 4,
  },
  eventContentCompleted: {
    backgroundColor: 'rgba(200,180,200,0.06)',
    opacity: 0.60,
  },

  // Event row inner
  eventTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  eventTime: {
    width: 34,
    fontSize: 13,
    fontFamily: 'Cormorant Garamond',
    fontWeight: 700,
    color: PLUM2,
    paddingTop: 1,
    textAlign: 'right',
    lineHeight: 1,
  },
  eventTimeDash: {
    width: 34,
    fontSize: 10,
    color: 'rgba(0,0,0,0.20)',
    textAlign: 'right',
    fontFamily: 'DM Sans',
    fontWeight: 400,
  },
  eventMain: {
    flex: 1,
  },
  eventTitle: {
    fontSize: 10,
    fontFamily: 'DM Sans',
    fontWeight: 700,
    color: '#1a1020',
    marginBottom: 2,
    lineHeight: 1.3,
  },
  eventTitleCompleted: {
    color: '#9e9a9d',
    textDecoration: 'line-through',
  },
  eventMeta: {
    fontSize: 8,
    color: GREY,
    marginBottom: 1,
    lineHeight: 1.4,
    fontFamily: 'DM Sans',
    fontWeight: 400,
  },
  eventDetail: {
    fontSize: 8,
    color: '#9e9a9d',
    fontStyle: 'italic',
    marginTop: 3,
    lineHeight: 1.4,
    fontFamily: 'DM Sans',
    fontWeight: 400,
  },

  // Status badge
  statusBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 20,
    fontSize: 7,
    fontFamily: 'DM Sans',
    fontWeight: 700,
  },

  // Empty
  empty: {
    paddingVertical: 24,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 10,
    color: GREY,
    textAlign: 'center',
    fontFamily: 'DM Sans',
    fontWeight: 400,
  },

  // Footer
  footer: {
    position: 'absolute',
    bottom: 20,
    left: 36,
    right: 36,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: 'rgba(200,180,200,0.30)',
    paddingTop: 8,
  },
  footerText: {
    fontSize: 7,
    color: 'rgba(0,0,0,0.30)',
    fontFamily: 'DM Sans',
    fontWeight: 400,
  },
  footerBrand: {
    fontSize: 7,
    color: GOLD,
    fontFamily: 'DM Sans',
    fontWeight: 700,
    letterSpacing: 1,
  },

  // Stats bar
  statsBar: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 12,
    marginBottom: 4,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statText: {
    fontSize: 8,
    color: GREY,
    fontFamily: 'DM Sans',
    fontWeight: 400,
  },
});

/* ── Format helpers ── */
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

function statusLabel(e: PDFEvent): { label: string; color: string; bg: string } {
  if (e.completed)       return { label: 'Terminé',   color: '#4a7157', bg: '#dce8df' };
  const today = new Date().toISOString().split('T')[0]!;
  if (e.eventDate < today) return { label: 'En retard', color: '#9d6246', bg: '#f1dfd0' };
  if (e.eventDate === today && e.eventTime) {
    const [h, m] = e.eventTime.split(':').map(Number);
    const t = new Date(); t.setHours(h!, m!, 0, 0);
    if (new Date() >= t)  return { label: 'En cours',  color: '#8a6530', bg: '#f3e8d4' };
  }
  return { label: 'À venir', color: '#6b6672', bg: '#f0eef0' };
}

/* ── PDF Document ── */
function RunsheetDocument({ wedding, events }: { wedding: PDFWedding; events: PDFEvent[] }) {
  // Group by date
  const byDate: Record<string, PDFEvent[]> = {};
  for (const e of events) {
    (byDate[e.eventDate] = byDate[e.eventDate] || []).push(e);
  }
  const dates = Object.keys(byDate).sort();

  const total = events.length;
  const done  = events.filter(e => e.completed).length;
  const pct   = total > 0 ? Math.round((done / total) * 100) : 0;

  const today = new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <Document title={`Déroulé Jour J — ${wedding.names}`} author="The Nuptial Plan">
      <Page size="A4" style={s.page}>

        {/* ── Header ── */}
        <View style={s.header}>
          <Text style={s.headerEyebrow}>THE NUPTIAL PLAN · JOUR J</Text>
          <Text style={s.headerTitle}>{wedding.names}</Text>
          {wedding.weddingDate && (
            <Text style={s.headerSub}>
              {fmtDate(wedding.weddingDate)}
              {wedding.venue ? `  ·  ${wedding.venue}` : ''}
            </Text>
          )}
          <View style={s.goldBar} />
        </View>

        {/* ── Stats band ── */}
        <View style={s.dateBand}>
          <Text style={s.dateBandText}>
            DÉROULÉ DU PROGRAMME · {done}/{total} ÉTAPES TERMINÉES · {pct}%
          </Text>
        </View>

        {/* ── Body ── */}
        <View style={s.body}>
          {dates.length === 0 && (
            <View style={s.empty}>
              <Text style={s.emptyText}>Aucun événement planifié</Text>
            </View>
          )}

          {dates.map((date) => (
            <View key={date} wrap={false}>
              <Text style={s.dateHeading}>{fmtDate(date).toUpperCase()}</Text>

              {(byDate[date] ?? []).map((ev) => {
                const accent = ev.tone ? (TONE_HEX[ev.tone] ?? PLUM2) : PLUM2;
                const { label, color, bg } = statusLabel(ev);
                const time = fmtTime(ev.eventTime);

                return (
                  <View key={ev.id} style={s.eventRow}>
                    <View style={[s.eventAccent, { backgroundColor: accent }]} />
                    <View style={[s.eventContent, ev.completed && s.eventContentCompleted]}>
                      <View style={s.eventTopRow}>
                        {/* Time */}
                        {time
                          ? <Text style={[s.eventTime, { color: ev.completed ? '#aaa' : accent }]}>{time}</Text>
                          : <Text style={s.eventTimeDash}>—</Text>
                        }

                        {/* Main content */}
                        <View style={s.eventMain}>
                          <Text style={[s.eventTitle, ev.completed && s.eventTitleCompleted]}>
                            {ev.title}
                          </Text>
                          {ev.location && (
                            <Text style={s.eventMeta}>📍 {ev.location}</Text>
                          )}
                          {ev.actors && (
                            <Text style={s.eventMeta}>👥 {ev.actors}</Text>
                          )}
                          {ev.detail && (
                            <Text style={s.eventDetail}>{ev.detail}</Text>
                          )}
                        </View>

                        {/* Status badge */}
                        <View style={[s.statusBadge, { backgroundColor: bg }]}>
                          <Text style={{ color, fontSize: 7, fontFamily: 'DM Sans', fontWeight: 700 }}>
                            {label}
                          </Text>
                        </View>
                      </View>
                    </View>
                  </View>
                );
              })}
            </View>
          ))}
        </View>

        {/* ── Footer ── */}
        <View style={s.footer} fixed>
          <Text style={s.footerText}>Exporté le {today}</Text>
          <Text style={s.footerBrand}>THE NUPTIAL PLAN</Text>
          <Text style={s.footerText} render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} />
        </View>

      </Page>
    </Document>
  );
}

/* ── Export trigger ── */
export async function downloadRunsheetPDF(wedding: PDFWedding, events: PDFEvent[]) {
  const blob = await pdf(<RunsheetDocument wedding={wedding} events={events} />).toBlob();
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = `deroulement-jour-j-${wedding.names.replace(/\s+/g, '-').toLowerCase()}.pdf`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}
