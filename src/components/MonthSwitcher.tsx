import { ChevronLeft, ChevronRight, Lock } from 'lucide-react'
import type { Month } from '@/api/types'
import { formatPeriod } from '@/lib/dates'

export function MonthSwitcher({ months, value, onChange }: { months: Month[]; value: Month; onChange: (m: Month) => void }) {
  const i = months.findIndex((m) => m.id === value.id)
  const prev = months[i - 1]
  const next = months[i + 1]
  return (
    <div className="flex items-center justify-between">
      <button className="icon-btn" disabled={!prev} onClick={() => prev && onChange(prev)} aria-label="Previous month">
        <ChevronLeft className="h-5 w-5" />
      </button>
      <div className="text-center">
        <h2 className="text-xl font-semibold tracking-tight">{formatPeriod(value.period)}</h2>
        <div className="flex items-center justify-center gap-1 text-xs text-muted">
          {value.status === 'closed' ? (
            <>
              <Lock className="h-3 w-3" /> Closed
            </>
          ) : (
            <>
              <span className="h-1.5 w-1.5 rounded-full bg-brand" /> Open
            </>
          )}
        </div>
      </div>
      <button className="icon-btn" disabled={!next} onClick={() => next && onChange(next)} aria-label="Next month">
        <ChevronRight className="h-5 w-5" />
      </button>
    </div>
  )
}
