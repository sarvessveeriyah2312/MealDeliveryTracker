import type { ReactNode } from 'react'
import { Ban, CalendarOff, CircleCheck, CircleX, Moon, Sun, type LucideIcon } from 'lucide-react'
import type { Meal } from '@/api/types'
import { StatusIcon } from '@/components/StatusPill'
import { STATUS_SOLID } from '@/components/status'
import { MEAL_LABELS, MEAL_TIMES, STATUS_LABELS, type MealStatus } from '@/lib/constants'
import { formatRM } from '@/lib/money'

// Today's meals drawn as a tingkat: a handle carrying the vendor's name, one enamel tier per meal
// whose rim takes the meal's status colour, and the clips that hold the tiers together.

const RIM: Record<MealStatus, string> = {
  delivered: 'border-t-delivered',
  vendor_cancelled: 'border-t-vendor',
  user_cancelled: 'border-t-user',
  no_service: 'border-t-noservice',
  scheduled: 'border-t-line',
}

const STATUS_TEXT: Record<MealStatus, string> = {
  delivered: 'text-delivered',
  vendor_cancelled: 'text-vendor',
  user_cancelled: 'text-user',
  no_service: 'text-muted',
  scheduled: 'text-muted',
}

const ACTIONS: { status: MealStatus; label: string; icon: LucideIcon }[] = [
  { status: 'delivered', label: 'Delivered', icon: CircleCheck },
  { status: 'vendor_cancelled', label: "Not delivered", icon: CircleX },
  { status: 'user_cancelled', label: 'I cancelled', icon: Ban },
]

export function Tingkat({ vendorName, children }: { vendorName: string; children: ReactNode }) {
  return (
    <div className="relative px-1.5 pt-10">
      <svg aria-hidden viewBox="0 0 240 44" className="absolute top-0 left-1/2 h-11 w-60 -translate-x-1/2 text-line" fill="none">
        <path d="M24 44V20C24 10 31 4 42 4H198C209 4 216 10 216 20V44" stroke="currentColor" strokeWidth="5" strokeLinecap="round" />
      </svg>
      <p className="absolute top-0 left-1/2 max-w-[11rem] -translate-x-1/2 -translate-y-1/3 truncate rounded-full border border-line bg-bg px-3 py-0.5 text-xs font-semibold">
        {vendorName}
      </p>
      <div className="space-y-2">{children}</div>
      <div aria-hidden className="mx-5 h-2.5 rounded-b-2xl bg-line" />
    </div>
  )
}

function Clips() {
  return (
    <>
      <span aria-hidden className="absolute top-9 -left-1.5 h-7 w-1.5 rounded-l-md bg-line" />
      <span aria-hidden className="absolute top-9 -right-1.5 h-7 w-1.5 rounded-r-md bg-line" />
    </>
  )
}

export function TingkatTier(props: {
  meal: Meal
  index: number
  credit: number
  locked: boolean
  /** Auto-mark is on for this vendor. */
  autoDeliver: boolean
  /** The meal's time has passed. */
  pastDue: boolean
  onMark: (status: MealStatus) => void
}) {
  const { meal, index, credit, locked, autoDeliver, pastDue, onMark } = props
  // Unsetting would just be auto-marked delivered again, so once due a tap only switches status.
  const canUnset = !(autoDeliver && pastDue)
  const MealIcon = meal.meal_type === 'lunch' ? Sun : Moon

  return (
    <section
      className={`animate-tier relative rounded-[1.25rem] border border-t-[6px] border-line bg-surface p-4 transition-colors ${RIM[meal.status]}`}
      style={{ animationDelay: `${index * 90}ms` }}
    >
      <Clips />
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <MealIcon className="h-5 w-5 text-muted" />
          <h3 className="text-xl font-semibold tracking-tight">{MEAL_LABELS[meal.meal_type]}</h3>
          <span className="text-sm text-muted tabular">{MEAL_TIMES[meal.meal_type]}</span>
        </div>
        <p className={`flex items-center gap-1 text-sm font-semibold ${STATUS_TEXT[meal.status]}`}>
          <StatusIcon status={meal.status} />
          {STATUS_LABELS[meal.status]}
        </p>
      </div>
      {credit > 0 && <p className="mt-1 text-sm font-semibold text-delivered">You're owed {formatRM(credit)} for this meal</p>}
      {meal.note && <p className="mt-1 text-sm text-muted">{meal.note}</p>}

      {meal.status === 'no_service' ? (
        <p className="mt-3 flex items-center gap-2 text-sm text-muted">
          <CalendarOff className="h-4 w-4" /> Off day, nothing to mark.
        </p>
      ) : (
        <>
          <div className="mt-3 grid grid-cols-3 gap-1 rounded-xl bg-surface-2 p-1" role="group" aria-label={`${MEAL_LABELS[meal.meal_type]} status`}>
            {ACTIONS.map((a) => {
              const active = meal.status === a.status
              return (
                <button
                  key={a.status}
                  disabled={locked}
                  aria-pressed={active}
                  onClick={() => (active ? canUnset && onMark('scheduled') : onMark(a.status))}
                  className={`flex min-h-12 items-center justify-center gap-1.5 rounded-lg border text-[0.8rem] font-semibold transition-colors disabled:opacity-50 ${
                    active ? STATUS_SOLID[a.status] : 'border-transparent text-fg hover:bg-surface'
                  }`}
                >
                  <a.icon className="h-4 w-4 shrink-0" strokeWidth={2.4} />
                  {a.label}
                </button>
              )
            })}
          </div>
          {autoDeliver && meal.status === 'scheduled' && !pastDue && (
            <p className="mt-2 text-xs text-muted">Marked delivered at {MEAL_TIMES[meal.meal_type]} unless you change it.</p>
          )}
        </>
      )}
    </section>
  )
}

export function EmptyTier({ children }: { children: ReactNode }) {
  return (
    <section className="animate-tier relative rounded-[1.25rem] border border-dashed border-line bg-surface/60 p-5 text-center text-sm text-muted">
      <Clips />
      {children}
    </section>
  )
}
