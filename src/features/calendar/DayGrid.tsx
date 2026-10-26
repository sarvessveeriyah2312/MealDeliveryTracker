import { useRef } from 'react'
import type { Meal } from '@/api/types'
import { StatusDot } from '@/components/StatusDot'
import { daysInPeriod, weekdayOf } from '@/lib/dates'

const HEADERS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const LONG_PRESS_MS = 450

export function DayGrid(props: {
  period: string
  today: string
  meals: Meal[]
  selected: Set<string>
  /** Day open in the desktop side panel. */
  shownDay?: string | null
  onTap: (date: string) => void
  onLongPress: (date: string) => void
}) {
  const days = daysInPeriod(props.period)
  const leading = (weekdayOf(props.period) + 6) % 7 // Monday-first grid
  const byDate = new Map<string, Meal[]>()
  for (const m of props.meals) byDate.set(m.date, [...(byDate.get(m.date) ?? []), m])

  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const longPressed = useRef(false)

  const start = (date: string) => {
    longPressed.current = false
    timer.current = setTimeout(() => {
      longPressed.current = true
      navigator.vibrate?.(15)
      props.onLongPress(date)
    }, LONG_PRESS_MS)
  }
  const cancel = () => clearTimeout(timer.current)

  return (
    <div className="card p-3">
      <div className="mb-1 grid grid-cols-7 text-center text-xs font-medium text-muted">
        {HEADERS.map((h) => (
          <div key={h} className="py-1.5">{h.slice(0, 2)}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {Array.from({ length: leading }, (_, i) => (
          <div key={`pad-${i}`} />
        ))}
        {days.map((date) => {
          const meals = byDate.get(date) ?? []
          const lunch = meals.find((m) => m.meal_type === 'lunch')
          const dinner = meals.find((m) => m.meal_type === 'dinner')
          const isSelected = props.selected.has(date)
          const isShown = props.shownDay === date
          const isToday = date === props.today
          const off = meals.length > 0 && meals.every((m) => m.status === 'no_service')
          return (
            <button
              key={date}
              onPointerDown={() => start(date)}
              onPointerUp={cancel}
              onPointerLeave={cancel}
              onPointerCancel={cancel}
              onContextMenu={(e) => e.preventDefault()}
              onClick={() => {
                if (longPressed.current) return
                props.onTap(date)
              }}
              className={`flex aspect-square min-h-11 flex-col items-center justify-center gap-1 rounded-xl text-sm font-medium tabular transition-colors select-none ${
                isSelected ? 'bg-brand text-white dark:text-bg' : isShown ? 'bg-brand-soft text-brand-strong' : off ? 'text-muted line-through decoration-muted/50' : meals.length ? 'hover:bg-surface-2' : 'text-muted/45'
              } ${isToday && !isSelected ? 'ring-[1.5px] ring-fg' : ''}`}
              aria-label={`${date}${isSelected ? ', selected' : ''}`}
            >
              <span className={isToday ? 'font-bold' : ''}>{Number(date.slice(8))}</span>
              <span className="flex gap-1">
                <StatusDot status={lunch?.status} className={isSelected ? 'border-white' : ''} />
                <StatusDot status={dinner?.status} className={isSelected ? 'border-white' : ''} />
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
