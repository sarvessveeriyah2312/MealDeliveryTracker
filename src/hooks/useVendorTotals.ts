import { useQueries } from '@tanstack/react-query'
import { billingMeal, pricingSettings } from '@/api/adapters'
import { listMeals, listMonths } from '@/api/months'
import { listPayments } from '@/api/payments'
import type { Subscription } from '@/api/types'
import { computeStatement, projectNextMonth } from '@/lib/billing'
import { keys } from './keys'
import { pickCurrentMonth } from './useMonthData'

/** Credit and next-month amount summed across vendors. Shares cache entries with the per-vendor hooks. */
export function useVendorTotals(subs: Subscription[], today: string) {
  const monthQs = useQueries({ queries: subs.map((s) => ({ queryKey: keys.months(s.id), queryFn: () => listMonths(s.id) })) })
  const current = monthQs.map((q) => (q.data ? pickCurrentMonth(q.data, today) : undefined))
  const ids = current.map((m) => m?.id ?? '')
  const mealQs = useQueries({ queries: ids.map((id) => ({ queryKey: keys.meals(id), queryFn: () => listMeals(id), enabled: !!id })) })
  const paymentQs = useQueries({ queries: ids.map((id) => ({ queryKey: keys.payments(id), queryFn: () => listPayments(id), enabled: !!id })) })

  let credit = 0
  let dueNextMonth = 0
  for (let i = 0; i < subs.length; i++) {
    const sub = subs[i]!
    const month = current[i]
    const meals = mealQs[i]?.data
    const payments = paymentQs[i]?.data
    if (!month || !meals || !payments) {
      if (monthQs[i]?.isLoading || mealQs[i]?.isLoading || paymentQs[i]?.isLoading) return null
      continue
    }
    const st = computeStatement({
      feeSnapshot: Number(month.fee_snapshot),
      openingCredit: Number(month.opening_credit),
      payments: payments.map((p) => Number(p.amount)),
      meals: meals.map(billingMeal),
      settings: pricingSettings(sub),
    })
    credit += st.closing_credit
    dueNextMonth += projectNextMonth(st.closing_credit, Number(sub.monthly_fee), sub.carry_forward_enabled).amount_due
  }
  return { credit, dueNextMonth }
}
