// All fee and credit logic lives here. Pure functions only: no Supabase, no React, no clock reads
// (callers pass `today` / `now`). Amounts keep full precision; round2 is applied only for display
// and when a month is closed.

import { daysInPeriod, lastDayOfPeriod, mealDateTime, weekdayOf } from './dates'
import { MEAL_TYPES, type CancelPolicy, type MealStatus, type MealType } from './constants'

export function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100
}

// ---------------------------------------------------------------------------
// Meal generation

export interface ScheduleConfig {
  mealTypes: MealType[]
  weekdays: number[]
  startDate: string
  endDate: string | null
  offDates: Iterable<string>
}

export interface GeneratedMeal {
  date: string
  meal_type: MealType
  status: Extract<MealStatus, 'scheduled' | 'no_service'>
}

export function mealKey(m: { date: string; meal_type: MealType }): string {
  return `${m.date}|${m.meal_type}`
}

/** Every slot in the period on a delivery weekday, clipped to the subscription's start/end dates. */
export function generateMeals(period: string, config: ScheduleConfig): GeneratedMeal[] {
  const off = new Set(config.offDates)
  const types = MEAL_TYPES.filter((t) => config.mealTypes.includes(t))
  const meals: GeneratedMeal[] = []
  for (const date of daysInPeriod(period)) {
    if (date < config.startDate) continue
    if (config.endDate && date > config.endDate) continue
    if (!config.weekdays.includes(weekdayOf(date))) continue
    for (const meal_type of types) {
      meals.push({ date, meal_type, status: off.has(date) ? 'no_service' : 'scheduled' })
    }
  }
  return meals
}

export function isBillable(m: { status: MealStatus }): boolean {
  return m.status !== 'no_service'
}

export function billableCount(meals: { status: MealStatus }[]): number {
  return meals.filter(isBillable).length
}

/**
 * Default fee for a month: the full monthly fee, prorated by billable meals when the subscription
 * starts or ends part-way through the month.
 */
export function defaultMonthFee(monthlyFee: number, period: string, config: ScheduleConfig): number {
  const actual = billableCount(generateMeals(period, config))
  const full = billableCount(
    generateMeals(period, { ...config, startDate: period, endDate: lastDayOfPeriod(period) }),
  )
  if (full === 0 || actual === full) return actual === 0 ? 0 : monthlyFee
  return (monthlyFee * actual) / full
}

// ---------------------------------------------------------------------------
// Credit per meal

export interface BillingMeal {
  date: string
  meal_type: MealType
  status: MealStatus
  cancelled_at: string | null
  credit_override: number | null
}

export interface PricingContext {
  feeSnapshot: number
  lunchValue: number | null
  dinnerValue: number | null
  policy: CancelPolicy
  noticeHours: number
  /** Billable meals in the month (all statuses except no_service). */
  billableCount: number
}

/** What one meal is worth: credit_override > fixed per-meal value > fee ÷ billable meals. */
export function perMealValue(meal: BillingMeal, ctx: PricingContext): number {
  if (meal.credit_override != null) return meal.credit_override
  const fixed = meal.meal_type === 'lunch' ? ctx.lunchValue : ctx.dinnerValue
  if (fixed != null) return fixed
  return ctx.billableCount > 0 ? ctx.feeSnapshot / ctx.billableCount : 0
}

/** True when a user cancellation was made at least noticeHours before the meal's due time. */
export function hadEnoughNotice(meal: BillingMeal, noticeHours: number): boolean {
  if (!meal.cancelled_at) return false
  const due = mealDateTime(meal.date, meal.meal_type).getTime()
  return due - new Date(meal.cancelled_at).getTime() >= noticeHours * 3_600_000
}

export function mealCredit(meal: BillingMeal, ctx: PricingContext): number {
  switch (meal.status) {
    case 'vendor_cancelled':
      return perMealValue(meal, ctx)
    case 'user_cancelled':
      if (ctx.policy === 'full_credit') return perMealValue(meal, ctx)
      if (ctx.policy === 'credit_with_notice' && hadEnoughNotice(meal, ctx.noticeHours)) return perMealValue(meal, ctx)
      return 0
    default:
      return 0
  }
}

// ---------------------------------------------------------------------------
// Monthly statement

export interface PricingSettings {
  lunchValue: number | null
  dinnerValue: number | null
  policy: CancelPolicy
  noticeHours: number
}

export interface StatementInput {
  feeSnapshot: number
  openingCredit: number
  payments: number[]
  meals: BillingMeal[]
  settings: PricingSettings
}

export type StatusCounts = Record<MealStatus, number>

export interface Statement {
  base_fee: number
  opening_credit: number
  credit_applied: number
  amount_due: number
  paid: number
  earned_credit: number
  overpayment: number
  closing_credit: number
  outstanding: number
  counts: StatusCounts
  billable: number
  /** Derived per-meal value (fee ÷ billable), before fixed values/overrides. */
  derived_meal_value: number
}

export function pricingContext(feeSnapshot: number, meals: { status: MealStatus }[], settings: PricingSettings): PricingContext {
  return { feeSnapshot, ...settings, billableCount: billableCount(meals) }
}

export function countStatuses(meals: { status: MealStatus }[]): StatusCounts {
  const counts: StatusCounts = { scheduled: 0, delivered: 0, vendor_cancelled: 0, user_cancelled: 0, no_service: 0 }
  for (const m of meals) counts[m.status]++
  return counts
}

export function computeStatement(input: StatementInput): Statement {
  const ctx = pricingContext(input.feeSnapshot, input.meals, input.settings)
  const base_fee = input.feeSnapshot
  const opening_credit = input.openingCredit
  const credit_applied = Math.min(opening_credit, base_fee)
  const amount_due = base_fee - credit_applied
  const paid = input.payments.reduce((a, b) => a + b, 0)
  const earned_credit = input.meals.reduce((sum, m) => sum + mealCredit(m, ctx), 0)
  const overpayment = Math.max(paid - amount_due, 0)
  const closing_credit = opening_credit - credit_applied + earned_credit + overpayment
  const outstanding = Math.max(amount_due - paid, 0)
  return {
    base_fee,
    opening_credit,
    credit_applied,
    amount_due,
    paid,
    earned_credit,
    overpayment,
    closing_credit,
    outstanding,
    counts: countStatuses(input.meals),
    billable: ctx.billableCount,
    derived_meal_value: ctx.billableCount > 0 ? base_fee / ctx.billableCount : 0,
  }
}

/** Opening credit for the month after one that closed with `closingCredit`. */
export function nextOpeningCredit(closingCredit: number, carryForwardEnabled: boolean): number {
  return carryForwardEnabled ? round2(closingCredit) : 0
}

/** What next month will cost given the credit carried into it. */
export function projectNextMonth(closingCredit: number, nextFee: number, carryForwardEnabled: boolean) {
  const opening = carryForwardEnabled ? closingCredit : 0
  const credit_applied = Math.min(opening, nextFee)
  return { opening_credit: opening, credit_applied, amount_due: nextFee - credit_applied, carried_again: opening - credit_applied }
}

// ---------------------------------------------------------------------------
// Closing / reopening chain

export interface ChainMonth {
  id: string
  status: 'open' | 'closed'
  feeSnapshot: number
  openingCredit: number
  payments: number[]
  meals: BillingMeal[]
}

export interface ChainResult {
  id: string
  opening_credit: number
  closing_credit: number | null
}

/**
 * Recomputes opening/closing credit for consecutive months (oldest first) after an earlier month
 * changed. The first month keeps its own opening credit; each later one inherits the previous
 * closing credit. The chain stops at the first open month, which gets a new opening credit only.
 */
export function cascadeClosingCredits(months: ChainMonth[], settings: PricingSettings, carryForwardEnabled: boolean): ChainResult[] {
  const results: ChainResult[] = []
  let carried: number | null = null
  for (const m of months) {
    const opening_credit: number = carried === null ? m.openingCredit : carried
    if (m.status === 'open') {
      results.push({ id: m.id, opening_credit, closing_credit: null })
      break
    }
    const st = computeStatement({ feeSnapshot: m.feeSnapshot, openingCredit: opening_credit, payments: m.payments, meals: m.meals, settings })
    const closing_credit = round2(st.closing_credit)
    results.push({ id: m.id, opening_credit, closing_credit })
    carried = nextOpeningCredit(closing_credit, carryForwardEnabled)
  }
  return results
}

// ---------------------------------------------------------------------------
// Review & regeneration

/** Past meals nobody has marked yet; these must be resolved before a month can close. */
export function unmarkedPastMeals<T extends { date: string; status: MealStatus }>(meals: T[], today: string): T[] {
  return meals.filter((m) => m.status === 'scheduled' && m.date < today)
}

/** Whether a meal's due time (lunch 12:00 / dinner 19:00 MYT) has passed. */
export function isPastDueTime(meal: { date: string; meal_type: MealType }, now: Date): boolean {
  return mealDateTime(meal.date, meal.meal_type).getTime() <= now.getTime()
}

/** Unmarked meals whose time has passed; with auto-mark on, these become delivered. */
export function mealsDueForAutoDelivery<T extends { date: string; meal_type: MealType; status: MealStatus }>(meals: T[], now: Date): T[] {
  return meals.filter((m) => m.status === 'scheduled' && isPastDueTime(m, now))
}

export interface ExistingMeal {
  id: string
  date: string
  meal_type: MealType
  status: MealStatus
}

export interface RegenerationPlan<T extends ExistingMeal> {
  toAdd: GeneratedMeal[]
  toRemove: T[]
  toUpdate: { meal: T; status: GeneratedMeal['status'] }[]
}

/**
 * Diff between what's in an open month and what the new schedule would generate. Only meals dated
 * after `today` that are still system-generated (scheduled / no_service) are touched; anything past,
 * today, or already marked is left alone.
 */
export function planRegeneration<T extends ExistingMeal>(existing: T[], period: string, config: ScheduleConfig, today: string): RegenerationPlan<T> {
  const desired = new Map(generateMeals(period, config).filter((m) => m.date > today).map((m) => [mealKey(m), m]))
  const existingByKey = new Map(existing.map((m) => [mealKey(m), m]))
  const plan: RegenerationPlan<T> = { toAdd: [], toRemove: [], toUpdate: [] }

  for (const m of existing) {
    if (m.date <= today) continue
    if (m.status !== 'scheduled' && m.status !== 'no_service') continue
    const want = desired.get(mealKey(m))
    if (!want) plan.toRemove.push(m)
    else if (want.status !== m.status) plan.toUpdate.push({ meal: m, status: want.status })
  }
  for (const [key, m] of desired) {
    if (!existingByKey.has(key)) plan.toAdd.push(m)
  }
  return plan
}

export function isEmptyPlan(plan: RegenerationPlan<ExistingMeal>): boolean {
  return plan.toAdd.length + plan.toRemove.length + plan.toUpdate.length === 0
}

/** Status changes needed after the off-day list changed; only unmarked meals are affected. */
export function offDayChanges<T extends ExistingMeal>(meals: T[], offDates: Iterable<string>): { meal: T; status: GeneratedMeal['status'] }[] {
  const off = new Set(offDates)
  const changes: { meal: T; status: GeneratedMeal['status'] }[] = []
  for (const m of meals) {
    if (m.status === 'scheduled' && off.has(m.date)) changes.push({ meal: m, status: 'no_service' })
    else if (m.status === 'no_service' && !off.has(m.date)) changes.push({ meal: m, status: 'scheduled' })
  }
  return changes
}
