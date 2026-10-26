import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { addOffDay, deleteOffDay, listOffDays } from '@/api/offDays'
import { syncOffDays } from '@/api/monthOps'
import type { Month, OffDay } from '@/api/types'
import { CalendarOff, Plus, X } from 'lucide-react'
import { SectionHeader } from '@/components/SectionHeader'
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
    <section className="card space-y-4">
      <SectionHeader icon={CalendarOff} title="Off days" description={'Meals on these days become "No service" and don\'t count toward the per-meal value.'} />
      <div className="grid grid-cols-2 gap-2">
        <input aria-label="Off day date" type="date" className="input" value={date} onChange={(e) => setDate(e.target.value)} />
        <select aria-label="Reason" className="input" value={reason} onChange={(e) => setReason(e.target.value)}>
          {REASONS.map((r) => (
            <option key={r}>{r}</option>
          ))}
        </select>
        <button
          className="btn-primary col-span-2"
          disabled={busy || !date || offDays.some((d) => d.date === date)}
          onClick={() => run(() => addOffDay(subscriptionId, date, reason), `${formatDay(date)} marked as off day`)}
        >
          <Plus className="h-5 w-5" /> Add off day
        </button>
      </div>
      {closedPeriods.has(periodOf(date)) && <p className="text-xs text-user">That month is closed — its meals won't change unless you reopen it.</p>}
      {visible.length === 0 ? (
        <p className="text-sm text-muted">No {showPast ? '' : 'upcoming '}off days.</p>
      ) : (
        <ul className="divide-y divide-line rounded-2xl bg-surface-2 px-3">
          {visible.map((d) => (
            <li key={d.id} className="flex items-center justify-between py-1 text-sm">
              <span>
                <span className="font-medium">{formatDay(d.date, 'EEE d MMM yyyy')}</span>
                <span className="block text-xs text-muted">{d.reason}</span>
              </span>
              <button className="icon-btn -mr-2" aria-label={`Remove ${d.date}`} disabled={busy} onClick={() => run(() => deleteOffDay(d.id), 'Off day removed')}>
                <X className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      )}
      <button className="btn-ghost min-h-10 px-2 text-sm text-brand" onClick={() => setShowPast((v) => !v)}>
        {showPast ? 'Hide past off days' : 'Show past off days'}
      </button>
    </section>
  )
}
