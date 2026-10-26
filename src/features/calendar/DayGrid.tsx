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
    <div className="card p-2">
      <div className="grid grid-cols-7 text-center text-xs text-muted">
        {HEADERS.map((h) => (
          <div key={h} className="py-1">{h}</div>
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
              className={`flex min-h-14 select-none flex-col items-center justify-center gap-1 rounded-xl text-sm ${
                isSelected ? 'bg-brand text-white' : off ? 'bg-noservice/15 text-muted' : meals.length ? 'bg-bg' : 'text-muted/60'
              } ${isToday && !isSelected ? 'ring-2 ring-brand' : ''}`}
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
