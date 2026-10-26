import type { jsPDF } from 'jspdf'
import type { MealStatus } from '../constants'
import { formatRM } from '../money'
import type { MonthReport, VendorReport } from '../report'

type RGB = [number, number, number]

const GREEN: RGB = [22, 163, 74]
const MUTED: RGB = [107, 114, 128]
const STATUS_FILL: Record<MealStatus, RGB> = {
  delivered: [220, 252, 231],
  vendor_cancelled: [254, 226, 226],
  user_cancelled: [254, 243, 199],
  no_service: [243, 244, 246],
  scheduled: [255, 255, 255],
}

const MARGIN = 40

// Standard PDF fonts only cover Latin-1; Intl may emit narrow/no-break spaces.
const rm = (n: number) => formatRM(n).replace(/[\u202f\u00a0]/g, ' ')

type AutoTable = (typeof import('jspdf-autotable'))['default']

function lastY(doc: jsPDF): number {
  return (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? MARGIN
}

function heading(doc: jsPDF, text: string, y: number, size = 16): number {
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(size)
  doc.setTextColor(17, 24, 39)
  doc.text(text, MARGIN, y)
  return y + size + 4
}

function muted(doc: jsPDF, text: string, y: number): number {
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(...MUTED)
  const lines = doc.splitTextToSize(text, doc.internal.pageSize.getWidth() - MARGIN * 2) as string[]
  doc.text(lines, MARGIN, y)
  return y + lines.length * 11 + 4
}

function summaryPage(doc: jsPDF, autoTable: AutoTable, report: VendorReport) {
  let y = heading(doc, `MealTrack report: ${report.vendorName}`, MARGIN + 10, 18)
  y = muted(doc, `Generated ${report.generatedAt} (Malaysia time)`, y)
  y = muted(doc, report.terms.map((t) => `${t.label}: ${t.value}`).join('   |   '), y)
  y = muted(doc, 'Credit applied = lower of opening credit and fee. Amount due = fee - credit applied. Closing credit = opening - applied + earned + overpayment, and carries into the next month.', y + 2)

  const t = report.totals
  autoTable(doc, {
    startY: y + 6,
    head: [['Month', 'Fee', 'Opening', 'Applied', 'Due', 'Paid', 'Outstanding', 'Earned', 'Closing']],
    body: report.months.map((m) => {
      const s = m.statement
      return [`${m.title}${m.status === 'open' ? ' *' : ''}`, rm(s.base_fee), rm(s.opening_credit), rm(s.credit_applied), rm(s.amount_due), rm(s.paid), rm(s.outstanding), rm(s.earned_credit), rm(s.closing_credit)]
    }),
    foot: [['Total', rm(t.fees), '', rm(t.creditApplied), rm(t.amountDue), rm(t.paid), rm(t.outstanding), rm(t.earned), '']],
    theme: 'grid',
    styles: { fontSize: 8, cellPadding: 4 },
    headStyles: { fillColor: GREEN },
    footStyles: { fillColor: [243, 244, 246], textColor: [17, 24, 39], fontStyle: 'bold' },
    columnStyles: Object.fromEntries([1, 2, 3, 4, 5, 6, 7, 8].map((i) => [i, { halign: 'right' as const }])),
    didParseCell: (d) => {
      if (d.section === 'foot' && d.column.index > 0) d.cell.styles.halign = 'right'
    },
    margin: { left: MARGIN, right: MARGIN },
  })
  if (report.months.some((m) => m.status === 'open')) muted(doc, '* Open month: figures so far.', lastY(doc) + 14)
}

function monthPages(doc: jsPDF, autoTable: AutoTable, report: VendorReport, m: MonthReport) {
  doc.addPage()
  let y = heading(doc, `${report.vendorName}: ${m.title}`, MARGIN + 10)
  y = muted(doc, m.status === 'closed' ? 'Closed month' : 'Open month (figures so far)', y)

  const s = m.statement
  autoTable(doc, {
    startY: y + 4,
    body: [
      ['Monthly fee', rm(s.base_fee)],
      ['Billable meals', String(s.billable)],
      ['Value per meal (fee / billable)', rm(s.derived_meal_value)],
      ['Opening credit', rm(s.opening_credit)],
      ['Credit applied', `- ${rm(s.credit_applied)}`],
      ['Amount due', rm(s.amount_due)],
      ['Paid', rm(s.paid)],
      ['Outstanding', rm(s.outstanding)],
      ['Credit earned this month', rm(s.earned_credit)],
      ['Overpayment', rm(s.overpayment)],
      ['Closing credit (carried forward)', rm(s.closing_credit)],
    ],
    theme: 'plain',
    styles: { fontSize: 9, cellPadding: 3 },
    columnStyles: { 0: { textColor: MUTED, cellWidth: 200 }, 1: { halign: 'right', cellWidth: 100 } },
    didParseCell: (d) => {
      const label = String((d.row.raw as string[])[0])
      if (label === 'Amount due' || label.startsWith('Closing credit') || (label === 'Outstanding' && s.outstanding > 0)) d.cell.styles.fontStyle = 'bold'
    },
    margin: { left: MARGIN },
  })

  const c = s.counts
  y = muted(doc, `Delivered ${c.delivered}  |  Not delivered ${c.vendor_cancelled}  |  I cancelled ${c.user_cancelled}  |  No service ${c.no_service}  |  Not marked ${c.scheduled}`, lastY(doc) + 14)

  autoTable(doc, {
    startY: y + 2,
    head: [['Date', 'Day', 'Meal', 'Status', 'Cancelled at', 'Notice', 'Value', 'Credit', 'Note']],
    body: m.rows.map((r) => [
      r.date,
      r.weekday,
      r.meal,
      r.statusLabel,
      r.cancelledAt ?? '',
      r.noticeHours == null ? '' : `${r.noticeHours.toFixed(1)}h`,
      r.value == null ? '-' : rm(r.value),
      r.credit > 0 ? rm(r.credit) : '-',
      r.note,
    ]),
    foot: [['Total', '', '', '', '', '', '', rm(s.earned_credit), '']],
    theme: 'grid',
    styles: { fontSize: 7.5, cellPadding: 3 },
    headStyles: { fillColor: GREEN },
    footStyles: { fillColor: [243, 244, 246], textColor: [17, 24, 39], fontStyle: 'bold' },
    columnStyles: { 6: { halign: 'right' }, 7: { halign: 'right' } },
    showFoot: 'lastPage',
    didParseCell: (d) => {
      if (d.section === 'foot' && d.column.index === 7) d.cell.styles.halign = 'right'
      if (d.section !== 'body') return
      const row = m.rows[d.row.index]
      if (row) d.cell.styles.fillColor = STATUS_FILL[row.status]
    },
    margin: { left: MARGIN, right: MARGIN },
  })

  y = heading(doc, 'Payments', lastY(doc) + 24, 11)
  autoTable(doc, {
    startY: y - 4,
    head: [['Date', 'Method', 'Amount', 'Note']],
    body: m.payments.length ? m.payments.map((p) => [p.date, p.method, rm(p.amount), p.note]) : [['No payments recorded', '', '', '']],
    theme: 'grid',
    styles: { fontSize: 8, cellPadding: 3 },
    headStyles: { fillColor: GREEN },
    columnStyles: { 2: { halign: 'right' } },
    margin: { left: MARGIN, right: MARGIN },
  })
}

function pageNumbers(doc: jsPDF) {
  const pages = doc.getNumberOfPages()
  const w = doc.internal.pageSize.getWidth()
  const h = doc.internal.pageSize.getHeight()
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(...MUTED)
    doc.text(`MealTrack  |  page ${i} of ${pages}`, w / 2, h - 20, { align: 'center' })
  }
}

export async function exportPdf(report: VendorReport): Promise<Blob> {
  const [{ jsPDF }, { default: autoTable }] = await Promise.all([import('jspdf'), import('jspdf-autotable')])
  const doc = new jsPDF({ unit: 'pt', format: 'a4' })
  doc.setProperties({ title: `MealTrack report: ${report.vendorName}`, creator: 'MealTrack' })
  summaryPage(doc, autoTable, report)
  for (const m of report.months) monthPages(doc, autoTable, report, m)
  pageNumbers(doc)
  return doc.output('blob')
}
