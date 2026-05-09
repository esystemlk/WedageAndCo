import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import { Invoice } from '../services/invoiceService';
import { Customer } from '../services/customerService';

// Extend jsPDF with autotable
declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: any) => jsPDF;
  }
}

export const generateInvoicePDF = (invoice: Invoice, customer: Customer | null) => {
  const doc = new jsPDF();
  const primaryColor = [10, 10, 10]; // Dark
  const accentColor = [79, 70, 229]; // indigo-600

  // Header Background
  doc.setFillColor(248, 250, 252);
  doc.rect(0, 0, 210, 40, 'F');

  // Logo / Brand
  doc.setTextColor(accentColor[0], accentColor[1], accentColor[2]);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(24);
  doc.text('WEDAGE & CO.', 20, 25);
  
  doc.setFontSize(10);
  doc.setTextColor(100, 116, 139);
  doc.setFont('helvetica', 'normal');
  doc.text('Logistics & Fleet Management', 20, 32);

  // Invoice Details Box
  doc.setFontSize(28);
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text('INVOICE', 140, 25);
  
  doc.setFontSize(10);
  doc.setTextColor(100, 116, 139);
  doc.text(`Ref: ${invoice.invoiceNo}`, 140, 32);

  // Billing Info
  doc.setFontSize(11);
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.setFont('helvetica', 'bold');
  doc.text('BILL TO:', 20, 55);
  
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(51, 65, 85);
  doc.text(customer?.name || 'Valued Customer', 20, 62);
  if (customer?.officialContact) {
    doc.text(customer.officialContact, 20, 68);
  }
  if (customer?.brNo) {
    doc.text(`BR No: ${customer.brNo}`, 20, 74);
  }

  // Invoice Meta
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text('INVOICE DATE:', 140, 55);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(51, 65, 85);
  doc.text(invoice.date, 140, 62);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text('DUE DATE:', 140, 70);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(51, 65, 85);
  doc.text(invoice.dueDate, 140, 77);

  // Line Items Table
  const tableRows = invoice.items.map((item, index) => [
    index + 1,
    item.description,
    item.quantity,
    `Rs. ${item.rate.toLocaleString()}`,
    `Rs. ${item.amount.toLocaleString()}`
  ]);

  doc.autoTable({
    startY: 90,
    head: [['#', 'Description', 'Qty', 'Rate', 'Total']],
    body: tableRows,
    headStyles: {
      fillColor: accentColor,
      textColor: [255, 255, 255],
      fontSize: 10,
      fontStyle: 'bold',
      halign: 'center'
    },
    columnStyles: {
      0: { halign: 'center', cellWidth: 10 },
      1: { halign: 'left' },
      2: { halign: 'center', cellWidth: 20 },
      3: { halign: 'right', cellWidth: 35 },
      4: { halign: 'right', cellWidth: 35 }
    },
    styles: {
      fontSize: 9,
      cellPadding: 6,
      lineColor: [226, 232, 240],
      lineWidth: 0.1
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252]
    }
  });

  // Totals
  const finalY = (doc as any).lastAutoTable.finalY + 10;
  
  doc.setFontSize(10);
  doc.setTextColor(100, 116, 139);
  doc.text('SUBTOTAL:', 140, finalY);
  doc.setTextColor(51, 65, 85);
  doc.text(`Rs. ${invoice.subtotal.toLocaleString()}`, 195, finalY, { align: 'right' });

  doc.setTextColor(100, 116, 139);
  doc.text(`TAX (${invoice.taxRate}%):`, 140, finalY + 7);
  doc.setTextColor(51, 65, 85);
  doc.text(`Rs. ${invoice.taxAmount.toLocaleString()}`, 195, finalY + 7, { align: 'right' });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(accentColor[0], accentColor[1], accentColor[2]);
  doc.text('TOTAL AMOUNT:', 140, finalY + 17);
  doc.text(`Rs. ${invoice.totalAmount.toLocaleString()}`, 195, finalY + 17, { align: 'right' });

  // Bank Details & Notes
  doc.setFontSize(10);
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text('PAYMENT DETAILS:', 20, finalY);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  const bankLines = doc.splitTextToSize(invoice.bankDetails || 'N/A', 80);
  doc.text(bankLines, 20, finalY + 5);

  if (invoice.notes) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.text('NOTES:', 20, finalY + 25);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    const noteLines = doc.splitTextToSize(invoice.notes, 80);
    doc.text(noteLines, 20, finalY + 30);
  }

  // Signature Space
  doc.setDrawColor(200, 200, 200);
  doc.line(140, finalY + 50, 195, finalY + 50);
  doc.setFontSize(8);
  doc.text('Authorized Signature', 167.5, finalY + 55, { align: 'center' });

  // Footer
  const pageCount = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text('Wedage & Co. Logistics - System Generated Document', 105, 285, { align: 'center' });
  }

  doc.save(`Invoice_${invoice.invoiceNo}.pdf`);
};
