import { useMemo } from 'react'
import { billingMeal, pricingSettings } from '@/api/adapters'
import type { Month, Subscription } from '@/api/types'
import { computeStatement, pricingContext } from '@/lib/billing'
import { periodOf, todayLocal } from '@/lib/dates'
import { useMeals, useMonths, usePayments } from './queries'

/** The month containing today, else the latest month on record. */
export function pickCurrentMonth(months: Month[], today: string): Month | undefined {
  return months.find((m) => m.period === periodOf(today)) ?? months[months.length - 1]
}

/** Meals, payments, and the statement for one month, computed via billing.ts. */
export function useMonthData(sub: Subscription, month: Month | undefined) {
  const meals = useMeals(month?.id)
  const payments = usePayments(month?.id)

  const derived = useMemo(() => {
    if (!month || !meals.data || !payments.data) return null
    const settings = pricingSettings(sub)
    const billingMeals = meals.data.map(billingMeal)
    const statement = computeStatement({
      feeSnapshot: Number(month.fee_snapshot),
      openingCredit: Number(month.opening_credit),
      payments: payments.data.map((p) => Number(p.amount)),
      meals: billingMeals,
      settings,
    })
    return { settings, billingMeals, statement, ctx: pricingContext(Number(month.fee_snapshot), billingMeals, settings) }
  }, [sub, month, meals.data, payments.data])

  return {
    meals: meals.data ?? [],
    payments: payments.data ?? [],
    isLoading: meals.isLoading || payments.isLoading,
    error: meals.error ?? payments.error,
    ...derived,
  }
}

export function useMonthsWithCurrent(subId: string) {
  const months = useMonths(subId)
  const today = todayLocal()
  const list = months.data ?? []
  return { ...months, months: list, current: pickCurrentMonth(list, today), today }
}
