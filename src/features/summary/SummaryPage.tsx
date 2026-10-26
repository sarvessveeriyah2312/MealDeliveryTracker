import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { closeMonth, reopenMonth, resolveMeals } from '@/api/monthOps'
import { updateMonth } from '@/api/months'
import { addPayment, deletePayment } from '@/api/payments'
import type { Month, Payment } from '@/api/types'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { MonthSwitcher } from '@/components/MonthSwitcher'
import { LedgerRow, MoneyRow } from '@/components/MoneyRow'
import { ErrorBox, Loading, Page } from '@/components/Page'
import { Lock, LockOpen, Pencil, Plus, Trash2 } from 'lucide-react'
import { useToast } from '@/components/Toast'
import { statusPatch, useUpdateMeals } from '@/hooks/mutations'
import { useOffDays } from '@/hooks/queries'
import { useCurrentSubscription } from '@/hooks/useCurrentSubscription'
import { useMonthData, useMonthsWithCurrent } from '@/hooks/useMonthData'
import { projectNextMonth, unmarkedPastMeals } from '@/lib/billing'
import { STATUS_LABELS, type MealStatus } from '@/lib/constants'
import { formatDay, formatPeriod } from '@/lib/dates'
import { formatRM } from '@/lib/money'
import { CloseMonthSheet } from './CloseMonthSheet'
import { METHOD_LABELS, PaymentSheet, type PaymentValues } from './PaymentSheet'

const STATUS_ORDER: MealStatus[] = ['delivered', 'vendor_cancelled', 'user_cancelled', 'no_service', 'scheduled']
const STATUS_BAR: Record<MealStatus, string> = {
  delivered: 'bg-delivered',
  vendor_cancelled: 'bg-vendor',
  user_cancelled: 'bg-user',
  no_service: 'bg-noservice',
  scheduled: 'bg-line',
}

export function SummaryPage() {
  const { subscription: sub } = useCurrentSubscription()
  const { months, current, today, isLoading, error } = useMonthsWithCurrent(sub.id)
  const [monthId, setMonthId] = useState<string | null>(null)
  // Default to the oldest open month: that's the one waiting to be closed.
  const month = months.find((m) => m.id === monthId) ?? months.find((m) => m.status === 'open') ?? current

  if (isLoading) return <Page title="Summary"><Loading /></Page>
  if (error) return <Page title="Summary"><ErrorBox error={error} /></Page>
  if (!month) return <Page title="Summary"><p className="card text-sm text-muted">No months yet.</p></Page>
  return <MonthSummary key={month.id} month={month} months={months} today={today} onSelect={(m) => setMonthId(m.id)} />
}

function MonthSummary({ month, months, today, onSelect }: { month: Month; months: Month[]; today: string; onSelect: (m: Month) => void }) {
  const { subscription: sub } = useCurrentSubscription()
  const data = useMonthData(sub, month)
  const offDays = useOffDays(sub.id)
  const update = useUpdateMeals(month.id)
  const qc = useQueryClient()
  const toast = useToast()
  const [paying, setPaying] = useState(false)
  const [closing, setClosing] = useState(false)
  const [reopening, setReopening] = useState(false)
  const [busy, setBusy] = useState(false)
  const [removing, setRemoving] = useState<Payment | null>(null)
  const [editingFee, setEditingFee] = useState<string | null>(null)

  if (data.isLoading || !data.statement) return <Page title="Summary"><Loading /></Page>
  if (data.error) return <Page title="Summary"><ErrorBox error={data.error} /></Page>

  const st = data.statement
  const isOpen = month.status === 'open'
  const earlierOpen = months.some((m) => m.period < month.period && m.status === 'open')
  const later = months.filter((m) => m.period > month.period)
  const unmarked = unmarkedPastMeals(data.meals, today)
  const next = projectNextMonth(st.closing_credit, Number(sub.monthly_fee), sub.carry_forward_enabled)

  const refreshAll = () => Promise.all([qc.invalidateQueries({ queryKey: ['months'] }), qc.invalidateQueries({ queryKey: ['meals'] }), qc.invalidateQueries({ queryKey: ['payments'] })])

  const run = async (label: string, fn: () => Promise<unknown>) => {
    setBusy(true)
    try {
      await fn()
      await refreshAll()
      toast(label)
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Something went wrong', { tone: 'error' })
    } finally {
      setBusy(false)
    }
  }

  const doClose = () =>
    run(`${formatPeriod(month.period)} closed`, async () => {
      if (sub.auto_mark_delivered && unmarked.length) await resolveMeals(unmarked.map((m) => m.id), 'delivered')
      await closeMonth({ sub, month, allMonths: months, offDays: offDays.data ?? [] })
      setClosing(false)
    })

  const savePayment = async (v: PaymentValues) => {
    await run('Payment added', () => addPayment({ subscription_month_id: month.id, amount: v.amount, paid_on: v.paid_on, method: v.method, note: v.note.trim() || null }))
    setPaying(false)
  }

  const saveFee = () =>
    run('Fee updated', async () => {
      await updateMonth(month.id, { fee_snapshot: Number(editingFee) })
      setEditingFee(null)
    })

  const markMany = (ids: string[], status: MealStatus) => update.mutate({ ids, patch: statusPatch(status) }, { onError: (e) => toast(e.message, { tone: 'error' }) })

  const total = STATUS_ORDER.reduce((n, k) => n + st.counts[k], 0)

  return (
    <Page title="Summary" eyebrow={sub.vendor_name}>
      <MonthSwitcher months={months} value={month} onChange={onSelect} />

      <section className="card">
        <div className="ledger-row">
          <span className="text-muted">Monthly fee</span>
          <span aria-hidden className="ledger-leader" />
          {editingFee === null ? (
            <button className="inline-flex items-center gap-1.5 tabular disabled:cursor-default" disabled={!isOpen} onClick={() => setEditingFee(String(month.fee_snapshot))}>
              {formatRM(st.base_fee)}
              {isOpen && <Pencil className="h-3.5 w-3.5 text-muted" aria-label="Edit fee" />}
            </button>
          ) : (
            <span className="flex items-center gap-2">
              <input aria-label="Fee for this month" type="number" step="0.01" inputMode="decimal" className="input min-h-10 w-28 text-right" value={editingFee} onChange={(e) => setEditingFee(e.target.value)} />
              <button className="btn-primary min-h-10 px-3" disabled={busy || editingFee === '' || Number(editingFee) < 0} onClick={saveFee}>
                Save
              </button>
            </span>
          )}
        </div>
        <MoneyRow label="Credit from last month" amount={st.opening_credit} />
        <MoneyRow label="Credit used" amount={st.credit_applied} sign="−" />
        <MoneyRow label="Amount due" amount={st.amount_due} total />
        <MoneyRow label="Paid" amount={st.paid} />
        {st.outstanding > 0 ? (
          <MoneyRow label="Still to pay" amount={st.outstanding} strong tone="bad" />
        ) : (
          <LedgerRow label="Still to pay" value="Nothing" tone="good" />
        )}

        <div className="mt-4">
          <MoneyRow label="Credit earned this month" amount={st.earned_credit} hint={`${st.billable} billable meals at ${formatRM(st.derived_meal_value)} each`} />
          {st.overpayment > 0 && <MoneyRow label="Overpaid, kept as credit" amount={st.overpayment} />}
          <MoneyRow label={isOpen ? 'Credit to carry, so far' : 'Credit carried forward'} amount={isOpen ? st.closing_credit : Number(month.closing_credit ?? 0)} total tone="good" />
        </div>
        {isOpen && (
          <p className="mt-3 text-sm text-muted">
            Next month you'll pay <strong className="text-fg tabular">{formatRM(next.amount_due)}</strong>: the {formatRM(Number(sub.monthly_fee))} fee less {formatRM(next.credit_applied)} credit.
          </p>
        )}
      </section>

      <section className="card space-y-3">
        <h2 className="section-title">Meals</h2>
        <div className="flex h-3 overflow-hidden rounded-full bg-surface-2" role="img" aria-label={STATUS_ORDER.map((k) => `${STATUS_LABELS[k]} ${st.counts[k]}`).join(', ')}>
          {STATUS_ORDER.map((k) =>
            st.counts[k] ? <span key={k} className={STATUS_BAR[k]} style={{ width: `${(st.counts[k] / Math.max(total, 1)) * 100}%` }} /> : null,
          )}
        </div>
        <ul className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm">
          {STATUS_ORDER.map((k) => (
            <li key={k} className="flex items-center gap-2">
              <span className={`h-2.5 w-2.5 rounded-full ${STATUS_BAR[k]}`} />
              <span className="flex-1 text-muted">{STATUS_LABELS[k]}</span>
              <span className="font-semibold tabular">{st.counts[k]}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="card">
        <div className="mb-1 flex items-center justify-between">
          <h2 className="section-title">Payments</h2>
          <button className="btn-ghost min-h-10 px-3 text-sm text-brand" onClick={() => setPaying(true)}>
            <Plus className="h-4 w-4" /> Add payment
          </button>
        </div>
        {data.payments.length === 0 ? (
          <p className="py-2 text-sm text-muted">No payments yet. Add one when you pay {sub.vendor_name}.</p>
        ) : (
          <ul className="divide-y divide-line">
            {data.payments.map((p) => (
              <li key={p.id} className="flex items-center gap-3 py-2">
                <span className="min-w-0 flex-1 text-sm">
                  <span className="block font-medium">
                    {formatDay(p.paid_on, 'd MMM')}, {METHOD_LABELS[p.method]}
                  </span>
                  {p.note && <span className="block truncate text-xs text-muted">{p.note}</span>}
                </span>
                <span className="font-semibold tabular">{formatRM(Number(p.amount))}</span>
                <button className="icon-btn -mr-2" aria-label="Delete payment" onClick={() => setRemoving(p)}>
                  <Trash2 className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {isOpen ? (
        <div className="space-y-2">
          <button className="btn-primary min-h-14 w-full" disabled={earlierOpen || busy} onClick={() => setClosing(true)}>
            <Lock className="h-5 w-5" /> Close {formatPeriod(month.period)}
          </button>
          {earlierOpen && <p className="text-center text-xs text-muted">Close earlier months first.</p>}
        </div>
      ) : (
        <button className="btn-secondary min-h-14 w-full" disabled={busy} onClick={() => setReopening(true)}>
          <LockOpen className="h-5 w-5" /> Reopen {formatPeriod(month.period)}
        </button>
      )}

      <section className="card">
        <h2 className="section-title mb-2">Credit history</h2>
        <ol className="relative space-y-1 before:absolute before:top-5 before:bottom-5 before:left-[1.05rem] before:w-px before:bg-line">
          {[...months].reverse().map((m) => {
            const selected = m.id === month.id
            return (
              <li key={m.id}>
                <button
                  onClick={() => onSelect(m)}
                  className={`relative flex min-h-12 w-full items-center gap-3 rounded-2xl px-2 text-left text-sm transition ${selected ? 'bg-surface-2' : 'hover:bg-surface-2/60'}`}
                >
                  <span className={`z-10 flex h-5 w-5 items-center justify-center rounded-full ring-4 ring-surface ${m.status === 'closed' ? 'bg-muted/30 text-muted' : 'bg-brand text-white'}`}>
                    {m.status === 'closed' ? <Lock className="h-2.5 w-2.5" /> : <span className="h-1.5 w-1.5 rounded-full bg-white" />}
                  </span>
                  <span className={`flex-1 ${selected ? 'font-semibold' : ''}`}>{formatPeriod(m.period)}</span>
                  <span className="text-xs text-muted tabular">
                    {formatRM(Number(m.opening_credit))} → <span className="font-semibold text-fg">{m.closing_credit == null ? '…' : formatRM(Number(m.closing_credit))}</span>
                  </span>
                </button>
              </li>
            )
          })}
        </ol>
        <p className="mt-3 text-xs text-muted">Opening → closing credit. Each closing credit carries into the next month.</p>
      </section>

      <PaymentSheet
        open={paying}
        onClose={() => setPaying(false)}
        defaults={{ amount: Math.round(st.outstanding * 100) / 100 || NaN, paid_on: today, method: 'bank_transfer', note: '' }}
        onSubmit={savePayment}
      />

      <CloseMonthSheet
        open={closing}
        onClose={() => setClosing(false)}
        month={month}
        today={today}
        statement={st}
        unmarked={unmarked}
        autoMark={sub.auto_mark_delivered}
        carryForward={sub.carry_forward_enabled}
        onMark={markMany}
        onConfirm={doClose}
      />

      <ConfirmDialog
        open={reopening}
        title={`Reopen ${formatPeriod(month.period)}?`}
        confirmLabel="Reopen"
        tone="danger"
        busy={busy}
        onCancel={() => setReopening(false)}
        onConfirm={() =>
          run(`${formatPeriod(month.period)} reopened`, async () => {
            await reopenMonth(month)
            setReopening(false)
          })
        }
      >
        <p>Meals in this month become editable again.</p>
        {later.length > 0 && (
          <p className="rounded-xl bg-user/15 p-3 text-user">
            When you close it again, the credit carried into {later.map((m) => formatPeriod(m.period)).join(', ')} will be recalculated and may change what you owe.
          </p>
        )}
      </ConfirmDialog>

      <ConfirmDialog
        open={!!removing}
        title="Delete payment?"
        confirmLabel="Delete"
        tone="danger"
        busy={busy}
        onCancel={() => setRemoving(null)}
        onConfirm={() =>
          run('Payment deleted', async () => {
            if (removing) await deletePayment(removing.id)
            setRemoving(null)
          })
        }
      >
        <p>{removing && `${formatRM(Number(removing.amount))} paid on ${formatDay(removing.paid_on)}`}</p>
      </ConfirmDialog>
    </Page>
  )
}
