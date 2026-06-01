/**
 * mealExports.ts — CSV / PDF / Print helpers for the Meal Management module.
 */
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const MONTHS = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
];

function downloadBlob(content: string, filename: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/** Export an array of header + rows to CSV. */
export function exportCSV(filename: string, headers: string[], rows: (string | number)[][]) {
  const esc = (v: string | number) => {
    const s = String(v ?? '');
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const csv = [headers, ...rows].map(r => r.map(esc).join(',')).join('\n');
  downloadBlob('﻿' + csv, filename.endsWith('.csv') ? filename : `${filename}.csv`, 'text/csv;charset=utf-8;');
}

/** Export a titled table to PDF. */
export function exportPDF(opts: {
  title: string;
  subtitle?: string;
  headers: string[];
  rows: (string | number)[][];
  filename: string;
  footerTotals?: (string | number)[];
}) {
  const { title, subtitle, headers, rows, filename, footerTotals } = opts;
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const PW = 210, ML = 14;

  // Header band
  doc.setFillColor(63, 81, 181);
  doc.rect(0, 0, PW, 24, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text('WEDAGE & COMPANY (PVT) LTD', ML, 10);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(title, ML, 17);
  if (subtitle) {
    doc.setFontSize(8);
    doc.text(subtitle, PW - ML, 17, { align: 'right' });
  }

  autoTable(doc, {
    startY: 30,
    head: [headers],
    body: rows.map(r => r.map(c => String(c))),
    foot: footerTotals ? [footerTotals.map(c => String(c))] : undefined,
    theme: 'striped',
    headStyles: { fillColor: [30, 41, 59], textColor: 255, fontStyle: 'bold', fontSize: 8 },
    footStyles: { fillColor: [238, 240, 251], textColor: [30, 41, 59], fontStyle: 'bold', fontSize: 8 },
    bodyStyles: { fontSize: 8, textColor: [51, 65, 85] },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    margin: { left: ML, right: ML },
  });

  doc.setFontSize(7);
  doc.setTextColor(148, 163, 184);
  doc.text(
    `Generated ${new Date().toLocaleString()}  ·  Computer-generated report  ·  ESYSTEMLK`,
    PW / 2, 290, { align: 'center' },
  );

  doc.save(filename.endsWith('.pdf') ? filename : `${filename}.pdf`);
}

/** Open a print-friendly window for a titled table. */
export function printTable(title: string, subtitle: string, headers: string[], rows: (string | number)[][]) {
  const w = window.open('', '_blank');
  if (!w) return;
  const th = headers.map(h => `<th>${h}</th>`).join('');
  const tr = rows.map(r => `<tr>${r.map(c => `<td>${c}</td>`).join('')}</tr>`).join('');
  w.document.write(`
    <html><head><title>${title}</title>
    <style>
      body{font-family:system-ui,sans-serif;padding:32px;color:#0f172a}
      h1{font-size:20px;margin:0}
      p{color:#64748b;font-size:12px;margin:4px 0 20px}
      table{width:100%;border-collapse:collapse;font-size:12px}
      th{background:#1e293b;color:#fff;text-align:left;padding:8px 10px}
      td{padding:7px 10px;border-bottom:1px solid #e2e8f0}
      tr:nth-child(even) td{background:#f8fafc}
    </style></head>
    <body>
      <h1>${title}</h1><p>${subtitle}</p>
      <table><thead><tr>${th}</tr></thead><tbody>${tr}</tbody></table>
      <script>window.onload=()=>{window.print()}</script>
    </body></html>`);
  w.document.close();
}

export const monthName = (m: number) => MONTHS[m - 1] || '';
