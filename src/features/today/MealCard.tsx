import type { Meal } from '@/api/types'
import { MEAL_TIMES, STATUS_LABELS, type MealStatus } from '@/lib/constants'
import { formatRM } from '@/lib/money'
import { STATUS_PILL } from '@/components/status'

const ACTIONS: { status: MealStatus; label: string; className: string }[] = [
  { status: 'delivered', label: '✅ Delivered', className: 'bg-delivered text-white' },
  { status: 'vendor_cancelled', label: "❌ They didn't deliver", className: 'bg-vendor text-white' },
  { status: 'user_cancelled', label: '🙅 I cancelled', className: 'bg-user text-white' },
]

export function MealCard(props: {
  meal: Meal
  title: string
  credit: number
  locked: boolean
  /** Auto-mark is on for this vendor. */
  autoDeliver: boolean
  /** The meal's time has passed. */
  pastDue: boolean
  onMark: (status: MealStatus) => void
}) {
  const { meal, title, credit, locked, autoDeliver, pastDue, onMark } = props
  // Unsetting would just be auto-marked delivered again, so once due a tap only switches status.
  const canUnset = !(autoDeliver && pastDue)
  const noService = meal.status === 'no_service'
  return (
    <section className="card space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">{title}</h3>
          <p className="text-xs text-muted">Due {MEAL_TIMES[meal.meal_type]}</p>
        </div>
        <span className={`rounded-full px-3 py-1 text-xs font-medium ${STATUS_PILL[meal.status]}`}>
          {STATUS_LABELS[meal.status]}
          {credit > 0 && ` · +${formatRM(credit)}`}
        </span>
      </div>
      {meal.note && <p className="text-sm text-muted">📝 {meal.note}</p>}
      {autoDeliver && meal.status === 'scheduled' && !pastDue && (
        <p className="text-xs text-muted">Will be marked delivered at {MEAL_TIMES[meal.meal_type]} unless you change it.</p>
      )}
      {noService ? (
        <p className="text-sm text-muted">No service today (off day).</p>
      ) : (
        <div className="grid gap-2">
          {ACTIONS.map((a) => {
            const active = meal.status === a.status
            return (
              <button
                key={a.status}
                disabled={locked}
                aria-pressed={active}
                onClick={() => (active ? canUnset && onMark('scheduled') : onMark(a.status))}
                className={`btn min-h-14 text-base ${active ? `${a.className} ring-2 ring-offset-2 ring-offset-surface` : 'border border-line bg-surface'}`}
              >
                {a.label}
              </button>
            )
          })}
        </div>
      )}
    </section>
  )
}
