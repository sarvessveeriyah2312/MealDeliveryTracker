import { ChevronLeft, ChevronRight } from 'lucide-react'
import type { Meal } from '@/api/types'
import { StatusDot } from '@/components/StatusDot'
import { addDays, formatDay, lastDayOfPeriod, weekdayOf } from '@/lib/dates'

/** Monday-to-Sunday days around the selected date; tap one to show its tingkat. */
export function WeekStrip(props: { period: string; today: string; selected: string; meals: Meal[]; onSelect: (date: string) => void }) {
  const { period, today, selected, meals, onSelect } = props
  const first = period
  const last = lastDayOfPeriod(period)
  const weekStart = addDays(selected, -((weekdayOf(selected) + 6) % 7))
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))
  const clamp = (d: string) => (d < first ? first : d > last ? last : d)

  const byDate = new Map<string, Meal[]>()
  for (const m of meals) byDate.set(m.date, [...(byDate.get(m.date) ?? []), m])

  return (
    <div className="flex items-center gap-1">
      <button className="icon-btn -ml-2" aria-label="Previous week" disabled={weekStart <= first} onClick={() => onSelect(clamp(addDays(selected, -7)))}>
        <ChevronLeft className="h-5 w-5" />
      </button>
      <ol className="grid flex-1 grid-cols-7 gap-1">
        {days.map((date) => {
          const inMonth = date >= first && date <= last
          const dayMeals = byDate.get(date) ?? []
          const isSelected = date === selected
          const isToday = date === today
          return (
            <li key={date}>
              <button
                disabled={!inMonth}
                onClick={() => onSelect(date)}
                aria-current={isSelected ? 'date' : undefined}
                aria-label={`${formatDay(date, 'EEEE d MMMM')}${isToday ? ', today' : ''}`}
                className={`flex w-full flex-col items-center gap-1 rounded-xl py-2 transition-colors disabled:opacity-30 ${
                  isSelected ? 'bg-brand-soft text-brand-strong ring-1 ring-brand/40' : 'hover:bg-surface-2'
                }`}
              >
                <span className={`text-[0.7rem] font-medium ${isSelected ? 'text-brand-strong/80' : 'text-muted'}`}>{formatDay(date, 'EEEEE')}</span>
                <span className={`font-display text-lg leading-none font-semibold tabular ${isToday ? 'text-brand' : ''}`}>{Number(date.slice(8))}</span>
                <span className="flex h-1.5 gap-0.5">
                  {dayMeals.map((m) => (
                    <StatusDot key={m.id} status={m.status} />
                  ))}
                </span>
              </button>
            </li>
          )
        })}
      </ol>
      <button className="icon-btn -mr-2" aria-label="Next week" disabled={addDays(weekStart, 6) >= last} onClick={() => onSelect(clamp(addDays(selected, 7)))}>
        <ChevronRight className="h-5 w-5" />
      </button>
    </div>
  )
}
