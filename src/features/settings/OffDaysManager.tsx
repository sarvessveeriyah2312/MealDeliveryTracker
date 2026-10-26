import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { addOffDay, deleteOffDay, listOffDays } from '@/api/offDays'
import { syncOffDays } from '@/api/monthOps'
import type { Month, OffDay } from '@/api/types'
import { useToast } from '@/components/Toast'
import { keys } from '@/hooks/keys'
import { formatDay, periodOf } from '@/lib/dates'

const REASONS = ['Public holiday', 'Vendor off', 'Other']

export function OffDaysManager({ subscriptionId, offDays, months, today }: { subscriptionId: string; offDays: OffDay[]; months: Month[]; today: string }) {
  const qc = useQueryClient()
  const toast = useToast()
  const [date, setDate] = useState(today)
  const [reason, setReason] = useState(REASONS[0]!)
  const [busy, setBusy] = useState(false)
  const [showPast, setShowPast] = useState(false)

  const closedPeriods = new Set(months.filter((m) => m.status === 'closed').map((m) => m.period))
  const visible = offDays.filter((d) => showPast || d.date >= today)

  const run = async (fn: () => Promise<void>, message: string) => {
    setBusy(true)
    try {
      await fn()
      const fresh = await listOffDays(subscriptionId)
      await syncOffDays(months.filter((m) => m.status === 'open'), fresh)
      await Promise.all([qc.invalidateQueries({ queryKey: keys.offDays(subscriptionId) }), qc.invalidateQueries({ queryKey: ['meals'] })])
      toast(message)
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Could not save', { tone: 'error' })
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="card space-y-3">
      <div>
        <h2 className="font-semibold">Off days</h2>
        <p className="text-xs text-muted">Meals on these days become "No service" and don't count toward the per-meal value.</p>
      </div>
      <div className="grid grid-cols-[1fr_1fr_auto] gap-2">
        <input aria-label="Off day date" type="date" className="input" value={date} onChange={(e) => setDate(e.target.value)} />
        <select aria-label="Reason" className="input" value={reason} onChange={(e) => setReason(e.target.value)}>
          {REASONS.map((r) => (
            <option key={r}>{r}</option>
          ))}
        </select>
        <button
          className="btn-primary"
          disabled={busy || !date || offDays.some((d) => d.date === date)}
          onClick={() => run(() => addOffDay(subscriptionId, date, reason), `${formatDay(date)} marked as off day`)}
        >
          Add
        </button>
      </div>
      {closedPeriods.has(periodOf(date)) && <p className="text-xs text-user">That month is closed — its meals won't change unless you reopen it.</p>}
      {visible.length === 0 ? (
        <p className="text-sm text-muted">No {showPast ? '' : 'upcoming '}off days.</p>
      ) : (
        <ul className="divide-y divide-line">
          {visible.map((d) => (
            <li key={d.id} className="flex items-center justify-between py-1.5 text-sm">
              <span>
                {formatDay(d.date, 'EEE d MMM yyyy')} <span className="text-muted">· {d.reason}</span>
              </span>
              <button className="min-h-11 min-w-11 text-muted" aria-label={`Remove ${d.date}`} disabled={busy} onClick={() => run(() => deleteOffDay(d.id), 'Off day removed')}>
                ✕
              </button>
            </li>
          ))}
        </ul>
      )}
      <button className="text-sm text-brand" onClick={() => setShowPast((v) => !v)}>
        {showPast ? 'Hide past off days' : 'Show past off days'}
      </button>
    </section>
  )
}
