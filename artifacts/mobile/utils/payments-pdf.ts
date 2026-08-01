/**
 * Payments PDF export — Jardin Parisien branded
 * Uses expo-print (HTML → PDF) + expo-sharing (native share sheet)
 */
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
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
const WARNING_C = '#967346';
const SUCCESS_C = '#4a7157';
const SUCCESS_BG = '#dce8df';
const WARNING_BG = '#f3e8d4';
const ERROR_BG   = '#f8dede';

// ── Types ─────────────────────────────────────────────────────────────────────
export interface PDFPayment {
  id: number;
  vendorName: string;
  amountCents: number;
  dueDate: string;
  status: string;
  description?: string | null;
}

export interface PaymentsPDFData {
  weddingNames: string;
  weddingDate?: string | null;
  currency: string;
  payments: PDFPayment[];
}

// ── Formatters ────────────────────────────────────────────────────────────────
function fmtCents(cents: number, currency: string): string {
  try {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(cents / 100);
  } catch {
    const sym = currency === 'EUR' ? '€' : currency === 'USD' ? '$' : currency;
    return `${Math.round(cents / 100).toLocaleString('fr-FR')} ${sym}`;
  }
}

function fmtDate(iso: string): string {
  try {
    return new Date(iso + 'T00:00:00').toLocaleDateString('fr-FR', {
      day: 'numeric', month: 'long', year: 'numeric',
    });
  } catch { return iso; }
}

function fmtDateShort(iso: string): string {
  try {
    return new Date(iso + 'T00:00:00').toLocaleDateString('fr-FR', {
      day: 'numeric', month: 'short', year: 'numeric',
    });
  } catch { return iso; }
}

function today(): string {
  return new Date().toLocaleDateString('fr-FR', {
    day: 'numeric', month: 'long', year: 'numeric',
  });
}

// ── Status helpers ────────────────────────────────────────────────────────────
function statusInfo(status: string): { label: string; color: string; bg: string; dot: string } {
  switch (status) {
    case 'paid':
      return { label: 'Réglé', color: SUCCESS_C, bg: SUCCESS_BG, dot: SAGE };
    case 'overdue':
      return { label: 'En retard', color: '#9d3a3a', bg: ERROR_BG, dot: DESTRUCTIVE };
    case 'scheduled':
      return { label: 'Programmé', color: GREY, bg: '#f0eef0', dot: '#9B89C4' };
    default: // pending
      return { label: 'À régler', color: WARNING_C, bg: WARNING_BG, dot: GOLD };
  }
}

function statusSortOrder(status: string): number {
  switch (status) {
    case 'overdue':   return 0;
    case 'pending':   return 1;
    case 'scheduled': return 2;
    case 'paid':      return 3;
    default:          return 4;
  }
}

// ── Payment rows HTML ─────────────────────────────────────────────────────────
function buildPaymentRows(payments: PDFPayment[], currency: string): string {
  const sorted = [...payments].sort((a, b) => {
    const sA = statusSortOrder(a.status);
    const sB = statusSortOrder(b.status);
    if (sA !== sB) return sA - sB;
    return a.dueDate.localeCompare(b.dueDate);
  });

  return sorted.map((p) => {
    const { label, color, bg, dot } = statusInfo(p.status);
    const rowBg = p.status === 'overdue' ? '#fff8f8' : '#fff';
    const initials = p.vendorName.slice(0, 2).toUpperCase();

    return `
<tr style="border-bottom:1px solid rgba(200,180,200,0.20);">
  <td style="padding:10px 14px;vertical-align:middle;">
    <div style="display:flex;align-items:center;gap:10px;">
      <div style="width:34px;height:34px;border-radius:50%;background:${dot}22;display:flex;align-items:center;justify-content:center;flex-shrink:0;">
        <span style="font-size:11px;font-weight:bold;color:${dot}">${initials}</span>
      </div>
      <div>
        <div style="font-weight:600;font-size:11px;color:#1a091a;">${p.vendorName}</div>
        ${p.description ? `<div style="font-size:8px;color:${GREY};margin-top:1px;">${p.description}</div>` : ''}
      </div>
    </div>
  </td>
  <td style="padding:10px 14px;text-align:right;white-space:nowrap;vertical-align:middle;">
    <span style="font-size:13px;font-weight:bold;color:${PLUM2};">${fmtCents(p.amountCents, currency)}</span>
  </td>
  <td style="padding:10px 14px;text-align:center;white-space:nowrap;vertical-align:middle;">
    <span style="font-size:10px;color:${GREY};">${fmtDateShort(p.dueDate)}</span>
  </td>
  <td style="padding:10px 14px;text-align:center;vertical-align:middle;">
    <span style="display:inline-block;padding:3px 8px;border-radius:20px;background:${bg};font-size:8px;font-weight:bold;color:${color};">${label}</span>
  </td>
</tr>`;
  }).join('');
}

// ── HTML template ─────────────────────────────────────────────────────────────
function buildHTML(data: PaymentsPDFData): string {
  const { weddingNames, weddingDate, currency, payments } = data;

  const totalCents   = payments.reduce((s, p) => s + p.amountCents, 0);
  const paidCents    = payments.filter(p => p.status === 'paid').reduce((s, p) => s + p.amountCents, 0);
  const pendingCents = payments.filter(p => p.status !== 'paid').reduce((s, p) => s + p.amountCents, 0);
  const overdueCnt   = payments.filter(p => p.status === 'overdue').length;

  const paidPct    = totalCents > 0 ? Math.round((paidCents / totalCents) * 100) : 0;
  const dateStr    = weddingDate ? fmtDate(weddingDate) : '';
  const paymentRows = buildPaymentRows(payments, currency);

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
  <div style="position:absolute;top:-20px;right:-20px;width:100px;height:100px;border-radius:50%;background:${GOLD}22;pointer-events:none;"></div>
  <div style="position:absolute;top:0;left:0;right:0;height:1.5px;background:${GOLD};opacity:0.4;"></div>
  <div style="font-size:7.5px;letter-spacing:3px;text-transform:uppercase;color:${GOLD};margin-bottom:8px;font-family:'DM Sans',Arial,sans-serif;">
    THE NUPTIAL PLAN · PAIEMENTS
  </div>
  <div style="font-size:28px;color:${WHITE};font-weight:bold;line-height:1.1;margin-bottom:4px;">
    ${weddingNames}
  </div>
  ${dateStr ? `<div style="font-size:10px;color:rgba(255,255,255,0.55);margin-top:4px;font-family:'DM Sans',Arial,sans-serif;">${dateStr}</div>` : ''}
  <div style="height:1.5px;background:${GOLD};opacity:0.35;margin-top:16px;"></div>
</div>

<!-- ── SUMMARY BAND ── -->
<div style="background:${LIGHT};padding:16px 40px;border-bottom:1px solid rgba(200,180,200,0.25);">
  <div style="display:flex;align-items:stretch;justify-content:space-between;gap:16px;">
    <div style="text-align:center;flex:1;">
      <div style="font-size:18px;font-weight:bold;color:#1a091a;">${fmtCents(totalCents, currency)}</div>
      <div style="font-size:8px;color:${GREY};font-family:'DM Sans',Arial,sans-serif;margin-top:2px;letter-spacing:0.5px;">TOTAL</div>
    </div>
    <div style="width:1px;background:rgba(200,180,200,0.35);"></div>
    <div style="text-align:center;flex:1;">
      <div style="font-size:18px;font-weight:bold;color:${SUCCESS_C};">${fmtCents(paidCents, currency)}</div>
      <div style="font-size:8px;color:${GREY};font-family:'DM Sans',Arial,sans-serif;margin-top:2px;letter-spacing:0.5px;">RÉGLÉ · ${paidPct}%</div>
    </div>
    <div style="width:1px;background:rgba(200,180,200,0.35);"></div>
    <div style="text-align:center;flex:1;">
      <div style="font-size:18px;font-weight:bold;color:${overdueCnt > 0 ? DESTRUCTIVE : WARNING_C};">${fmtCents(pendingCents, currency)}</div>
      <div style="font-size:8px;color:${GREY};font-family:'DM Sans',Arial,sans-serif;margin-top:2px;letter-spacing:0.5px;">RESTANT${overdueCnt > 0 ? ` · ${overdueCnt} EN RETARD` : ''}</div>
    </div>
  </div>
  <!-- progress bar -->
  <div style="margin-top:14px;height:8px;border-radius:4px;background:#e8e0e8;overflow:hidden;">
    <div style="height:8px;border-radius:4px;background:${SAGE};width:${paidPct}%;"></div>
  </div>
</div>

<!-- ── PAYMENTS TABLE ── -->
${payments.length > 0 ? `
<div style="padding:20px 40px;">
  <div style="font-size:7.5px;letter-spacing:2.5px;text-transform:uppercase;color:${GOLD_DIM};font-family:'DM Sans',Arial,sans-serif;margin-bottom:12px;">
    DÉTAIL DES PAIEMENTS · ${payments.length} paiement${payments.length !== 1 ? 's' : ''}
  </div>
  <table style="width:100%;border-collapse:collapse;">
    <thead>
      <tr style="border-bottom:1.5px solid rgba(200,180,200,0.50);">
        <th style="padding:6px 14px;text-align:left;font-size:8px;letter-spacing:1.5px;color:${GREY};font-family:'DM Sans',Arial,sans-serif;font-weight:600;text-transform:uppercase;">Prestataire</th>
        <th style="padding:6px 14px;text-align:right;font-size:8px;letter-spacing:1.5px;color:${GREY};font-family:'DM Sans',Arial,sans-serif;font-weight:600;text-transform:uppercase;">Montant</th>
        <th style="padding:6px 14px;text-align:center;font-size:8px;letter-spacing:1.5px;color:${GREY};font-family:'DM Sans',Arial,sans-serif;font-weight:600;text-transform:uppercase;">Échéance</th>
        <th style="padding:6px 14px;text-align:center;font-size:8px;letter-spacing:1.5px;color:${GREY};font-family:'DM Sans',Arial,sans-serif;font-weight:600;text-transform:uppercase;">Statut</th>
      </tr>
    </thead>
    <tbody>
      ${paymentRows}
    </tbody>
  </table>
</div>
` : `
<div style="padding:40px;text-align:center;">
  <div style="font-size:11px;color:${GREY};font-family:'DM Sans',Arial,sans-serif;">Aucun paiement enregistré</div>
</div>
`}

<!-- ── FOOTER ── -->
<div style="padding:16px 40px;border-top:1px solid rgba(200,180,200,0.25);display:flex;justify-content:space-between;align-items:center;">
  <span style="font-size:8px;color:rgba(0,0,0,0.30);font-family:'DM Sans',Arial,sans-serif;">Exporté le ${today()}</span>
  <span style="font-size:8px;color:${GOLD};font-family:'DM Sans',Arial,sans-serif;font-weight:bold;letter-spacing:1.5px;">THE NUPTIAL PLAN</span>
  <span style="font-size:8px;color:rgba(0,0,0,0.30);font-family:'DM Sans',Arial,sans-serif;">${payments.length} paiement${payments.length !== 1 ? 's' : ''}</span>
</div>

</body>
</html>`;
}

// ── Main export function ───────────────────────────────────────────────────────
export async function exportPaymentsPDF(data: PaymentsPDFData): Promise<void> {
  try {
    const html = buildHTML(data);

    if (Platform.OS === 'web') {
      const win = window.open('', '_blank');
      if (win) {
        win.document.write(html);
        win.document.close();
        win.focus();
        win.print();
      }
      return;
    }

    const { uri } = await Print.printToFileAsync({ html, base64: false });
    const canShare = await Sharing.isAvailableAsync();

    if (canShare) {
      await Sharing.shareAsync(uri, {
        mimeType: 'application/pdf',
        dialogTitle: 'Partager les paiements',
        UTI: 'com.adobe.pdf',
      });
    } else {
      await Print.printAsync({ uri });
    }
  } catch (err: any) {
    console.error('[payments-pdf] export failed', err);
    Alert.alert(
      "Erreur d'export",
      'Impossible de générer le PDF. Veuillez réessayer.',
    );
  }
}
