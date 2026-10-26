import type { Meal } from '@/api/types'
import { MEAL_LABELS, type MealStatus } from '@/lib/constants'
import { formatDay } from '@/lib/dates'

const QUICK: { status: MealStatus; label: string }[] = [
  { status: 'delivered', label: '✅' },
  { status: 'vendor_cancelled', label: '❌' },
  { status: 'user_cancelled', label: '🙅' },
]

/** Past meals still "scheduled", each with one-tap resolve buttons. */
export function UnmarkedMealsList({ meals, onMark, disabled }: { meals: Meal[]; onMark: (ids: string[], status: MealStatus) => void; disabled?: boolean }) {
  if (!meals.length) return <p className="text-sm text-muted">Nothing to resolve — every past meal is marked.</p>
  return (
    <div className="space-y-2">
      <button className="btn-secondary w-full" disabled={disabled} onClick={() => onMark(meals.map((m) => m.id), 'delivered')}>
        ✅ Mark all {meals.length} as delivered
      </button>
      <ul className="divide-y divide-line">
        {meals.map((m) => (
          <li key={m.id} className="flex items-center justify-between gap-2 py-1.5">
            <span className="text-sm">
              {formatDay(m.date)} · {MEAL_LABELS[m.meal_type]}
            </span>
            <span className="flex gap-1">
              {QUICK.map((q) => (
                <button
                  key={q.status}
                  disabled={disabled}
                  className="min-h-11 min-w-11 rounded-lg border border-line text-lg"
                  aria-label={`${formatDay(m.date)} ${m.meal_type}: ${q.status}`}
                  onClick={() => onMark([m.id], q.status)}
                >
                  {q.label}
                </button>
              ))}
            </span>
          </li>
        ))}
      </ul>
      <p className="text-xs text-muted">✅ delivered · ❌ they didn't deliver · 🙅 I cancelled</p>
    </div>
  )
}
