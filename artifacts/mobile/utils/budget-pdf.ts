/**
 * Budget PDF export — Jardin Parisien branded
 * Uses expo-print (HTML → PDF) + expo-sharing (native share sheet)
 */
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';
import { Alert, Platform } from 'react-native';

// ── Brand palette ─────────────────────────────────────────────────────────────
const PLUM      = '#3C1A3C';
const PLUM2     = '#5D2D5D';
const GOLD      = '#C8A96E';
const GOLD_DIM  = '#A8893E';
const SAGE      = '#6B8C72';
const GREY      = '#6b6672';
const LIGHT     = '#f7f3f7';
const WHITE     = '#ffffff';
const DESTRUCTIVE = '#ef4444';
const WARNING   = '#967346';

/** Same vivid colours used in the donut chart */
const CHART_COLORS = [
  '#5D2D5D', '#C8A96E', '#CC8C94', '#6B8C72',
  '#9B89C4', '#6B8FC0', '#7A4A7A', '#A8893E',
  '#A0606A', '#4A6A4A',
];

// ── Types ─────────────────────────────────────────────────────────────────────
export interface BudgetPDFCategory {
  id: number;
  name: string;
  allocatedCents: number;
  spentCents: number;
}

export interface BudgetPDFData {
  weddingNames: string;
  weddingDate?: string | null;
  currency: string;
  totalAllocated: number;
  totalSpent: number;
  categories: BudgetPDFCategory[];
  locale?: string;
  language?: 'fr' | 'en';
}

// ── Formatters ────────────────────────────────────────────────────────────────
function fmtCents(cents: number, currency: string, locale: string): string {
  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(cents / 100);
  } catch {
    const sym = currency === 'EUR' ? '€' : currency === 'USD' ? '$' : currency;
    return `${Math.round(cents / 100).toLocaleString(locale)} ${sym}`;
  }
}

function fmtDate(iso: string, locale: string): string {
  try {
    return new Date(iso).toLocaleDateString(locale, {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
    });
  } catch { return iso; }
}

function today(locale: string): string {
  return new Date().toLocaleDateString(locale, {
    day: 'numeric', month: 'long', year: 'numeric',
  });
}

// ── SVG donut (inline, no dependencies) ──────────────────────────────────────
function polarToCartesian(cx: number, cy: number, r: number, deg: number) {
  const rad = ((deg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function arcPath(cx: number, cy: number, oR: number, iR: number, s: number, e: number): string {
  const o1 = polarToCartesian(cx, cy, oR, s);
  const o2 = polarToCartesian(cx, cy, oR, e);
  const i1 = polarToCartesian(cx, cy, iR, e);
  const i2 = polarToCartesian(cx, cy, iR, s);
  const large = e - s > 180 ? 1 : 0;
  return [
    `M ${o1.x.toFixed(2)} ${o1.y.toFixed(2)}`,
    `A ${oR} ${oR} 0 ${large} 1 ${o2.x.toFixed(2)} ${o2.y.toFixed(2)}`,
    `L ${i1.x.toFixed(2)} ${i1.y.toFixed(2)}`,
    `A ${iR} ${iR} 0 ${large} 0 ${i2.x.toFixed(2)} ${i2.y.toFixed(2)}`,
    'Z',
  ].join(' ');
}

function buildDonutSvg(categories: BudgetPDFCategory[], pct: number, language: 'fr' | 'en'): string {
  const total = categories.reduce((s, c) => s + c.allocatedCents, 0);
  if (total === 0) return '';

  const CX = 100; const CY = 100;
  const OR = 88; const IR = 54; const GAP = 2.5;

  let cursor = 0;
  const paths = categories.map((cat, i) => {
    const fraction = cat.allocatedCents / total;
    const sweep = fraction * 360;
    const s = cursor + GAP / 2;
    const e = cursor + sweep - GAP / 2;
    cursor += sweep;
    if (sweep <= GAP + 0.5) return '';
    const color = CHART_COLORS[i % CHART_COLORS.length]!;
    return `<path d="${arcPath(CX, CY, OR, IR, s, e)}" fill="${color}" />`;
  }).join('');

  return `
<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200">
  ${paths}
  <text x="${CX}" y="${CY - 4}" text-anchor="middle" font-size="20" font-weight="bold" fill="${PLUM}">${pct}%</text>
   <text x="${CX}" y="${CY + 16}" text-anchor="middle" font-size="9" fill="${GREY}">${language === 'fr' ? 'dépensé' : 'spent'}</text>
</svg>`;
}

// ── Legend HTML ───────────────────────────────────────────────────────────────
function buildLegend(categories: BudgetPDFCategory[]): string {
  return categories.map((cat, i) => {
    const color = CHART_COLORS[i % CHART_COLORS.length]!;
    return `<span style="display:inline-flex;align-items:center;gap:5px;margin:3px 6px;font-size:9px;color:${GREY}">
      <span style="display:inline-block;width:9px;height:9px;border-radius:50%;background:${color};flex-shrink:0"></span>
      ${cat.name}
    </span>`;
  }).join('');
}

// ── Category rows HTML ────────────────────────────────────────────────────────
function buildCategoryRows(categories: BudgetPDFCategory[], currency: string, locale: string, language: 'fr' | 'en'): string {
  return categories.map((cat, i) => {
    const color = CHART_COLORS[i % CHART_COLORS.length]!;
    const pct = cat.allocatedCents > 0
      ? Math.min(100, Math.round((cat.spentCents / cat.allocatedCents) * 100))
      : 0;
    const remaining = cat.allocatedCents - cat.spentCents;
    const isOver = cat.spentCents > cat.allocatedCents;
    const barColor = isOver ? DESTRUCTIVE : pct >= 80 ? WARNING : color;
    const initials = cat.name.slice(0, 2).toUpperCase();

    return `
<tr>
  <td style="padding:10px 14px;vertical-align:middle;">
    <div style="display:flex;align-items:center;gap:10px;">
      <div style="width:34px;height:34px;border-radius:50%;background:${color}22;display:flex;align-items:center;justify-content:center;flex-shrink:0;">
        <span style="font-size:11px;font-weight:bold;color:${color}">${initials}</span>
      </div>
      <div style="flex:1;min-width:0;">
        <div style="font-weight:600;font-size:11px;color:#1a091a;margin-bottom:4px;">${cat.name}</div>
        <div style="height:5px;border-radius:3px;background:#f0eaf0;overflow:hidden;">
          <div style="height:5px;border-radius:3px;background:${barColor};width:${pct}%"></div>
        </div>
      </div>
    </div>
  </td>
  <td style="padding:10px 14px;text-align:right;white-space:nowrap;vertical-align:middle;">
    <span style="font-size:13px;font-weight:bold;color:${PLUM}">${fmtCents(cat.allocatedCents, currency, locale)}</span>
    <div style="font-size:8px;color:${GREY};margin-top:1px;">${language === 'fr' ? 'alloué' : 'allocated'}</div>
  </td>
  <td style="padding:10px 14px;text-align:right;white-space:nowrap;vertical-align:middle;">
    <span style="font-size:13px;font-weight:600;color:${isOver ? DESTRUCTIVE : '#1a091a'}">${fmtCents(cat.spentCents, currency, locale)}</span>
    <div style="font-size:8px;color:${GREY};margin-top:1px;">${language === 'fr' ? 'dépensé' : 'spent'}</div>
  </td>
  <td style="padding:10px 14px;text-align:right;white-space:nowrap;vertical-align:middle;">
    <span style="font-size:13px;color:${isOver ? DESTRUCTIVE : SAGE};font-weight:600;">${isOver ? '−' : ''}${fmtCents(Math.abs(remaining), currency, locale)}</span>
    <div style="font-size:8px;color:${GREY};margin-top:1px;">${isOver ? (language === 'fr' ? 'dépassement' : 'over budget') : (language === 'fr' ? 'restant' : 'remaining')}</div>
  </td>
  <td style="padding:10px 14px;text-align:center;vertical-align:middle;">
    <span style="font-size:10px;font-weight:bold;color:${barColor}">${pct}%</span>
  </td>
</tr>`;
  }).join('');
}

// ── HTML template ─────────────────────────────────────────────────────────────
function buildHTML(data: BudgetPDFData): string {
  const { weddingNames, weddingDate, currency, totalAllocated, totalSpent, categories } = data;
  const remaining = totalAllocated - totalSpent;
  const isOver = totalSpent > totalAllocated;
  const pct = totalAllocated > 0 ? Math.min(100, Math.round((totalSpent / totalAllocated) * 100)) : 0;
  const barColor = isOver ? DESTRUCTIVE : pct >= 80 ? WARNING : PLUM2;

  const locale = data.locale ?? (data.language === 'fr' ? 'fr-FR' : 'en-US');
  const language = data.language ?? (locale.startsWith('fr') ? 'fr' : 'en');
  const donutSvg = buildDonutSvg(categories, pct, language);
  const legend = buildLegend(categories);
  const categoryRows = buildCategoryRows(categories, currency, locale, language);
  const dateStr = weddingDate ? fmtDate(weddingDate, locale) : '';

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,600;0,700;1,400&family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600;9..40,700&display=swap" rel="stylesheet">
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: 'Cormorant Garamond', Georgia, serif;
    background: #fff;
    color: #1a091a;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  @page { margin: 0; size: A4 portrait; }
</style>
</head>
<body>

<!-- ── HEADER ── -->
<div style="background:${PLUM};padding:32px 40px 28px;position:relative;overflow:hidden;">
  <!-- decorative blob -->
  <div style="position:absolute;top:-20px;right:-20px;width:100px;height:100px;border-radius:50%;background:${GOLD}22;pointer-events:none;"></div>
  <!-- gold top line -->
  <div style="position:absolute;top:0;left:0;right:0;height:1.5px;background:${GOLD};opacity:0.4;"></div>

  <div style="font-size:7.5px;letter-spacing:3px;text-transform:uppercase;color:${GOLD};margin-bottom:8px;font-family:'DM Sans',Arial,sans-serif;">
    THE NUPTIAL PLAN · BUDGET
  </div>
  <div style="font-size:28px;color:${WHITE};font-weight:bold;line-height:1.1;margin-bottom:4px;">
    ${weddingNames}
  </div>
  ${dateStr ? `<div style="font-size:10px;color:rgba(255,255,255,0.55);margin-top:4px;font-family:'DM Sans',Arial,sans-serif;">${dateStr}</div>` : ''}
  <div style="height:1.5px;background:${GOLD};opacity:0.35;margin-top:16px;"></div>
</div>

<!-- ── SUMMARY BAND ── -->
<div style="background:${LIGHT};padding:14px 40px;border-bottom:1px solid rgba(200,180,200,0.25);">
  <div style="display:flex;align-items:center;justify-content:space-between;gap:20px;">
    <div style="text-align:center;">
       <div style="font-size:20px;font-weight:bold;color:#1a091a;">${fmtCents(totalSpent, currency, locale)}</div>
       <div style="font-size:9px;color:${GREY};font-family:'DM Sans',Arial,sans-serif;margin-top:2px;letter-spacing:0.5px;">${language === 'fr' ? 'DÉPENSÉ' : 'SPENT'}</div>
    </div>
    <div style="flex:1;padding:0 16px;">
      <div style="height:10px;border-radius:5px;background:#e8e0e8;overflow:hidden;">
        <div style="height:10px;border-radius:5px;background:${barColor};width:${pct}%;"></div>
      </div>
      <div style="font-size:9px;color:${GREY};font-family:'DM Sans',Arial,sans-serif;text-align:center;margin-top:5px;">
        ${isOver
          ? `${language === 'fr' ? 'Dépassement de' : 'Over budget by'} ${fmtCents(Math.abs(remaining), currency, locale)}`
          : language === 'fr' ? `${fmtCents(remaining, currency, locale)} restant — ${pct}% utilisé` : `${fmtCents(remaining, currency, locale)} remaining — ${pct}% used`}
      </div>
    </div>
    <div style="text-align:center;">
       <div style="font-size:20px;font-weight:bold;color:${PLUM};">${fmtCents(totalAllocated, currency, locale)}</div>
       <div style="font-size:9px;color:${GREY};font-family:'DM Sans',Arial,sans-serif;margin-top:2px;letter-spacing:0.5px;">${language === 'fr' ? 'BUDGET TOTAL' : 'TOTAL BUDGET'}</div>
    </div>
  </div>
</div>

<!-- ── DONUT + LEGEND ── -->
${categories.length > 0 ? `
<div style="padding:24px 40px 16px;display:flex;align-items:center;gap:30px;">
  <div style="flex-shrink:0;">
    ${donutSvg}
  </div>
  <div style="flex:1;">
     <div style="font-size:7.5px;letter-spacing:2.5px;text-transform:uppercase;color:${GOLD_DIM};font-family:'DM Sans',Arial,sans-serif;margin-bottom:10px;">${language === 'fr' ? 'RÉPARTITION DU BUDGET' : 'BUDGET BREAKDOWN'}</div>
    <div style="display:flex;flex-wrap:wrap;">
      ${legend}
    </div>
  </div>
</div>
<div style="height:1px;background:rgba(200,180,200,0.25);margin:0 40px;"></div>
` : ''}

<!-- ── CATEGORY TABLE ── -->
${categories.length > 0 ? `
<div style="padding:20px 40px;">
   <div style="font-size:7.5px;letter-spacing:2.5px;text-transform:uppercase;color:${GOLD_DIM};font-family:'DM Sans',Arial,sans-serif;margin-bottom:12px;">${language === 'fr' ? 'PAR CATÉGORIE' : 'BY CATEGORY'}</div>
  <table style="width:100%;border-collapse:collapse;">
    <thead>
      <tr style="border-bottom:1px solid rgba(200,180,200,0.35);">
         <th style="padding:6px 14px;text-align:left;font-size:8px;letter-spacing:1.5px;color:${GREY};font-family:'DM Sans',Arial,sans-serif;font-weight:600;text-transform:uppercase;">${language === 'fr' ? 'Catégorie' : 'Category'}</th>
         <th style="padding:6px 14px;text-align:right;font-size:8px;letter-spacing:1.5px;color:${GREY};font-family:'DM Sans',Arial,sans-serif;font-weight:600;text-transform:uppercase;">${language === 'fr' ? 'Alloué' : 'Allocated'}</th>
         <th style="padding:6px 14px;text-align:right;font-size:8px;letter-spacing:1.5px;color:${GREY};font-family:'DM Sans',Arial,sans-serif;font-weight:600;text-transform:uppercase;">${language === 'fr' ? 'Dépensé' : 'Spent'}</th>
         <th style="padding:6px 14px;text-align:right;font-size:8px;letter-spacing:1.5px;color:${GREY};font-family:'DM Sans',Arial,sans-serif;font-weight:600;text-transform:uppercase;">${language === 'fr' ? 'Restant' : 'Remaining'}</th>
        <th style="padding:6px 14px;text-align:center;font-size:8px;letter-spacing:1.5px;color:${GREY};font-family:'DM Sans',Arial,sans-serif;font-weight:600;text-transform:uppercase;">%</th>
      </tr>
    </thead>
    <tbody>
      ${categoryRows}
    </tbody>
  </table>
</div>
` : ''}

<!-- ── FOOTER ── -->
<div style="padding:16px 40px;border-top:1px solid rgba(200,180,200,0.25);display:flex;justify-content:space-between;align-items:center;margin-top:auto;">
   <span style="font-size:8px;color:rgba(0,0,0,0.30);font-family:'DM Sans',Arial,sans-serif;">${language === 'fr' ? 'Exporté le' : 'Exported on'} ${today(locale)}</span>
  <span style="font-size:8px;color:${GOLD};font-family:'DM Sans',Arial,sans-serif;font-weight:bold;letter-spacing:1.5px;">THE NUPTIAL PLAN</span>
   <span style="font-size:8px;color:rgba(0,0,0,0.30);font-family:'DM Sans',Arial,sans-serif;">${categories.length} ${language === 'fr' ? `catégorie${categories.length !== 1 ? 's' : ''}` : `categor${categories.length === 1 ? 'y' : 'ies'}`}</span>
</div>

</body>
</html>`;
}

// ── Main export function ───────────────────────────────────────────────────────
export async function exportBudgetPDF(data: BudgetPDFData): Promise<void> {
  try {
    const html = buildHTML(data);

    if (Platform.OS === 'web') {
      // Web: open print dialog in a new window
      const win = window.open('', '_blank');
      if (win) {
        win.document.write(html);
        win.document.close();
        win.focus();
        win.print();
      }
      return;
    }

    // Native: generate PDF file, rename it, then share it
    const { uri: tempUri } = await Print.printToFileAsync({ html, base64: false });

    // Build a human-readable filename: budget-Sophie-James-2026-08-16.pdf
    const namesSlug = data.weddingNames
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')  // strip accents
      .replace(/[^a-zA-Z0-9\s-]/g, '')                   // keep alphanum + spaces + hyphens
      .trim().replace(/\s+/g, '-');
    const datePart = data.weddingDate
      ? data.weddingDate.slice(0, 10)   // YYYY-MM-DD
      : new Date().toISOString().slice(0, 10);
    const filename = `budget-${namesSlug}-${datePart}.pdf`;
    const destUri = `${FileSystem.cacheDirectory}${filename}`;

    await FileSystem.copyAsync({ from: tempUri, to: destUri });

    const canShare = await Sharing.isAvailableAsync();
    if (canShare) {
      await Sharing.shareAsync(destUri, {
        mimeType: 'application/pdf',
         dialogTitle: data.language === 'en' ? 'Share budget' : 'Partager le budget',
        UTI: 'com.adobe.pdf',
      });
    } else {
      // Fallback: print directly
      await Print.printAsync({ uri: destUri });
    }
  } catch (err: any) {
    console.error('[budget-pdf] export failed', err);
    Alert.alert(
       data.language === 'en' ? 'Export error' : 'Erreur d’export',
       data.language === 'en' ? 'Unable to generate the PDF. Please try again.' : 'Impossible de générer le PDF. Veuillez réessayer.',
    );
  }
}
