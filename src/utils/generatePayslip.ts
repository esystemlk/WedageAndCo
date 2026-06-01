/**
 * generatePayslip.ts
 * Generates a professional payslip PDF for a staff member using jsPDF.
 */
import jsPDF from 'jspdf';
import { StaffMember } from '../services/staffService';

const INDIGO = [63, 81, 181] as const;
const DARK   = [15, 23, 42]  as const;
const SLATE  = [51, 65, 85]  as const;
const MUTED  = [100, 116, 139] as const;
const LIGHT  = [248, 250, 252] as const;
const WHITE  = [255, 255, 255] as const;
const EMERALD = [5, 150, 105] as const;
const AMBER   = [217, 119, 6] as const;
const RED     = [220, 38, 38] as const;
const BORDER  = [226, 232, 240] as const;

function rgb(c: readonly [number, number, number]) { return { r: c[0], g: c[1], b: c[2] }; }

const MONTHS = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December'
];

export interface PayslipData {
  staff: StaffMember;
  month: number;          // 1-12
  year: number;
  basicSalary: number;
  allowances?: { label: string; amount: number }[];
  deductions?: { label: string; amount: number }[];
  epfEmployee?: number;   // %  default 8
  etfEmployer?: number;   // %  default 3
  otHours?: number;
  otRate?: number;        // per hour
  advanceDeduction?: number;
  generatedBy?: string;
}

export function generatePayslip(data: PayslipData): void {
  const {
    staff, month, year, basicSalary,
    allowances = [],
    deductions  = [],
    epfEmployee = 8,
    etfEmployer = 3,
    otHours = 0,
    otRate  = 0,
    advanceDeduction = 0,
    generatedBy = 'Wedage & Co.',
  } = data;

  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const PW = 210, PH = 297;
  const ML = 15, MR = 15;
  const CW = PW - ML - MR; // content width = 180

  let y = 0;

  // ── Header bar ────────────────────────────────────────────────────────────
  doc.setFillColor(...INDIGO);
  doc.rect(0, 0, PW, 28, 'F');

  doc.setTextColor(...WHITE);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text('WEDAGE & CO. PVT LTD', ML, 11);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text('Fleet Management Division  |  0765711396  |  www.esystemlk.com', ML, 17);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('EMPLOYEE PAYSLIP', PW - MR, 11, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text(`${MONTHS[month - 1]} ${year}`, PW - MR, 17, { align: 'right' });

  // Indigo accent line below header
  doc.setFillColor(196, 202, 233);
  doc.rect(0, 28, PW, 1, 'F');

  y = 35;

  // ── Employee Info card ───────────────────────────────────────────────────
  doc.setFillColor(...LIGHT);
  doc.roundedRect(ML, y, CW, 28, 3, 3, 'F');
  doc.setDrawColor(...BORDER);
  doc.setLineWidth(0.3);
  doc.roundedRect(ML, y, CW, 28, 3, 3, 'S');

  // Left: name + details
  doc.setTextColor(...DARK);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text(staff.fullName, ML + 6, y + 9);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...MUTED);
  const leftDetails = [
    staff.staffId   ? `ID: ${staff.staffId}` : null,
    staff.position  ? staff.position : staff.category,
    staff.department ? `Dept: ${staff.department}` : null,
  ].filter(Boolean).join('  ·  ');
  doc.text(leftDetails, ML + 6, y + 15);

  const rightDetails = [
    staff.epfNo ? `EPF: ${staff.epfNo}` : null,
    staff.etfNo ? `ETF: ${staff.etfNo}` : null,
    staff.joinDate ? `Joined: ${staff.joinDate}` : null,
  ].filter(Boolean);
  doc.setFontSize(8);
  rightDetails.forEach((d, i) => doc.text(d!, PW - MR - 6, y + 9 + i * 6, { align: 'right' }));

  // Period badge
  doc.setFillColor(...INDIGO);
  doc.roundedRect(PW - MR - 50, y + 18, 44, 7, 2, 2, 'F');
  doc.setTextColor(...WHITE);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.text(`Pay Period: ${MONTHS[month - 1]} ${year}`, PW - MR - 28, y + 23.2, { align: 'center' });

  y += 34;

  // ── Earnings + Deductions side-by-side ───────────────────────────────────
  const colW = (CW - 5) / 2;

  function sectionHeader(label: string, x: number, width: number, col: readonly [number, number, number]) {
    doc.setFillColor(...col);
    doc.roundedRect(x, y, width, 8, 2, 2, 'F');
    doc.setTextColor(...WHITE);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.text(label, x + width / 2, y + 5.5, { align: 'center' });
  }

  function lineRow(label: string, amount: number, x: number, width: number, even: boolean, color?: readonly [number, number, number]) {
    if (even) { doc.setFillColor(...LIGHT); doc.rect(x, y, width, 8, 'F'); }
    doc.setTextColor(color ? color[0] : SLATE[0], color ? color[1] : SLATE[1], color ? color[2] : SLATE[2]);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.text(label, x + 5, y + 5.5);
    doc.setFont('helvetica', 'bold');
    doc.text(`Rs. ${amount.toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      x + width - 5, y + 5.5, { align: 'right' });
    y += 8;
  }

  function totalRow(label: string, amount: number, x: number, width: number, col: readonly [number, number, number]) {
    doc.setFillColor(...col);
    doc.roundedRect(x, y, width, 10, 2, 2, 'F');
    doc.setTextColor(...WHITE);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text(label, x + 5, y + 6.5);
    doc.text(`Rs. ${amount.toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      x + width - 5, y + 6.5, { align: 'right' });
    y += 10;
  }

  // ─ Earnings column ───────────────────────────────────────────────────────
  const ex = ML;
  const earningsY = y;

  sectionHeader('EARNINGS', ex, colW, EMERALD);
  y += 8;

  const otAmount = otHours > 0 ? otHours * otRate : 0;

  const earningItems: { label: string; amount: number }[] = [
    { label: 'Basic Salary',       amount: basicSalary },
    ...(otAmount > 0 ? [{ label: `Overtime (${otHours} hrs × Rs.${otRate})`, amount: otAmount }] : []),
    ...allowances,
  ];

  let grossEarnings = 0;
  earningItems.forEach((item, i) => {
    lineRow(item.label, item.amount, ex, colW, i % 2 === 0);
    grossEarnings += item.amount;
  });

  const epfEmployeeAmt = Math.round((basicSalary * epfEmployee) / 100);

  y += 2;
  totalRow('Gross Earnings', grossEarnings, ex, colW, EMERALD);

  // ─ Deductions column ─────────────────────────────────────────────────────
  const dx = ML + colW + 5;
  const savedY = y;
  y = earningsY;

  sectionHeader('DEDUCTIONS', dx, colW, RED);
  y += 8;

  const deductionItems: { label: string; amount: number }[] = [
    { label: `EPF Employee (${epfEmployee}%)`, amount: epfEmployeeAmt },
    ...(advanceDeduction > 0 ? [{ label: 'Advance Recovery', amount: advanceDeduction }] : []),
    ...deductions,
  ];

  let totalDeductions = 0;
  deductionItems.forEach((item, i) => {
    lineRow(item.label, item.amount, dx, colW, i % 2 === 0, RED);
    totalDeductions += item.amount;
  });

  // Pad deductions section to same height as earnings
  const earningsRows = earningItems.length;
  const deductionRows = deductionItems.length;
  if (deductionRows < earningsRows) {
    y += (earningsRows - deductionRows) * 8;
  }

  y += 2;
  totalRow('Total Deductions', totalDeductions, dx, colW, RED);

  // Sync y to max of both columns
  y = Math.max(y, savedY);
  y += 6;

  // ── Net Pay banner ────────────────────────────────────────────────────────
  const netPay = grossEarnings - totalDeductions;
  doc.setFillColor(...DARK);
  doc.roundedRect(ML, y, CW, 16, 3, 3, 'F');
  doc.setTextColor(...WHITE);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('NET PAY', ML + 8, y + 10);
  doc.setFontSize(14);
  doc.text(
    `Rs. ${netPay.toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
    PW - MR - 8, y + 10, { align: 'right' }
  );
  y += 22;

  // ── Employer EPF / ETF info box ────────────────────────────────────────────
  const epfEmployerAmt = Math.round((basicSalary * 12) / 100); // 12%
  const etfAmt         = Math.round((basicSalary * etfEmployer) / 100);

  doc.setFillColor(238, 240, 251);
  doc.roundedRect(ML, y, CW, 16, 3, 3, 'F');
  doc.setDrawColor(...INDIGO);
  doc.setLineWidth(0.5);
  doc.line(ML, y, ML + CW, y);

  doc.setTextColor(...INDIGO);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.text('EMPLOYER CONTRIBUTIONS (for reference only — not deducted from employee)', ML + 5, y + 5);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...SLATE);
  doc.setFontSize(8);
  doc.text(
    `EPF Employer (12%): Rs. ${epfEmployerAmt.toLocaleString()}   ·   ETF Employer (${etfEmployer}%): Rs. ${etfAmt.toLocaleString()}   ·   Total EPF Fund: Rs. ${(epfEmployeeAmt + epfEmployerAmt).toLocaleString()}`,
    ML + 5, y + 12
  );
  y += 22;

  // ── Signature row ─────────────────────────────────────────────────────────
  doc.setDrawColor(...BORDER);
  doc.setLineWidth(0.4);
  doc.line(ML, y, ML + 55, y);
  doc.line(PW - MR - 55, y, PW - MR, y);

  doc.setTextColor(...MUTED);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.text("Employee Signature", ML, y + 5);
  doc.text("Authorized Signature", PW - MR, y + 5, { align: 'right' });
  y += 14;

  // ── Footer ────────────────────────────────────────────────────────────────
  doc.setFillColor(...DARK);
  doc.rect(0, PH - 14, PW, 14, 'F');
  doc.setFillColor(...INDIGO);
  doc.rect(0, PH - 14, PW, 1, 'F');

  doc.setTextColor(148, 163, 184);
  doc.setFontSize(6.5);
  doc.setFont('helvetica', 'normal');
  doc.text(
    `Generated on ${new Date().toLocaleDateString()}  ·  ${generatedBy}  ·  This is a computer-generated payslip.`,
    PW / 2, PH - 5.5, { align: 'center' }
  );

  // Save
  const fileName = `Payslip_${staff.staffId || staff.fullName.replace(/\s+/g, '_')}_${MONTHS[month - 1]}_${year}.pdf`;
  doc.save(fileName);
}
