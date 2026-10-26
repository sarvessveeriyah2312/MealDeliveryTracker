import type { ReactNode } from 'react'
import { Ban, CalendarOff, CircleCheck, CircleX, Moon, Sun, type LucideIcon } from 'lucide-react'
import type { Meal } from '@/api/types'
import { StatusIcon } from '@/components/StatusPill'
import { STATUS_SOLID } from '@/components/status'
import { MEAL_LABELS, MEAL_TIMES, STATUS_LABELS, type MealStatus } from '@/lib/constants'
import { formatRM } from '@/lib/money'

// Today's meals drawn as a tingkat: one frame that is the handle across the top and the rails down
// both sides, the vendor's name as the grip, and one enamel tier per meal with a band in its status
// colour.

const BAND: Record<MealStatus, string> = {
  delivered: 'bg-delivered',
  vendor_cancelled: 'bg-vendor',
  user_cancelled: 'bg-user',
  no_service: 'bg-noservice',
  scheduled: 'bg-line',
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
    <div className="relative pt-4">
      {/* Handle and side rails: a single frame, open at the bottom where the stack's foot sits. */}
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-4 bottom-2 rounded-t-[2rem] border-[5px] border-b-0 border-line" />
      <p className="absolute top-0 left-1/2 z-10 max-w-[70%] -translate-x-1/2 truncate rounded-full bg-fg px-3.5 py-1 text-xs font-semibold text-bg">
        {vendorName}
      </p>
      <div className="relative space-y-2 px-3 pt-7">{children}</div>
      <div aria-hidden className="mx-6 mt-2 h-2 rounded-b-xl bg-line" />
    </div>
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
    <section className="animate-tier relative overflow-hidden rounded-2xl border border-line bg-surface" style={{ animationDelay: `${index * 90}ms` }}>
      <div aria-hidden className={`h-1.5 transition-colors duration-300 ${BAND[meal.status]}`} />
      <div className="p-4">
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
                    className={`flex min-h-14 flex-col items-center justify-center gap-1 rounded-lg border px-1 text-[0.78rem] leading-tight font-semibold transition-colors disabled:opacity-50 sm:min-h-12 sm:flex-row sm:gap-1.5 ${
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
      </div>
    </section>
  )
}

export function EmptyTier({ children }: { children: ReactNode }) {
  return (
    <section className="animate-tier rounded-2xl border border-dashed border-line bg-surface/70 p-6 text-center text-sm text-muted">
      {children}
    </section>
  )
}
