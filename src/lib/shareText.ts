import { type BillingMeal, type PricingSettings, type Statement, mealCredit, pricingContext, projectNextMonth } from './billing'
import { MEAL_LABELS } from './constants'
import { formatDay, formatPeriod } from './dates'
import { formatRM } from './money'

export interface ShareInput {
  vendorName: string
  period: string
  feeSnapshot: number
  meals: BillingMeal[]
  settings: PricingSettings
  statement: Statement
  nextMonthFee: number
  carryForwardEnabled: boolean
}

/** Plain-text month summary for pasting into WhatsApp. */
export function buildShareText(input: ShareInput): string {
  const { statement: st } = input
  const ctx = pricingContext(input.feeSnapshot, input.meals, input.settings)
  const line = (m: BillingMeal) => `• ${formatDay(m.date)} ${MEAL_LABELS[m.meal_type]} (${formatRM(mealCredit(m, ctx))})`
  const missed = input.meals.filter((m) => m.status === 'vendor_cancelled')
  const cancelled = input.meals.filter((m) => m.status === 'user_cancelled' && mealCredit(m, ctx) > 0)
  const next = projectNextMonth(st.closing_credit, input.nextMonthFee, input.carryForwardEnabled)

  const parts = [`Hi ${input.vendorName}, here's my meal summary for ${formatPeriod(input.period)}:`, '']
  if (missed.length) {
    parts.push(`Meals not delivered (${missed.length}):`, ...missed.map(line), '')
  } else {
    parts.push('All meals were delivered. Thank you!', '')
  }
  if (cancelled.length) parts.push(`Meals I cancelled in advance (${cancelled.length}):`, ...cancelled.map(line), '')
  parts.push(`Credit for this month: ${formatRM(st.earned_credit)}`)
  if (st.closing_credit - st.earned_credit > 0.004) parts.push(`Total credit carried forward: ${formatRM(st.closing_credit)}`)
  if (input.carryForwardEnabled) {
    parts.push(`Next month: ${formatRM(input.nextMonthFee)} − ${formatRM(next.credit_applied)} credit = ${formatRM(next.amount_due)}`)
    parts.push('', `I'll pay ${formatRM(next.amount_due)} for next month.`)
  }
  return parts.join('\n')
}
