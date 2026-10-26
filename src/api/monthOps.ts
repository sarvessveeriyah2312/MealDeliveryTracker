import {
  type ChainMonth,
  type RegenerationPlan,
  cascadeClosingCredits,
  defaultMonthFee,
  generateMeals,
  nextOpeningCredit,
  offDayChanges,
} from '@/lib/billing'
import { addMonths, periodOf } from '@/lib/dates'
import { billingMeal, pricingSettings, scheduleConfig } from './adapters'
import { deleteMeals, insertMeals, updateMeals } from './meals'
import { insertMonthWithMeals, listMeals, updateMonth } from './months'
import { listPayments } from './payments'
import type { Meal, Month, OffDay, Subscription } from './types'

// Multi-step month workflows. All money math is delegated to billing.ts; this file only sequences
// reads and writes.

export function suggestedFee(sub: Subscription, period: string, offDays: OffDay[]): number {
  return defaultMonthFee(Number(sub.monthly_fee), period, scheduleConfig(sub, offDays))
}

export async function openMonth(args: {
  sub: Subscription
  period: string
  openingCredit: number
  offDays: OffDay[]
  fee?: number
}): Promise<Month> {
  const { sub, period, offDays } = args
  const meals = generateMeals(period, scheduleConfig(sub, offDays))
  return insertMonthWithMeals(
    {
      subscription_id: sub.id,
      period,
      fee_snapshot: args.fee ?? suggestedFee(sub, period, offDays),
      meal_types_snapshot: sub.meal_types,
      weekdays_snapshot: sub.delivery_weekdays,
      opening_credit: args.openingCredit,
      status: 'open',
    },
    meals,
  )
}

async function loadChainMonth(m: Month, statusOverride?: Month['status']): Promise<ChainMonth> {
  const [meals, payments] = await Promise.all([listMeals(m.id), listPayments(m.id)])
  return {
    id: m.id,
    status: statusOverride ?? m.status,
    feeSnapshot: Number(m.fee_snapshot),
    openingCredit: Number(m.opening_credit),
    payments: payments.map((p) => Number(p.amount)),
    meals: meals.map(billingMeal),
  }
}

/**
 * Closes `month`, recalculates every later month's carried credit (in case this is a re-close
 * after a reopen), and opens the following month if it doesn't exist yet.
 */
export async function closeMonth(args: { sub: Subscription; month: Month; allMonths: Month[]; offDays: OffDay[] }): Promise<void> {
  const { sub, month, allMonths, offDays } = args
  const later = allMonths.filter((m) => m.period > month.period).sort((a, b) => a.period.localeCompare(b.period))
  const chain = await Promise.all([loadChainMonth(month, 'closed'), ...later.map((m) => loadChainMonth(m))])
  const results = cascadeClosingCredits(chain, pricingSettings(sub), sub.carry_forward_enabled)

  const closedAt = new Date().toISOString()
  for (const r of results) {
    const isTarget = r.id === month.id
    await updateMonth(r.id, {
      opening_credit: r.opening_credit,
      ...(r.closing_credit != null ? { closing_credit: r.closing_credit } : {}),
      ...(isTarget ? { status: 'closed', closed_at: closedAt } : {}),
    })
  }

  const nextPeriod = addMonths(month.period, 1)
  const endsBefore = sub.end_date != null && periodOf(sub.end_date) < nextPeriod
  if (!later.some((m) => m.period === nextPeriod) && sub.is_active && !endsBefore) {
    const closing = results[0]?.closing_credit ?? 0
    await openMonth({ sub, period: nextPeriod, openingCredit: nextOpeningCredit(closing, sub.carry_forward_enabled), offDays })
  }
}

export async function reopenMonth(month: Month): Promise<void> {
  await updateMonth(month.id, { status: 'open', closed_at: null })
}

export async function resolveMeals(ids: string[], status: Meal['status']): Promise<void> {
  await updateMeals(ids, { status, cancelled_at: status === 'user_cancelled' ? new Date().toISOString() : null })
}

export async function applyRegeneration(args: {
  month: Month
  sub: Pick<Subscription, 'meal_types' | 'delivery_weekdays'>
  plan: RegenerationPlan<Meal>
}): Promise<void> {
  const { month, plan } = args
  await deleteMeals(plan.toRemove.map((m) => m.id))
  await insertMeals(plan.toAdd.map((m) => ({ ...m, subscription_month_id: month.id })))
  for (const status of ['scheduled', 'no_service'] as const) {
    await updateMeals(plan.toUpdate.filter((u) => u.status === status).map((u) => u.meal.id), { status })
  }
  await updateMonth(month.id, { meal_types_snapshot: args.sub.meal_types, weekdays_snapshot: args.sub.delivery_weekdays })
}

/** Re-syncs no_service flags in every open month after the off-day list changed. */
export async function syncOffDays(openMonths: Month[], offDays: OffDay[]): Promise<void> {
  const dates = offDays.map((d) => d.date)
  for (const month of openMonths) {
    const changes = offDayChanges(await listMeals(month.id), dates)
    for (const status of ['scheduled', 'no_service'] as const) {
      await updateMeals(changes.filter((c) => c.status === status).map((c) => c.meal.id), { status })
    }
  }
}
