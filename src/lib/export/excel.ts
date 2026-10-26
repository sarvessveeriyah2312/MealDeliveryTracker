import type { Worksheet } from 'exceljs'
import type { MealStatus } from '../constants'
import type { MonthReport, VendorReport } from '../report'

const RM = '"RM"#,##0.00'
const XLSX_TYPE = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'

const STATUS_FILL: Record<MealStatus, string> = {
  delivered: 'FFDCFCE7',
  vendor_cancelled: 'FFFEE2E2',
  user_cancelled: 'FFFEF3C7',
  no_service: 'FFF3F4F6',
  scheduled: 'FFFFFFFF',
}

const HEADER_FILL = { type: 'pattern' as const, pattern: 'solid' as const, fgColor: { argb: 'FF16A34A' } }

function toExcelDate(date: string): Date {
  return new Date(`${date}T00:00:00Z`)
}

function styleHeader(ws: Worksheet, row: number, columns: number) {
  const r = ws.getRow(row)
  for (let c = 1; c <= columns; c++) {
    const cell = r.getCell(c)
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' } }
    cell.fill = HEADER_FILL
    cell.alignment = { vertical: 'middle' }
  }
}

/** A formula cell that also carries billing.ts's value, so the file reads correctly before recalculation. */
function formula(f: string, result: number) {
  return { formula: f, result }
}

function addSummarySheet(wb: import('exceljs').Workbook, report: VendorReport) {
  const ws = wb.addWorksheet('Summary', { views: [{ state: 'frozen', ySplit: 6 }] })
  ws.getCell('A1').value = `MealTrack report: ${report.vendorName}`
  ws.getCell('A1').font = { bold: true, size: 14 }
  ws.getCell('A2').value = `Generated ${report.generatedAt} (Malaysia time)`
  ws.getCell('A3').value = report.terms.map((t) => `${t.label}: ${t.value}`).join('   ·   ')
  ws.getCell('A4').value = 'Credit applied = MIN(opening credit, fee) · Amount due = fee − credit applied · Closing credit = opening − applied + earned + overpayment'
  ws.getCell('A4').font = { italic: true, color: { argb: 'FF6B7280' } }

  const headers = ['Month', 'Status', 'Fee', 'Opening credit', 'Credit applied', 'Amount due', 'Paid', 'Outstanding', 'Credit earned', 'Overpayment', 'Closing credit']
  const headerRow = 6
  ws.getRow(headerRow).values = headers
  styleHeader(ws, headerRow, headers.length)

  report.months.forEach((m, i) => {
    const r = headerRow + 1 + i
    const s = m.statement
    ws.getRow(r).values = [
      m.title,
      m.status === 'closed' ? 'Closed' : 'Open',
      s.base_fee,
      s.opening_credit,
      formula(`MIN(D${r},C${r})`, s.credit_applied),
      formula(`C${r}-E${r}`, s.amount_due),
      s.paid,
      formula(`MAX(F${r}-G${r},0)`, s.outstanding),
      s.earned_credit,
      formula(`MAX(G${r}-F${r},0)`, s.overpayment),
      formula(`D${r}-E${r}+I${r}+J${r}`, s.closing_credit),
    ]
  })

  const first = headerRow + 1
  const last = headerRow + report.months.length
  const totalRow = last + 1
  const t = report.totals
  ws.getRow(totalRow).values = [
    'Total',
    '',
    formula(`SUM(C${first}:C${last})`, t.fees),
    '',
    formula(`SUM(E${first}:E${last})`, t.creditApplied),
    formula(`SUM(F${first}:F${last})`, t.amountDue),
    formula(`SUM(G${first}:G${last})`, t.paid),
    formula(`SUM(H${first}:H${last})`, t.outstanding),
    formula(`SUM(I${first}:I${last})`, t.earned),
    '',
    '',
  ]
  ws.getRow(totalRow).font = { bold: true }

  for (let c = 3; c <= headers.length; c++) ws.getColumn(c).numFmt = RM
  ws.columns.forEach((col, i) => (col.width = i === 0 ? 16 : 15))
}

function addMonthSheet(wb: import('exceljs').Workbook, report: VendorReport, m: MonthReport) {
  const ws = wb.addWorksheet(m.title.replace(/^(\w{3})\w*/, '$1'))
  ws.getCell('A1').value = `${report.vendorName}: ${m.title}`
  ws.getCell('A1').font = { bold: true, size: 14 }
  ws.getCell('A2').value = m.status === 'closed' ? 'Closed month' : 'Open month (figures so far)'

  // Layout: statement block, status counts, meal table, payments table.
  const mealHeader = 18
  const firstMeal = mealHeader + 1
  const lastMeal = mealHeader + Math.max(m.rows.length, 1)
  const mealTotal = lastMeal + 1
  const payHeader = mealTotal + 3
  const firstPay = payHeader + 1
  const lastPay = payHeader + Math.max(m.payments.length, 1)
  const s = m.statement

  const statement: [string, number | ReturnType<typeof formula>, boolean?][] = [
    ['Monthly fee', s.base_fee],
    ['Billable meals', formula(`COUNTIF(D${firstMeal}:D${lastMeal},"<>No service")`, s.billable)],
    ['Value per meal (fee ÷ billable)', formula(`IF(B5=0,0,B4/B5)`, s.derived_meal_value)],
    ['Opening credit', s.opening_credit],
    ['Credit applied', formula('MIN(B7,B4)', s.credit_applied)],
    ['Amount due', formula('B4-B8', s.amount_due), true],
    ['Paid', m.payments.length ? formula(`SUM(C${firstPay}:C${lastPay})`, s.paid) : 0],
    ['Outstanding', formula('MAX(B9-B10,0)', s.outstanding), true],
    ['Credit earned', formula(`SUM(H${firstMeal}:H${lastMeal})`, s.earned_credit)],
    ['Overpayment', formula('MAX(B10-B9,0)', s.overpayment)],
    ['Closing credit (carried forward)', formula('B7-B8+B12+B13', s.closing_credit), true],
  ]
  statement.forEach(([label, value, bold], i) => {
    const r = ws.getRow(4 + i)
    r.getCell(1).value = label
    r.getCell(2).value = value
    r.getCell(2).numFmt = label === 'Billable meals' ? '0' : RM
    if (bold) r.font = { bold: true }
  })
  ws.getCell('A3').value = 'Statement'
  ws.getCell('A3').font = { bold: true }

  const c = s.counts
  ws.getCell('A16').value =
    `Delivered ${c.delivered} · They didn't deliver ${c.vendor_cancelled} · I cancelled ${c.user_cancelled} · No service ${c.no_service} · Not marked ${c.scheduled}`
  ws.getCell('A16').font = { color: { argb: 'FF6B7280' } }

  const mealHeaders = ['Date', 'Day', 'Meal', 'Status', 'Cancelled at (MYT)', 'Notice (hours)', 'Meal value', 'Credit', 'Note']
  ws.getRow(mealHeader).values = mealHeaders
  styleHeader(ws, mealHeader, mealHeaders.length)
  m.rows.forEach((row, i) => {
    const r = ws.getRow(firstMeal + i)
    r.values = [toExcelDate(row.date), row.weekday, row.meal, row.statusLabel, row.cancelledAt ?? '', row.noticeHours ?? '', row.value ?? '', row.credit, row.note]
    const fill = { type: 'pattern' as const, pattern: 'solid' as const, fgColor: { argb: STATUS_FILL[row.status] } }
    for (let col = 1; col <= mealHeaders.length; col++) r.getCell(col).fill = fill
  })
  const totals = ws.getRow(mealTotal)
  totals.getCell(1).value = 'Total'
  totals.getCell(8).value = formula(`SUM(H${firstMeal}:H${lastMeal})`, s.earned_credit)
  totals.font = { bold: true }
  ws.autoFilter = { from: { row: mealHeader, column: 1 }, to: { row: lastMeal, column: mealHeaders.length } }

  ws.getCell(`A${payHeader - 1}`).value = 'Payments'
  ws.getCell(`A${payHeader - 1}`).font = { bold: true }
  ws.getRow(payHeader).values = ['Date', 'Method', 'Amount', 'Note']
  styleHeader(ws, payHeader, 4)
  if (m.payments.length === 0) ws.getCell(`A${firstPay}`).value = 'No payments recorded'
  m.payments.forEach((p, i) => {
    ws.getRow(firstPay + i).values = [toExcelDate(p.date), p.method, p.amount, p.note]
  })

  ws.getColumn(1).width = 30
  ws.getColumn(1).numFmt = 'd mmm yyyy'
  ws.getColumn(2).width = 14
  ws.getColumn(3).width = 12
  ws.getColumn(4).width = 20
  ws.getColumn(5).width = 20
  ws.getColumn(6).width = 14
  ws.getColumn(6).numFmt = '0.0'
  ws.getColumn(7).width = 12
  ws.getColumn(7).numFmt = RM
  ws.getColumn(8).width = 12
  ws.getColumn(8).numFmt = RM
  ws.getColumn(9).width = 30
  // Column 2 holds statement amounts above the meal table; keep its money format there.
  for (let r = 4; r <= 14; r++) if (r !== 5) ws.getCell(`B${r}`).numFmt = RM
  for (let r = firstPay; r <= lastPay; r++) ws.getCell(`C${r}`).numFmt = RM
}

export async function exportExcel(report: VendorReport): Promise<Blob> {
  const { default: ExcelJS } = await import('exceljs')
  const wb = new ExcelJS.Workbook()
  wb.creator = 'MealTrack'
  wb.created = new Date()
  addSummarySheet(wb, report)
  for (const m of report.months) addMonthSheet(wb, report, m)
  const buffer = await wb.xlsx.writeBuffer()
  return new Blob([buffer], { type: XLSX_TYPE })
}
