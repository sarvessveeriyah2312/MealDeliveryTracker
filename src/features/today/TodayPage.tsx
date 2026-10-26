import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { billingMeal } from '@/api/adapters'
import { openMonth } from '@/api/monthOps'
import type { Meal, Month, Subscription } from '@/api/types'
import { BottomSheet } from '@/components/BottomSheet'
import { ErrorBox, Loading, Page } from '@/components/Page'
import { useToast } from '@/components/Toast'
import { UnmarkedMealsList } from '@/components/UnmarkedMealsList'
import { keys } from '@/hooks/keys'
import { statusPatch, useUpdateMeals } from '@/hooks/mutations'
import { useOffDays } from '@/hooks/queries'
import { useCurrentSubscription } from '@/hooks/useCurrentSubscription'
import { useMonthData, useMonthsWithCurrent } from '@/hooks/useMonthData'
import { useVendorTotals } from '@/hooks/useVendorTotals'
import { isPastDueTime, mealCredit, nextOpeningCredit, projectNextMonth, unmarkedPastMeals } from '@/lib/billing'
import { MEAL_LABELS, STATUS_LABELS, type MealStatus } from '@/lib/constants'
import { addMonths, formatDay, formatPeriod, periodOf, todayLocal } from '@/lib/dates'
import { formatRM } from '@/lib/money'
import { MealCard } from './MealCard'

export function TodayPage() {
  const { subscriptions, addVendor } = useCurrentSubscription()
  const today = todayLocal()
  const active = subscriptions.filter((s) => s.is_active)
  const multi = active.length > 1

  return (
    <Page title={formatDay(today, 'EEEE, d MMM')}>
      {multi && <AllVendorsTotals subs={active} today={today} />}
      {active.length === 0 ? (
        <section className="card space-y-3 text-center">
          <p>No active vendors.</p>
          <button className="btn-primary w-full" onClick={addVendor}>+ Add vendor</button>
        </section>
      ) : (
        active.map((sub) => <VendorToday key={sub.id} sub={sub} today={today} multi={multi} />)
      )}
    </Page>
  )
}

function AllVendorsTotals({ subs, today }: { subs: Subscription[]; today: string }) {
  const totals = useVendorTotals(subs, today)
  return (
    <section className="card grid grid-cols-2 divide-x divide-line">
      <div className="pr-3">
        <p className="text-xs text-muted">Credit · all vendors</p>
        <p className="text-2xl font-bold tabular-nums text-delivered">{totals ? formatRM(totals.credit) : '…'}</p>
      </div>
      <div className="pl-3">
        <p className="text-xs text-muted">Due next month · all</p>
        <p className="text-2xl font-bold tabular-nums">{totals ? formatRM(totals.dueNextMonth) : '…'}</p>
      </div>
    </section>
  )
}

function VendorToday({ sub, today, multi }: { sub: Subscription; today: string; multi: boolean }) {
  const { months, current, isLoading, error } = useMonthsWithCurrent(sub.id)
  return (
    <div className="space-y-3">
      {multi && <h2 className="pt-2 text-sm font-semibold tracking-wide text-muted uppercase">{sub.vendor_name}</h2>}
      {isLoading ? (
        <Loading />
      ) : error ? (
        <ErrorBox error={error} />
      ) : !current || current.period !== periodOf(today) ? (
        <NoMonthForToday sub={sub} months={months} latest={current} today={today} />
      ) : (
        <TodayForMonth sub={sub} month={current} today={today} multi={multi} />
      )}
    </div>
  )
}

function TodayForMonth({ sub, month, today, multi }: { sub: Subscription; month: Month; today: string; multi: boolean }) {
  const { select } = useCurrentSubscription()
  const data = useMonthData(sub, month)
  const update = useUpdateMeals(month.id)
  const toast = useToast()
  const [resolving, setResolving] = useState(false)

  if (data.isLoading || !data.statement || !data.ctx) return <Loading />
  if (data.error) return <ErrorBox error={data.error} />

  const locked = month.status === 'closed'
  const todays = data.meals.filter((m) => m.date === today)
  const unmarked = unmarkedPastMeals(data.meals, today)
  const next = projectNextMonth(data.statement.closing_credit, Number(sub.monthly_fee), sub.carry_forward_enabled)
  const ctx = data.ctx
  const label = (meal: Meal) => (multi ? `${sub.vendor_name} ${MEAL_LABELS[meal.meal_type].toLowerCase()}` : MEAL_LABELS[meal.meal_type])

  const mark = (meal: Meal, status: MealStatus) => {
    const before = { status: meal.status, cancelled_at: meal.cancelled_at }
    update.mutate(
      { ids: [meal.id], patch: statusPatch(status) },
      {
        onSuccess: () =>
          toast(`${label(meal)}: ${STATUS_LABELS[status]}`, {
            actionLabel: 'Undo',
            onAction: () => update.mutate({ ids: [meal.id], patch: before }),
          }),
        onError: (e) => toast(e.message, { tone: 'error' }),
      },
    )
  }

  const markMany = (ids: string[], status: MealStatus) =>
    update.mutate({ ids, patch: statusPatch(status) }, { onError: (e) => toast(e.message, { tone: 'error' }) })

  return (
    <>
      {multi ? (
        <p className="flex justify-between text-sm text-muted">
          <span>
            Credit <span className="font-semibold text-delivered tabular-nums">{formatRM(data.statement.closing_credit)}</span>
          </span>
          <span>
            Next month <span className="font-semibold text-fg tabular-nums">{formatRM(next.amount_due)}</span>
          </span>
        </p>
      ) : (
        <section className="card grid grid-cols-2 divide-x divide-line">
          <div className="pr-3">
            <p className="text-xs text-muted">Credit this month</p>
            <p className="text-2xl font-bold tabular-nums text-delivered">{formatRM(data.statement.closing_credit)}</p>
            <p className="text-xs text-muted">earned {formatRM(data.statement.earned_credit)}</p>
          </div>
          <div className="pl-3">
            <p className="text-xs text-muted">Due next month</p>
            <p className="text-2xl font-bold tabular-nums">{formatRM(next.amount_due)}</p>
            {data.statement.outstanding > 0 && <p className="text-xs text-vendor">{formatRM(data.statement.outstanding)} unpaid this month</p>}
          </div>
        </section>
      )}

      {unmarked.length > 0 && (
        <button className="card flex w-full items-center justify-between text-left" onClick={() => setResolving(true)}>
          <span>
            <span className="font-medium">Unmarked past meals: {unmarked.length}</span>
            <span className="block text-xs text-muted">Tap to resolve</span>
          </span>
          <span className="text-muted">›</span>
        </button>
      )}

      {locked && (
        <p className="card text-sm text-muted">
          🔒 {formatPeriod(month.period)} is closed.{' '}
          <Link to="/summary" className="text-brand" onClick={() => select(sub.id)}>
            Reopen it from Summary
          </Link>{' '}
          to make changes.
        </p>
      )}

      {todays.length === 0 ? (
        <section className="card text-center">
          <p>🍃 No {multi ? '' : 'meals '}delivery today</p>
          <p className="mt-1 text-sm text-muted">{sub.vendor_name} doesn't deliver on {formatDay(today, 'EEEE')}s.</p>
        </section>
      ) : (
        todays.map((m) => (
          <MealCard
            key={m.id}
            meal={m}
            title={label(m)}
            credit={mealCredit(billingMeal(m), ctx)}
            locked={locked}
            autoDeliver={sub.auto_mark_delivered}
            pastDue={isPastDueTime(m, new Date())}
            onMark={(s) => mark(m, s)}
          />
        ))
      )}

      <BottomSheet open={resolving} onClose={() => setResolving(false)} title={`Unmarked past meals${multi ? ` · ${sub.vendor_name}` : ''}`}>
        <UnmarkedMealsList meals={unmarked} onMark={markMany} disabled={locked} />
      </BottomSheet>
    </>
  )
}

/** Today's month hasn't been opened yet (previous month still open, or subscription not started). */
function NoMonthForToday({ sub, months, latest, today }: { sub: Subscription; months: Month[]; latest: Month | undefined; today: string }) {
  const { select } = useCurrentSubscription()
  const offDays = useOffDays(sub.id)
  const qc = useQueryClient()
  const toast = useToast()
  const [busy, setBusy] = useState(false)
  const thisPeriod = periodOf(today)

  if (sub.start_date > today) {
    return (
      <div className="card text-center">
        <p className="text-lg">⏳ Starts {formatDay(sub.start_date, 'd MMMM')}</p>
        <p className="mt-1 text-sm text-muted">{sub.vendor_name} deliveries begin then.</p>
      </div>
    )
  }

  if (latest && latest.period < thisPeriod && latest.status === 'open') {
    return (
      <div className="card space-y-3">
        <p className="font-medium">{formatPeriod(latest.period)} is still open</p>
        <p className="text-sm text-muted">Close it to carry your credit into {formatPeriod(addMonths(latest.period, 1))}.</p>
        <Link to="/summary" className="btn-primary w-full" onClick={() => select(sub.id)}>
          Review & close {formatPeriod(latest.period)}
        </Link>
      </div>
    )
  }

  const open = async () => {
    setBusy(true)
    try {
      const carried = latest?.status === 'closed' ? nextOpeningCredit(Number(latest.closing_credit ?? 0), sub.carry_forward_enabled) : 0
      await openMonth({ sub, period: thisPeriod, openingCredit: carried, offDays: offDays.data ?? [] })
      await qc.invalidateQueries({ queryKey: keys.months(sub.id) })
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Could not open month', { tone: 'error' })
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="card space-y-3">
      <p className="font-medium">{formatPeriod(thisPeriod)} isn't open yet</p>
      <p className="text-sm text-muted">
        {months.length ? 'Your last month is closed but no new month was opened.' : 'Open this month to start tracking meals.'}
      </p>
      <button className="btn-primary w-full" disabled={busy || offDays.isLoading} onClick={open}>
        Open {formatPeriod(thisPeriod)}
      </button>
    </div>
  )
}
