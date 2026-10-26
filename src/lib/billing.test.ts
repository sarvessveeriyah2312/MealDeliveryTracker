import { describe, expect, it } from 'vitest'
import {
  type BillingMeal,
  type PricingSettings,
  type ScheduleConfig,
  cascadeClosingCredits,
  computeStatement,
  defaultMonthFee,
  generateMeals,
  mealsDueForAutoDelivery,
  mealCredit,
  nextOpeningCredit,
  offDayChanges,
  planRegeneration,
  pricingContext,
  projectNextMonth,
  round2,
  unmarkedPastMeals,
} from './billing'
import type { MealStatus, MealType } from './constants'

// February 2027 starts on a Monday and has exactly 20 weekdays.
const FEB = '2027-02-01'
const MAR = '2027-03-01'

const monFri: ScheduleConfig = {
  mealTypes: ['lunch', 'dinner'],
  weekdays: [1, 2, 3, 4, 5],
  startDate: '2027-01-01',
  endDate: null,
  offDates: [],
}

const withNotice: PricingSettings = { lunchValue: null, dinnerValue: null, policy: 'credit_with_notice', noticeHours: 24 }

function toBilling(meals: { date: string; meal_type: MealType; status: MealStatus }[]): BillingMeal[] {
  return meals.map((m) => ({ ...m, cancelled_at: null, credit_override: null }))
}

function mark(meals: BillingMeal[], date: string, meal_type: MealType, patch: Partial<BillingMeal>) {
  const m = meals.find((x) => x.date === date && x.meal_type === meal_type)
  if (!m) throw new Error(`no meal ${date} ${meal_type}`)
  Object.assign(m, patch)
}

describe('generateMeals', () => {
  it('creates a lunch and dinner for every delivery weekday', () => {
    const meals = generateMeals(FEB, monFri)
    expect(meals).toHaveLength(40)
    expect(new Set(meals.map((m) => m.date)).size).toBe(20)
    expect(meals.every((m) => m.status === 'scheduled')).toBe(true)
  })

  it('marks off days as no_service', () => {
    const meals = generateMeals(FEB, { ...monFri, offDates: ['2027-02-08'] })
    expect(meals.filter((m) => m.status === 'no_service').map((m) => m.meal_type)).toEqual(['lunch', 'dinner'])
  })

  it('respects the subscription end date', () => {
    const meals = generateMeals(FEB, { ...monFri, endDate: '2027-02-05' })
    expect(meals).toHaveLength(10)
  })
})

describe('required scenarios', () => {
  it('Mon–Fri, RM600, 3 vendor cancels + 2 noticed user cancels → RM75 earned, RM525 due next month', () => {
    const meals = toBilling(generateMeals(FEB, monFri))
    const ctx = pricingContext(600, meals, withNotice)
    expect(ctx.feeSnapshot / ctx.billableCount).toBe(15)

    mark(meals, '2027-02-02', 'lunch', { status: 'vendor_cancelled' })
    mark(meals, '2027-02-03', 'dinner', { status: 'vendor_cancelled' })
    mark(meals, '2027-02-04', 'lunch', { status: 'vendor_cancelled' })
    // Cancelled two days ahead → enough notice.
    mark(meals, '2027-02-10', 'lunch', { status: 'user_cancelled', cancelled_at: '2027-02-08T04:00:00Z' })
    mark(meals, '2027-02-10', 'dinner', { status: 'user_cancelled', cancelled_at: '2027-02-08T04:00:00Z' })

    const feb = computeStatement({ feeSnapshot: 600, openingCredit: 0, payments: [600], meals, settings: withNotice })
    expect(feb.earned_credit).toBe(75)
    expect(feb.amount_due).toBe(600)
    expect(feb.overpayment).toBe(0)
    expect(round2(feb.closing_credit)).toBe(75)

    const mar = computeStatement({
      feeSnapshot: 600,
      openingCredit: nextOpeningCredit(feb.closing_credit, true),
      payments: [],
      meals: toBilling(generateMeals(MAR, monFri)),
      settings: withNotice,
    })
    expect(mar.credit_applied).toBe(75)
    expect(mar.amount_due).toBe(525)
    expect(mar.outstanding).toBe(525)
  })

  it('user cancel with less notice than notice_hours under credit_with_notice → RM0', () => {
    const meals = toBilling(generateMeals(FEB, monFri))
    // Lunch 2027-02-10 12:00 MYT = 04:00Z; cancelling at 2027-02-09T20:00Z is only 8h before.
    mark(meals, '2027-02-10', 'lunch', { status: 'user_cancelled', cancelled_at: '2027-02-09T20:00:00Z' })
    const ctx = pricingContext(600, meals, withNotice)
    const meal = meals.find((m) => m.status === 'user_cancelled')!
    expect(mealCredit(meal, ctx)).toBe(0)
  })

  it('counts exactly notice_hours as enough notice', () => {
    const meals = toBilling(generateMeals(FEB, monFri))
    mark(meals, '2027-02-10', 'lunch', { status: 'user_cancelled', cancelled_at: '2027-02-09T04:00:00Z' })
    const meal = meals.find((m) => m.status === 'user_cancelled')!
    expect(mealCredit(meal, pricingContext(600, meals, withNotice))).toBe(15)
  })

  it('off days reduce billable meals and raise the per-meal value', () => {
    const meals = toBilling(generateMeals(FEB, { ...monFri, offDates: ['2027-02-01', '2027-02-02', '2027-02-03', '2027-02-04'] }))
    const st = computeStatement({ feeSnapshot: 600, openingCredit: 0, payments: [], meals, settings: withNotice })
    expect(st.billable).toBe(32)
    expect(st.derived_meal_value).toBe(18.75)
    expect(st.counts.no_service).toBe(8)
  })

  it('credit larger than next month fee → amount_due 0 and the remainder carries again', () => {
    const meals = toBilling(generateMeals(MAR, monFri))
    const st = computeStatement({ feeSnapshot: 600, openingCredit: 700, payments: [], meals, settings: withNotice })
    expect(st.credit_applied).toBe(600)
    expect(st.amount_due).toBe(0)
    expect(st.outstanding).toBe(0)
    expect(st.closing_credit).toBe(100)
    expect(projectNextMonth(st.closing_credit, 600, true)).toMatchObject({ amount_due: 500, carried_again: 0 })
  })

  it('fixed lunch_value / dinner_value override the derived value', () => {
    const settings: PricingSettings = { ...withNotice, lunchValue: 12, dinnerValue: 18 }
    const meals = toBilling(generateMeals(FEB, monFri))
    mark(meals, '2027-02-02', 'lunch', { status: 'vendor_cancelled' })
    mark(meals, '2027-02-02', 'dinner', { status: 'vendor_cancelled' })
    const st = computeStatement({ feeSnapshot: 600, openingCredit: 0, payments: [], meals, settings })
    expect(st.earned_credit).toBe(30)
  })

  it('credit_override wins over fixed and derived values', () => {
    const settings: PricingSettings = { ...withNotice, lunchValue: 12, dinnerValue: 18 }
    const meals = toBilling(generateMeals(FEB, monFri))
    mark(meals, '2027-02-02', 'lunch', { status: 'vendor_cancelled', credit_override: 20 })
    const st = computeStatement({ feeSnapshot: 600, openingCredit: 0, payments: [], meals, settings })
    expect(st.earned_credit).toBe(20)
  })

  it('partial month: subscription starting on the 15th prorates the fee and keeps RM15/meal', () => {
    const config = { ...monFri, startDate: '2027-02-15' }
    const meals = generateMeals(FEB, config)
    expect(meals).toHaveLength(20)
    expect(meals[0]!.date).toBe('2027-02-15')
    const fee = defaultMonthFee(600, FEB, config)
    expect(fee).toBe(300)
    const st = computeStatement({ feeSnapshot: fee, openingCredit: 0, payments: [], meals: toBilling(meals), settings: withNotice })
    expect(st.derived_meal_value).toBe(15)
  })

  it('full months are not prorated', () => {
    expect(defaultMonthFee(600, FEB, monFri)).toBe(600)
  })
})

describe('cancel policies', () => {
  const meals = toBilling(generateMeals(FEB, monFri))
  mark(meals, '2027-02-10', 'lunch', { status: 'user_cancelled', cancelled_at: '2027-02-10T03:00:00Z' })
  const meal = meals.find((m) => m.status === 'user_cancelled')!

  it('full_credit gives credit regardless of notice', () => {
    expect(mealCredit(meal, pricingContext(600, meals, { ...withNotice, policy: 'full_credit' }))).toBe(15)
  })

  it('no_credit gives nothing', () => {
    expect(mealCredit(meal, pricingContext(600, meals, { ...withNotice, policy: 'no_credit', noticeHours: 0 }))).toBe(0)
  })

  it('delivered, scheduled and no_service never earn credit', () => {
    const ctx = pricingContext(600, meals, withNotice)
    for (const status of ['delivered', 'scheduled', 'no_service'] as const) {
      expect(mealCredit({ ...meal, status }, ctx)).toBe(0)
    }
  })
})

describe('statement math', () => {
  it('overpayment becomes credit', () => {
    const st = computeStatement({ feeSnapshot: 600, openingCredit: 0, payments: [400, 250], meals: [], settings: withNotice })
    expect(st.paid).toBe(650)
    expect(st.overpayment).toBe(50)
    expect(st.closing_credit).toBe(50)
    expect(st.outstanding).toBe(0)
  })

  it('keeps full precision until rounding at close', () => {
    // 600 / 38 meals = 15.789473…; three credits = 47.368…
    const meals = toBilling(generateMeals(FEB, { ...monFri, offDates: ['2027-02-01'] }))
    mark(meals, '2027-02-02', 'lunch', { status: 'vendor_cancelled' })
    mark(meals, '2027-02-03', 'lunch', { status: 'vendor_cancelled' })
    mark(meals, '2027-02-04', 'lunch', { status: 'vendor_cancelled' })
    const st = computeStatement({ feeSnapshot: 600, openingCredit: 0, payments: [600], meals, settings: withNotice })
    expect(st.earned_credit).toBeCloseTo((600 / 38) * 3, 10)
    expect(round2(st.closing_credit)).toBe(47.37)
  })

  it('carry forward disabled → next month opens with 0', () => {
    expect(nextOpeningCredit(75, false)).toBe(0)
    expect(projectNextMonth(75, 600, false).amount_due).toBe(600)
  })
})

describe('cascadeClosingCredits', () => {
  it('re-closing an earlier month pushes the new credit through later closed months', () => {
    const febMeals = toBilling(generateMeals(FEB, monFri))
    mark(febMeals, '2027-02-02', 'lunch', { status: 'vendor_cancelled' })
    mark(febMeals, '2027-02-03', 'lunch', { status: 'vendor_cancelled' })
    const marMeals = toBilling(generateMeals(MAR, monFri))
    const result = cascadeClosingCredits(
      [
        { id: 'feb', status: 'closed', feeSnapshot: 600, openingCredit: 0, payments: [600], meals: febMeals },
        // March was closed when Feb's credit was 15; it paid 585.
        { id: 'mar', status: 'closed', feeSnapshot: 600, openingCredit: 15, payments: [585], meals: marMeals },
        { id: 'apr', status: 'open', feeSnapshot: 600, openingCredit: 0, payments: [], meals: [] },
        { id: 'may', status: 'open', feeSnapshot: 600, openingCredit: 0, payments: [], meals: [] },
      ],
      withNotice,
      true,
    )
    expect(result).toEqual([
      { id: 'feb', opening_credit: 0, closing_credit: 30 },
      // amount_due 570, paid 585 → 15 overpaid becomes credit.
      { id: 'mar', opening_credit: 30, closing_credit: 15 },
      { id: 'apr', opening_credit: 15, closing_credit: null },
    ])
  })
})

describe('review & regeneration', () => {
  const existing = generateMeals(FEB, monFri).map((m, i) => ({ ...m, id: String(i), status: m.status as MealStatus }))

  it('lists only past unmarked meals', () => {
    const meals = existing.map((m) => (m.date === '2027-02-02' ? { ...m, status: 'delivered' as const } : m))
    const unmarked = unmarkedPastMeals(meals, '2027-02-04')
    expect(unmarked.map((m) => m.date)).toEqual(['2027-02-01', '2027-02-01', '2027-02-03', '2027-02-03'])
  })

  it('dropping dinner only removes future scheduled dinners', () => {
    const meals = existing.map((m) => ({ ...m }))
    meals.find((m) => m.date === '2027-02-22' && m.meal_type === 'dinner')!.status = 'user_cancelled'
    const plan = planRegeneration(meals, FEB, { ...monFri, mealTypes: ['lunch'] }, '2027-02-15')
    expect(plan.toAdd).toEqual([])
    expect(plan.toRemove.every((m) => m.meal_type === 'dinner' && m.date > '2027-02-15')).toBe(true)
    // 16th–26th = 9 weekdays after today, minus the already-marked 22nd.
    expect(plan.toRemove).toHaveLength(8)
  })

  it('adding Saturday adds future Saturdays only', () => {
    const plan = planRegeneration(existing, FEB, { ...monFri, weekdays: [1, 2, 3, 4, 5, 6] }, '2027-02-15')
    expect(plan.toAdd.map((m) => m.date)).toEqual(['2027-02-20', '2027-02-20', '2027-02-27', '2027-02-27'])
    expect(plan.toRemove).toEqual([])
  })

  it('off-day changes flip only unmarked meals', () => {
    const meals = existing.slice(0, 4)
    meals[1] = { ...meals[1]!, status: 'delivered' }
    const changes = offDayChanges(meals, ['2027-02-01'])
    expect(changes.map((c) => [c.meal.id, c.status])).toEqual([['0', 'no_service']])
    expect(offDayChanges([{ ...meals[0]!, status: 'no_service' }], [])).toEqual([{ meal: { ...meals[0]!, status: 'no_service' }, status: 'scheduled' }])
  })
})

describe('mealsDueForAutoDelivery', () => {
  const day = generateMeals(FEB, monFri)
    .filter((m) => m.date === '2027-02-10')
    .map((m) => ({ ...m, status: m.status as MealStatus }))

  it('picks up lunch only after 12:00 MYT and dinner only after 19:00 MYT', () => {
    expect(mealsDueForAutoDelivery(day, new Date('2027-02-10T03:59:00Z'))).toEqual([]) // 11:59 MYT
    expect(mealsDueForAutoDelivery(day, new Date('2027-02-10T04:00:00Z')).map((m) => m.meal_type)).toEqual(['lunch'])
    expect(mealsDueForAutoDelivery(day, new Date('2027-02-10T11:00:00Z')).map((m) => m.meal_type)).toEqual(['lunch', 'dinner'])
  })

  it('never touches meals the user already marked', () => {
    const marked = day.map((m, i) => ({ ...m, status: (i === 0 ? 'user_cancelled' : 'vendor_cancelled') as MealStatus }))
    expect(mealsDueForAutoDelivery(marked, new Date('2027-02-11T00:00:00Z'))).toEqual([])
  })
})
