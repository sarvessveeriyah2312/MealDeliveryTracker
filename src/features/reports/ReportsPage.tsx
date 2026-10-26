import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { billingMeal, pricingSettings } from '@/api/adapters'
import { listMeals } from '@/api/months'
import { listPayments } from '@/api/payments'
import type { Month } from '@/api/types'
import { EmptyState, ErrorBox, Loading, Page } from '@/components/Page'
import { FileChartColumn, FileSpreadsheet, FileText, LoaderCircle } from 'lucide-react'
import { useToast } from '@/components/Toast'
import { keys } from '@/hooks/keys'
import { useCurrentSubscription } from '@/hooks/useCurrentSubscription'
import { useMonthsWithCurrent } from '@/hooks/useMonthData'
import { formatPeriod } from '@/lib/dates'
import { downloadBlob } from '@/lib/export/download'
import { buildVendorReport, reportFileName, type ReportMonthInput } from '@/lib/report'
import { ShareSection } from './ShareSection'

type Format = 'xlsx' | 'pdf'

export function ReportsPage() {
  const { subscription: sub } = useCurrentSubscription()
  const { months, current, isLoading, error } = useMonthsWithCurrent(sub.id)

  return (
    <Page title="Reports">
      <div className="space-y-6 lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:items-start lg:gap-6 lg:space-y-0">
        {isLoading ? (
          <Loading />
        ) : error ? (
          <ErrorBox error={error} />
        ) : months.length === 0 || !current ? (
          <EmptyState icon={<FileChartColumn className="h-7 w-7" />} title="No months yet" />
        ) : (
          <ExportCard key={sub.id} months={months} current={current} />
        )}
        <ShareSection />
      </div>
    </Page>
  )
}

function ExportCard({ months, current }: { months: Month[]; current: Month }) {
  const { subscription: sub } = useCurrentSubscription()
  const qc = useQueryClient()
  const toast = useToast()
  const [from, setFrom] = useState(current.period)
  const [to, setTo] = useState(current.period)
  const [busy, setBusy] = useState<Format | null>(null)

  const [lo, hi] = from <= to ? [from, to] : [to, from]
  const selected = months.filter((m) => m.period >= lo && m.period <= hi)
  const presets: { label: string; from: string; to: string }[] = [
    { label: 'This month', from: current.period, to: current.period },
    { label: 'Last 3', from: months[Math.max(0, months.indexOf(current) - 2)]!.period, to: current.period },
    { label: 'All', from: months[0]!.period, to: months[months.length - 1]!.period },
  ]

  const exportReport = async (format: Format) => {
    setBusy(format)
    try {
      const inputs: ReportMonthInput[] = await Promise.all(
        selected.map(async (m) => {
          const [meals, payments] = await Promise.all([
            qc.fetchQuery({ queryKey: keys.meals(m.id), queryFn: () => listMeals(m.id) }),
            qc.fetchQuery({ queryKey: keys.payments(m.id), queryFn: () => listPayments(m.id) }),
          ])
          return {
            period: m.period,
            status: m.status,
            feeSnapshot: Number(m.fee_snapshot),
            openingCredit: Number(m.opening_credit),
            meals: meals.map((meal) => ({ ...billingMeal(meal), note: meal.note })),
            payments: payments.map((p) => ({ paid_on: p.paid_on, method: p.method, amount: Number(p.amount), note: p.note })),
          }
        }),
      )
      const report = buildVendorReport({ vendorName: sub.vendor_name, settings: pricingSettings(sub), carryForward: sub.carry_forward_enabled, months: inputs, now: new Date() })
      // Exporters are loaded on demand to keep the app bundle small.
      const blob = format === 'xlsx' ? await (await import('@/lib/export/excel')).exportExcel(report) : await (await import('@/lib/export/pdf')).exportPdf(report)
      downloadBlob(blob, reportFileName(sub.vendor_name, selected, format))
      toast(`${format === 'xlsx' ? 'Excel' : 'PDF'} report downloaded`)
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Export failed', { tone: 'error' })
    } finally {
      setBusy(null)
    }
  }

  const monthOptions = months.map((m) => (
    <option key={m.id} value={m.period}>
      {formatPeriod(m.period)}
    </option>
  ))

  return (
    <section className="card space-y-4">
      <div>
        <h2 className="section-title">Export a report</h2>
        <p className="text-sm text-muted">Every meal day by day with its credit, the monthly statement and your payments.</p>
      </div>
      <div className="flex gap-2">
        {presets.map((p) => {
          const on = lo === p.from && hi === p.to
          return (
            <button
              key={p.label}
              aria-pressed={on}
              onClick={() => {
                setFrom(p.from)
                setTo(p.to)
              }}
              className={`chip flex-1 ${on ? 'chip-on' : ''}`}
            >
              {p.label}
            </button>
          )
        })}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <label className="space-y-1">
          <span className="field-label">From</span>
          <select className="input" value={from} onChange={(e) => setFrom(e.target.value)}>
            {monthOptions}
          </select>
        </label>
        <label className="space-y-1">
          <span className="field-label">To</span>
          <select className="input" value={to} onChange={(e) => setTo(e.target.value)}>
            {monthOptions}
          </select>
        </label>
      </div>
      <p className="text-xs text-muted">
        {selected.length} month{selected.length === 1 ? '' : 's'} of {sub.vendor_name}
      </p>
      <div className="grid grid-cols-2 gap-3">
        {(
          [
            { format: 'xlsx', label: 'Download Excel', sub: 'Workbook with live formulas', icon: FileSpreadsheet },
            { format: 'pdf', label: 'Download PDF', sub: 'A4, ready to print', icon: FileText },
          ] as const
        ).map((f) => (
          <button
            key={f.format}
            className="flex flex-col items-start gap-2 rounded-xl border border-line p-3.5 text-left transition-colors hover:border-brand disabled:opacity-50"
            disabled={!!busy || !selected.length}
            onClick={() => exportReport(f.format)}
          >
            {busy === f.format ? <LoaderCircle className="h-6 w-6 animate-spin text-brand" /> : <f.icon className="h-6 w-6 text-brand" />}
            <span>
              <span className="block font-semibold">{busy === f.format ? 'Preparing…' : f.label}</span>
              <span className="block text-xs text-muted">{f.sub}</span>
            </span>
          </button>
        ))}
      </div>
    </section>
  )
}
