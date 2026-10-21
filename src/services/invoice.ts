import * as Print from 'expo-print';
import { Platform } from 'react-native';

import { formatMoney, formatPurity, formatWeight, type Party, type Settings, type Transaction } from '@/domain';

import { shareFileUri } from './files';

const KIND_TITLE: Record<Transaction['kind'], string> = {
  sale: 'Tax Invoice',
  purchase: 'Purchase Voucher',
  exchange: 'Exchange Invoice',
  repair: 'Repair Invoice',
  order: 'Order Confirmation',
  payment: 'Payment Receipt',
};

function esc(s: string | null | undefined): string {
  return (s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
}

/** Self-contained HTML that prints well on A4 and Letter; also readable in any browser or mail client. */
export function renderInvoiceHtml(txn: Transaction, party: Party | null, settings: Settings): string {
  const { locale, currency } = settings;
  const m = (minor: number) => formatMoney({ amountMinor: minor, currency }, locale);
  const w = (mg: number) => formatWeight(mg, settings.weightUnit, locale);
  const d = (iso: string) => new Intl.DateTimeFormat(locale, { dateStyle: 'medium' }).format(new Date(iso));

  const taxTotal = txn.lines.reduce((s, l) => {
    const pre = l.amountMinor / (1 + l.taxPercent / 100);
    return s + (l.direction === 'out' ? 1 : -1) * (l.amountMinor - pre);
  }, 0);
  const paid = txn.payments.reduce((s, p) => s + (p.direction === 'in' ? p.amountMinor : -p.amountMinor), 0);
  const outstanding = txn.status === 'void' ? 0 : txn.totalMinor - paid;

  const lines = txn.lines
    .map(
      (l, i) => `
      <tr>
        <td>${i + 1}</td>
        <td>${esc(l.description)}${l.direction === 'in' ? ' <span class="tag">received</span>' : ''}</td>
        <td>${esc(formatPurity(l.metal, l.fineness))}</td>
        <td class="num">${w(l.grossWeightMg)}</td>
        <td class="num">${w(l.netWeightMg)}</td>
        <td class="num">${m(Math.round(l.ratePerGramFineMinor))}/g fine</td>
        <td class="num">${l.direction === 'in' ? '−' : ''}${m(l.amountMinor)}</td>
      </tr>`,
    )
    .join('');

  const payments = txn.payments
    .map(
      (p) =>
        `<tr><td>${d(p.paidAt)}</td><td>${esc(p.method.replace('_', ' '))}</td><td>${esc(p.reference)}</td><td class="num">${p.direction === 'out' ? '−' : ''}${m(p.amountMinor)}</td></tr>`,
    )
    .join('');

  return `<!doctype html>
<html lang="${esc(locale)}">
<head>
<meta charset="utf-8">
<title>${esc(KIND_TITLE[txn.kind])} ${esc(txn.number)}</title>
<style>
  body { font-family: -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; color: #1c1812; margin: 32px; font-size: 12px; }
  h1 { font-size: 20px; margin: 0; letter-spacing: .02em; }
  h2 { font-size: 13px; margin: 0 0 4px; text-transform: uppercase; letter-spacing: .08em; color: #6b6459; }
  .head { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #a67c00; padding-bottom: 12px; margin-bottom: 16px; }
  .muted { color: #6b6459; }
  .cols { display: flex; gap: 32px; margin-bottom: 16px; }
  .cols > div { flex: 1; }
  table { width: 100%; border-collapse: collapse; margin-top: 8px; }
  th, td { padding: 6px 8px; border-bottom: 1px solid #e6dfd0; text-align: left; vertical-align: top; }
  th { font-size: 11px; text-transform: uppercase; letter-spacing: .05em; color: #6b6459; }
  .num { text-align: right; white-space: nowrap; font-variant-numeric: tabular-nums; }
  .totals { margin-left: auto; width: 280px; margin-top: 12px; }
  .totals td { border: 0; padding: 3px 8px; }
  .totals .grand td { border-top: 2px solid #1c1812; font-weight: 700; font-size: 14px; }
  .tag { font-size: 10px; background: #f6ebc8; padding: 1px 6px; border-radius: 8px; }
  .void { color: #b3261e; font-weight: 700; }
  footer { margin-top: 32px; font-size: 10px; color: #9a9286; }
</style>
</head>
<body>
  <div class="head">
    <div>
      <h1>${esc(settings.shopName)}</h1>
      <div class="muted">${settings.addressLines.map(esc).join('<br>')}</div>
      ${settings.phone ? `<div class="muted">${esc(settings.phone)}</div>` : ''}
      ${settings.taxId ? `<div class="muted">${esc(settings.taxLabel)} No: ${esc(settings.taxId)}</div>` : ''}
    </div>
    <div style="text-align:right">
      <h2>${esc(KIND_TITLE[txn.kind])}</h2>
      <div><strong>${esc(txn.number)}</strong></div>
      <div class="muted">${d(txn.issuedAt)}</div>
      ${txn.dueAt ? `<div class="muted">Due ${d(txn.dueAt)}</div>` : ''}
      ${txn.status === 'void' ? '<div class="void">VOID</div>' : ''}
    </div>
  </div>
  <div class="cols">
    <div>
      <h2>${txn.kind === 'purchase' ? 'Supplier' : 'Customer'}</h2>
      ${party ? `<div><strong>${esc(party.name)}</strong></div>${party.phone ? `<div>${esc(party.phone)}</div>` : ''}${party.address ? `<div class="muted">${esc(party.address)}</div>` : ''}${party.taxId ? `<div class="muted">Tax ID: ${esc(party.taxId)}</div>` : ''}` : '<div class="muted">Walk-in</div>'}
    </div>
  </div>
  ${
    txn.lines.length
      ? `<table>
    <thead><tr><th>#</th><th>Description</th><th>Purity</th><th class="num">Gross</th><th class="num">Net</th><th class="num">Rate</th><th class="num">Amount</th></tr></thead>
    <tbody>${lines}</tbody>
  </table>`
      : ''
  }
  <table class="totals">
    <tr><td>Includes ${esc(settings.taxLabel)}</td><td class="num">${m(Math.round(taxTotal))}</td></tr>
    <tr class="grand"><td>Total</td><td class="num">${m(txn.totalMinor)}</td></tr>
    <tr><td>Paid</td><td class="num">${m(paid)}</td></tr>
    <tr><td>${outstanding >= 0 ? 'Balance due' : 'Refund due'}</td><td class="num">${m(Math.abs(outstanding))}</td></tr>
  </table>
  ${payments ? `<h2 style="margin-top:16px">Payments</h2><table><thead><tr><th>Date</th><th>Method</th><th>Reference</th><th class="num">Amount</th></tr></thead><tbody>${payments}</tbody></table>` : ''}
  ${txn.notes ? `<p class="muted">${esc(txn.notes)}</p>` : ''}
  <footer>Weights in ${esc(settings.weightUnit)}; purity as hallmark fineness. Rates are per gram of fine metal. Document ID ${esc(txn.id)}.</footer>
</body>
</html>`;
}

export async function shareInvoice(txn: Transaction, party: Party | null, settings: Settings): Promise<void> {
  const html = renderInvoiceHtml(txn, party, settings);
  if (Platform.OS === 'web') {
    await Print.printAsync({ html });
    return;
  }
  const { uri } = await Print.printToFileAsync({ html });
  await shareFileUri(uri, 'application/pdf', `${txn.number}.pdf`);
}
