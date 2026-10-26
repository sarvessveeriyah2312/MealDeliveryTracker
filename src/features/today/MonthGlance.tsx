import type { Meal } from '@/api/types'
import type { MealStatus } from '@/lib/constants'
import { daysInPeriod, formatDay, weekdayOf } from '@/lib/dates'

// The month as a grid of miniature tingkats: each day is two tiers, lunch over dinner, filled with
// that meal's status colour. Tapping a day opens it on the main tingkat.

const TIER: Record<MealStatus, string> = {
  delivered: 'bg-delivered',
  vendor_cancelled: 'bg-vendor',
  user_cancelled: 'bg-user',
  no_service: 'bg-noservice/50',
  scheduled: 'bg-transparent border border-muted/40',
}

export function MonthGlance(props: { period: string; today: string; selected: string; meals: Meal[]; onSelect: (date: string) => void }) {
  const { period, today, selected, meals, onSelect } = props
  const lead = (weekdayOf(period) + 6) % 7
  const byKey = new Map(meals.map((m) => [`${m.date}|${m.meal_type}`, m]))
  const hasLunch = meals.some((m) => m.meal_type === 'lunch')
  const hasDinner = meals.some((m) => m.meal_type === 'dinner')

  return (
    <section className="card">
      <h2 className="section-title mb-3">This month at a glance</h2>
      <div className="grid grid-cols-7 gap-x-1.5 gap-y-2">
        {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => (
          <span key={i} className="text-center text-[0.65rem] font-medium text-muted">
            {d}
          </span>
        ))}
        {Array.from({ length: lead }, (_, i) => (
          <span key={`pad-${i}`} />
        ))}
        {daysInPeriod(period).map((date) => {
          const lunch = byKey.get(`${date}|lunch`)
          const dinner = byKey.get(`${date}|dinner`)
          const has = !!(lunch || dinner)
          const isSelected = date === selected
          return (
            <button
              key={date}
              disabled={!has}
              onClick={() => onSelect(date)}
              aria-label={`${formatDay(date, 'EEEE d MMMM')}${lunch ? `, lunch ${lunch.status}` : ''}${dinner ? `, dinner ${dinner.status}` : ''}`}
              className={`group flex flex-col items-center gap-[3px] rounded-lg py-1 transition-colors ${isSelected ? 'bg-brand-soft' : 'hover:bg-surface-2'} disabled:cursor-default disabled:hover:bg-transparent`}
            >
              <span className={`text-[0.65rem] leading-none tabular ${date === today ? 'font-bold text-brand' : has ? 'text-fg' : 'text-muted/40'}`}>{Number(date.slice(8))}</span>
              {has ? (
                <>
                  <span className={`h-[5px] w-5 rounded-sm ${lunch ? TIER[lunch.status] : 'bg-transparent'}`} />
                  <span className={`h-[5px] w-5 rounded-sm ${dinner ? TIER[dinner.status] : 'bg-transparent'}`} />
                </>
              ) : (
                <span className="h-[13px]" />
              )}
            </button>
          )
        })}
      </div>
      {hasLunch && hasDinner && <p className="mt-3 text-xs text-muted">Top tier lunch, bottom tier dinner.</p>}
    </section>
  )
}
