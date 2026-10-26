import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { billingMeal, pricingSettings } from '@/api/adapters'
import { listMeals } from '@/api/months'
import { listPayments } from '@/api/payments'
import type { Month } from '@/api/types'
import { ErrorBox, Loading, Page } from '@/components/Page'
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
      {isLoading ? (
        <Loading />
      ) : error ? (
        <ErrorBox error={error} />
      ) : months.length === 0 || !current ? (
        <p className="card text-sm text-muted">No months yet.</p>
      ) : (
        <ExportCard key={sub.id} months={months} current={current} />
      )}
      <ShareSection />
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
    <section className="card space-y-3">
      <div>
        <h2 className="font-semibold">Export report</h2>
        <p className="text-xs text-muted">Every meal day by day, credit per meal, the monthly statement and payments.</p>
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
              className={`min-h-11 flex-1 rounded-xl border text-sm ${on ? 'border-brand bg-brand/10 font-semibold' : 'border-line'}`}
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
        {selected.length} month{selected.length === 1 ? '' : 's'} · {sub.vendor_name}
      </p>
      <div className="grid grid-cols-2 gap-3">
        <button className="btn-secondary min-h-14" disabled={!!busy || !selected.length} onClick={() => exportReport('xlsx')}>
          {busy === 'xlsx' ? 'Preparing…' : '📊 Excel'}
        </button>
        <button className="btn-secondary min-h-14" disabled={!!busy || !selected.length} onClick={() => exportReport('pdf')}>
          {busy === 'pdf' ? 'Preparing…' : '📄 PDF'}
        </button>
      </div>
    </section>
  )
}
