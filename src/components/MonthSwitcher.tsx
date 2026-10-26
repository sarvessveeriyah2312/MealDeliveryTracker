import type { Month } from '@/api/types'
import { formatPeriod } from '@/lib/dates'

export function MonthSwitcher({ months, value, onChange }: { months: Month[]; value: Month; onChange: (m: Month) => void }) {
  const i = months.findIndex((m) => m.id === value.id)
  const prev = months[i - 1]
  const next = months[i + 1]
  return (
    <div className="flex items-center justify-between">
      <button className="btn-secondary min-w-11 px-0" disabled={!prev} onClick={() => prev && onChange(prev)} aria-label="Previous month">
        ‹
      </button>
      <div className="text-center">
        <div className="font-semibold">{formatPeriod(value.period)}</div>
        <div className="text-xs text-muted">{value.status === 'closed' ? '🔒 Closed' : 'Open'}</div>
      </div>
      <button className="btn-secondary min-w-11 px-0" disabled={!next} onClick={() => next && onChange(next)} aria-label="Next month">
        ›
      </button>
    </div>
  )
}
