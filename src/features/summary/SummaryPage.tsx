import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { closeMonth, reopenMonth, resolveMeals } from '@/api/monthOps'
import { updateMonth } from '@/api/months'
import { addPayment, deletePayment } from '@/api/payments'
import type { Month, Payment } from '@/api/types'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { MonthSwitcher } from '@/components/MonthSwitcher'
import { MoneyRow } from '@/components/MoneyRow'
import { ErrorBox, Loading, Page } from '@/components/Page'
import { STATUS_PILL } from '@/components/status'
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

  return (
    <Page title="Summary">
      <MonthSwitcher months={months} value={month} onChange={onSelect} />

      <section className="card">
        <h2 className="mb-1 font-semibold">Statement</h2>
        <div className="flex items-baseline justify-between gap-3 py-1.5 text-sm">
          <span className="text-muted">Monthly fee</span>
          {editingFee === null ? (
            <button className="tabular-nums underline decoration-dotted disabled:no-underline" disabled={!isOpen} onClick={() => setEditingFee(String(month.fee_snapshot))}>
              {formatRM(st.base_fee)}
            </button>
          ) : (
            <span className="flex items-center gap-2">
              <input aria-label="Fee for this month" type="number" step="0.01" inputMode="decimal" className="input w-28 text-right" value={editingFee} onChange={(e) => setEditingFee(e.target.value)} />
              <button className="btn-primary px-3" disabled={busy || editingFee === '' || Number(editingFee) < 0} onClick={saveFee}>Save</button>
            </span>
          )}
        </div>
        <MoneyRow label="Opening credit" amount={st.opening_credit} />
        <MoneyRow label="Credit applied" amount={st.credit_applied} sign="−" />
        <MoneyRow label="Amount due" amount={st.amount_due} strong />
        <MoneyRow label="Paid" amount={st.paid} />
        {st.outstanding > 0 && <MoneyRow label="Outstanding" amount={st.outstanding} strong />}
        {st.overpayment > 0 && <MoneyRow label="Overpaid (becomes credit)" amount={st.overpayment} />}
        <div className="my-2 border-t border-line" />
        <MoneyRow label="Credit earned this month" amount={st.earned_credit} hint={`${st.billable} billable meals · ${formatRM(st.derived_meal_value)}/meal`} />
        <MoneyRow label={isOpen ? 'Closing credit (so far)' : 'Closing credit'} amount={isOpen ? st.closing_credit : Number(month.closing_credit ?? 0)} strong />
        {isOpen && (
          <p className="mt-2 rounded-xl bg-bg p-3 text-sm">
            Next month: {formatRM(Number(sub.monthly_fee))} − {formatRM(next.credit_applied)} credit = <strong>{formatRM(next.amount_due)}</strong>
          </p>
        )}
      </section>

      <section className="card">
        <h2 className="mb-2 font-semibold">Meals</h2>
        <div className="flex flex-wrap gap-2">
          {(Object.keys(st.counts) as MealStatus[]).map((s) => (
            <span key={s} className={`rounded-full px-3 py-1 text-xs font-medium ${STATUS_PILL[s]}`}>
              {STATUS_LABELS[s]}: {st.counts[s]}
            </span>
          ))}
        </div>
      </section>

      <section className="card">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="font-semibold">Payments</h2>
          <button className="btn-secondary" onClick={() => setPaying(true)}>+ Add</button>
        </div>
        {data.payments.length === 0 ? (
          <p className="text-sm text-muted">No payments recorded.</p>
        ) : (
          <ul className="divide-y divide-line">
            {data.payments.map((p) => (
              <li key={p.id} className="flex items-center justify-between gap-2 py-2 text-sm">
                <span>
                  {formatDay(p.paid_on)} · {METHOD_LABELS[p.method]}
                  {p.note && <span className="block text-xs text-muted">{p.note}</span>}
                </span>
                <span className="flex items-center gap-1">
                  <span className="tabular-nums">{formatRM(Number(p.amount))}</span>
                  <button className="min-h-11 min-w-11 text-muted" aria-label="Delete payment" onClick={() => setRemoving(p)}>🗑</button>
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {isOpen ? (
        <div className="space-y-2">
          <button className="btn-primary w-full min-h-14" disabled={earlierOpen || busy} onClick={() => setClosing(true)}>
            Close {formatPeriod(month.period)}
          </button>
          {earlierOpen && <p className="text-center text-xs text-muted">Close earlier months first.</p>}
        </div>
      ) : (
        <button className="btn-secondary w-full min-h-14" disabled={busy} onClick={() => setReopening(true)}>
          🔓 Reopen {formatPeriod(month.period)}
        </button>
      )}

      <section className="card">
        <h2 className="mb-2 font-semibold">History</h2>
        <ol className="space-y-1">
          {[...months].reverse().map((m) => (
            <li key={m.id}>
              <button
                onClick={() => onSelect(m)}
                className={`flex min-h-11 w-full items-center justify-between rounded-xl px-2 text-sm ${m.id === month.id ? 'bg-bg font-semibold' : ''}`}
              >
                <span>
                  {m.status === 'closed' ? '🔒' : '🟢'} {formatPeriod(m.period)}
                </span>
                <span className="tabular-nums text-muted">
                  {formatRM(Number(m.opening_credit))} → {m.closing_credit == null ? '…' : formatRM(Number(m.closing_credit))}
                </span>
              </button>
            </li>
          ))}
        </ol>
        <p className="mt-2 text-xs text-muted">Opening credit → closing credit. Each closing credit carries into the next month.</p>
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
