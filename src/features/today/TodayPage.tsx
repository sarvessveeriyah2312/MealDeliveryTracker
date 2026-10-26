import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { ChevronRight, CircleAlert, Clock, Lock, Plus, Store } from 'lucide-react'
import { billingMeal } from '@/api/adapters'
import { openMonth } from '@/api/monthOps'
import type { Meal, Month, Subscription } from '@/api/types'
import { useAuth } from '@/auth/AuthProvider'
import { BottomSheet } from '@/components/BottomSheet'
import { EmptyState, ErrorBox, Loading, Page } from '@/components/Page'
import { LedgerRow, MoneyRow } from '@/components/MoneyRow'
import { useToast } from '@/components/Toast'
import { UnmarkedMealsList } from '@/components/UnmarkedMealsList'
import { keys } from '@/hooks/keys'
import { statusPatch, useUpdateMeals } from '@/hooks/mutations'
import { useOffDays } from '@/hooks/queries'
import { useCurrentSubscription } from '@/hooks/useCurrentSubscription'
import { useMonthData, useMonthsWithCurrent } from '@/hooks/useMonthData'
import { useProfile } from '@/hooks/useProfile'
import { useVendorTotals } from '@/hooks/useVendorTotals'
import { isPastDueTime, mealCredit, nextOpeningCredit, projectNextMonth, unmarkedPastMeals } from '@/lib/billing'
import { MEAL_LABELS, STATUS_LABELS, type MealStatus } from '@/lib/constants'
import { addMonths, formatDay, formatPeriod, greetingFor, periodOf, todayLocal } from '@/lib/dates'
import { EmptyTier, Tingkat, TingkatTier } from './Tingkat'

function useFirstName(): string | null {
  const { user } = useAuth()
  const profile = useProfile()
  const full = profile.data?.full_name ?? (user?.user_metadata.full_name as string | undefined)
  return full?.split(' ')[0] ?? null
}

export function TodayPage() {
  const { subscriptions, addVendor } = useCurrentSubscription()
  const today = todayLocal()
  const firstName = useFirstName()
  const active = subscriptions.filter((s) => s.is_active)
  const multi = active.length > 1

  return (
    <Page eyebrow={formatDay(today, 'EEEE d MMMM')} title={`${greetingFor()}${firstName ? `, ${firstName}` : ''}`}>
      {active.length === 0 ? (
        <EmptyState icon={<Store className="h-7 w-7" />} title="No active vendors">
          <button className="btn-primary mt-3" onClick={addVendor}>
            <Plus className="h-5 w-5" /> Add vendor
          </button>
        </EmptyState>
      ) : (
        <>
          {active.map((sub) => (
            <VendorToday key={sub.id} sub={sub} today={today} multi={multi} />
          ))}
          {multi && <AllVendorsLedger subs={active} today={today} />}
        </>
      )}
    </Page>
  )
}

function AllVendorsLedger({ subs, today }: { subs: Subscription[]; today: string }) {
  const totals = useVendorTotals(subs, today)
  if (!totals) return null
  return (
    <section className="card">
      <h2 className="section-title mb-1">All {subs.length} vendors</h2>
      <MoneyRow label="Owed to you" amount={totals.credit} strong tone="good" />
      <MoneyRow label="Next month's bills" amount={totals.dueNextMonth} />
      <LedgerRow label="Delivered this month" value={`${totals.delivered} of ${totals.billable}`} />
    </section>
  )
}

function VendorToday({ sub, today, multi }: { sub: Subscription; today: string; multi: boolean }) {
  const { months, current, isLoading, error } = useMonthsWithCurrent(sub.id)
  return (
    <div className="space-y-4">
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
  const st = data.statement
  const next = projectNextMonth(st.closing_credit, Number(sub.monthly_fee), sub.carry_forward_enabled)
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
      <Tingkat vendorName={sub.vendor_name}>
        {todays.length === 0 ? (
          <EmptyTier>No delivery on {formatDay(today, 'EEEE')}s.</EmptyTier>
        ) : (
          todays.map((m, i) => (
            <TingkatTier
              key={m.id}
              index={i}
              meal={m}
              credit={mealCredit(billingMeal(m), ctx)}
              locked={locked}
              autoDeliver={sub.auto_mark_delivered}
              pastDue={isPastDueTime(m, new Date())}
              onMark={(s) => mark(m, s)}
            />
          ))
        )}
      </Tingkat>

      <section className="card">
        <h2 className="section-title mb-1">{formatPeriod(month.period)}</h2>
        <MoneyRow label="Owed to you" amount={st.closing_credit} strong tone="good" />
        <MoneyRow label="Next month's bill" amount={next.amount_due} />
        <LedgerRow label="Delivered so far" value={`${st.counts.delivered} of ${st.billable}`} />
        {st.outstanding > 0 && <MoneyRow label="Still unpaid this month" amount={st.outstanding} tone="bad" />}
      </section>

      {unmarked.length > 0 && (
        <button className="flex w-full items-center gap-3 rounded-xl bg-user/10 px-4 py-3 text-left text-user" onClick={() => setResolving(true)}>
          <CircleAlert className="h-5 w-5 shrink-0" />
          <span className="flex-1 font-semibold">
            {unmarked.length} past meal{unmarked.length === 1 ? '' : 's'} not marked yet
          </span>
          <ChevronRight className="h-5 w-5" />
        </button>
      )}

      {locked && (
        <p className="flex items-start gap-2 px-1 text-sm text-muted">
          <Lock className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            {formatPeriod(month.period)} is closed.{' '}
            <Link to="/summary" className="font-semibold text-brand" onClick={() => select(sub.id)}>
              Reopen it in Summary
            </Link>{' '}
            to make changes.
          </span>
        </p>
      )}

      <BottomSheet open={resolving} onClose={() => setResolving(false)} title={multi ? `Unmarked ${sub.vendor_name} meals` : 'Unmarked meals'}>
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
      <EmptyState icon={<Clock className="h-7 w-7" />} title={`Starts ${formatDay(sub.start_date, 'd MMMM')}`}>
        {sub.vendor_name} deliveries begin then.
      </EmptyState>
    )
  }

  if (latest && latest.period < thisPeriod && latest.status === 'open') {
    return (
      <div className="card space-y-3">
        <p className="font-semibold">{formatPeriod(latest.period)} is still open</p>
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
      <p className="font-semibold">{formatPeriod(thisPeriod)} isn't open yet</p>
      <p className="text-sm text-muted">
        {months.length ? 'Your last month is closed but no new month was opened.' : 'Open this month to start tracking meals.'}
      </p>
      <button className="btn-primary w-full" disabled={busy || offDays.isLoading} onClick={open}>
        Open {formatPeriod(thisPeriod)}
      </button>
    </div>
  )
}
