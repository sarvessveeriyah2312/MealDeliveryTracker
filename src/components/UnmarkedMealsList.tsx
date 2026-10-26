import { Ban, CheckCheck, CircleCheck, CircleX, Moon, Sun } from 'lucide-react'
import type { Meal } from '@/api/types'
import { MEAL_LABELS, type MealStatus } from '@/lib/constants'
import { formatDay } from '@/lib/dates'

const QUICK: { status: MealStatus; icon: typeof CircleCheck; label: string; className: string }[] = [
  { status: 'delivered', icon: CircleCheck, label: 'Delivered', className: 'text-delivered hover:bg-delivered/10' },
  { status: 'vendor_cancelled', icon: CircleX, label: "Not delivered", className: 'text-vendor hover:bg-vendor/10' },
  { status: 'user_cancelled', icon: Ban, label: 'I cancelled', className: 'text-user hover:bg-user/10' },
]

/** Past meals still "scheduled", each with one-tap resolve buttons. */
export function UnmarkedMealsList({ meals, onMark, disabled }: { meals: Meal[]; onMark: (ids: string[], status: MealStatus) => void; disabled?: boolean }) {
  if (!meals.length) return <p className="py-4 text-center text-sm text-muted">Nothing to resolve. Every past meal is marked.</p>
  return (
    <div className="space-y-3">
      <button className="btn-primary w-full" disabled={disabled} onClick={() => onMark(meals.map((m) => m.id), 'delivered')}>
        <CheckCheck className="h-5 w-5" /> Mark all {meals.length} as delivered
      </button>
      <ul className="divide-y divide-line rounded-xl border border-line">
        {meals.map((m) => {
          const MealIcon = m.meal_type === 'lunch' ? Sun : Moon
          return (
            <li key={m.id} className="flex items-center justify-between gap-2 py-1.5 pr-1.5 pl-4">
              <span className="flex items-center gap-2 text-sm">
                <MealIcon className="h-4 w-4 text-muted" />
                <span>
                  <span className="font-medium">{formatDay(m.date)}</span> <span className="text-muted">{MEAL_LABELS[m.meal_type].toLowerCase()}</span>
                </span>
              </span>
              <span className="flex">
                {QUICK.map((q) => (
                  <button
                    key={q.status}
                    disabled={disabled}
                    className={`icon-btn ${q.className}`}
                    aria-label={`${formatDay(m.date)} ${m.meal_type}: ${q.label}`}
                    title={q.label}
                    onClick={() => onMark([m.id], q.status)}
                  >
                    <q.icon className="h-5 w-5" />
                  </button>
                ))}
              </span>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
