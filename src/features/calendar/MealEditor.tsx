import { useState } from 'react'
import { billingMeal } from '@/api/adapters'
import type { Meal, MealUpdate } from '@/api/types'
import { StatusIcon } from '@/components/StatusPill'
import { STATUS_SOLID } from '@/components/status'
import { isPastDueTime, mealCredit, perMealValue, type PricingContext } from '@/lib/billing'
import { MEAL_LABELS, STATUS_LABELS, type MealStatus } from '@/lib/constants'
import { fromLocalInputValue, toLocalInputValue } from '@/lib/dates'
import { formatRM } from '@/lib/money'
import { Moon, Sun } from 'lucide-react'

const STATUSES: MealStatus[] = ['delivered', 'vendor_cancelled', 'user_cancelled', 'scheduled', 'no_service']

export function MealEditor({ meal, ctx, locked, autoDeliver, onSave }: { meal: Meal; ctx: PricingContext; locked: boolean; autoDeliver: boolean; onSave: (patch: MealUpdate) => void }) {
  const [status, setStatus] = useState<MealStatus>(meal.status)
  const [note, setNote] = useState(meal.note ?? '')
  const [override, setOverride] = useState(meal.credit_override == null ? '' : String(meal.credit_override))
  const [cancelledAt, setCancelledAt] = useState(meal.cancelled_at ? toLocalInputValue(meal.cancelled_at) : '')

  const effectiveCancelledAt =
    status === 'user_cancelled' ? (cancelledAt ? fromLocalInputValue(cancelledAt) : (meal.cancelled_at ?? new Date().toISOString())) : null
  const draft: Meal = { ...meal, status, cancelled_at: effectiveCancelledAt, credit_override: override === '' ? null : Number(override) }
  const credit = mealCredit(billingMeal(draft), ctx)
  const dirty =
    status !== meal.status || note !== (meal.note ?? '') || draft.credit_override !== (meal.credit_override == null ? null : Number(meal.credit_override)) || effectiveCancelledAt !== meal.cancelled_at

  return (
    <section className="space-y-4 border-b border-line pb-5 last:border-0">
      <div className="flex items-baseline gap-2">
        {meal.meal_type === 'lunch' ? <Sun className="h-4 w-4 self-center text-muted" /> : <Moon className="h-4 w-4 self-center text-muted" />}
        <h3 className="flex-1 text-lg font-semibold tracking-tight">{MEAL_LABELS[meal.meal_type]}</h3>
        <span className="text-sm text-muted tabular">
          worth {formatRM(perMealValue(billingMeal(draft), ctx))}, credit <strong className={credit > 0 ? 'text-delivered' : 'text-fg'}>{formatRM(credit)}</strong>
        </span>
      </div>
      <div className="flex flex-wrap gap-2" role="radiogroup" aria-label={`${meal.meal_type} status`}>
        {STATUSES.filter((s) => s !== 'scheduled' || meal.status === 'scheduled' || !autoDeliver || !isPastDueTime(meal, new Date())).map((s) => (
          <button
            key={s}
            role="radio"
            aria-checked={status === s}
            disabled={locked}
            onClick={() => setStatus(s)}
            className={`chip ${status === s ? STATUS_SOLID[s] : ''}`}
          >
            <StatusIcon status={s} />
            {STATUS_LABELS[s]}
          </button>
        ))}
      </div>
      {status === 'user_cancelled' && (
        <div className="space-y-1">
          <label className="field-label" htmlFor={`ca-${meal.id}`}>When I cancelled (MYT)</label>
          <input id={`ca-${meal.id}`} type="datetime-local" className="input" disabled={locked} value={cancelledAt} onChange={(e) => setCancelledAt(e.target.value)} />
          <p className="text-xs text-muted">Used for the notice rule. Defaults to now.</p>
        </div>
      )}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <label className="field-label" htmlFor={`ov-${meal.id}`}>Credit override</label>
          <input id={`ov-${meal.id}`} type="number" inputMode="decimal" step="0.01" placeholder="auto" className="input" disabled={locked} value={override} onChange={(e) => setOverride(e.target.value)} />
        </div>
        <div className="space-y-1">
          <label className="field-label" htmlFor={`n-${meal.id}`}>Note</label>
          <input id={`n-${meal.id}`} className="input" disabled={locked} value={note} onChange={(e) => setNote(e.target.value)} placeholder="optional" />
        </div>
      </div>
      {!locked && (
        <button
          className="btn-primary w-full"
          disabled={!dirty}
          onClick={() => onSave({ status, cancelled_at: effectiveCancelledAt, credit_override: draft.credit_override, note: note.trim() || null })}
        >
          Save {MEAL_LABELS[meal.meal_type].toLowerCase()}
        </button>
      )}
    </section>
  )
}
