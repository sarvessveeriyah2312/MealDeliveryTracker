// Turns a vendor's months into a report model (rows + totals) that the Excel and PDF exporters
// render. All numbers come from billing.ts so exports always match the app.

import {
  type BillingMeal,
  type PricingSettings,
  type Statement,
  computeStatement,
  mealCredit,
  perMealValue,
  pricingContext,
} from './billing'
import { MEAL_LABELS, POLICY_LABELS, STATUS_LABELS, type MealStatus } from './constants'
import { formatDay, formatInstant, formatPeriod, mealDateTime } from './dates'

export interface ReportMealRow {
  date: string
  weekday: string
  meal: string
  status: MealStatus
  statusLabel: string
  cancelledAt: string | null
  /** Hours between cancelling and the meal time (user cancellations only). */
  noticeHours: number | null
  /** What the meal is worth; null for no-service meals, which aren't billed. */
  value: number | null
  credit: number
  note: string
}

export interface ReportPayment {
  date: string
  method: string
  amount: number
  note: string
}

export interface MonthReport {
  period: string
  title: string
  status: 'open' | 'closed'
  statement: Statement
  rows: ReportMealRow[]
  payments: ReportPayment[]
}

export interface VendorReport {
  vendorName: string
  generatedAt: string
  terms: { label: string; value: string }[]
  months: MonthReport[]
  totals: { fees: number; creditApplied: number; amountDue: number; paid: number; outstanding: number; earned: number }
}

export interface ReportMonthInput {
  period: string
  status: 'open' | 'closed'
  feeSnapshot: number
  openingCredit: number
  meals: (BillingMeal & { note: string | null })[]
  payments: { paid_on: string; method: string; amount: number; note: string | null }[]
}

const METHOD_LABELS: Record<string, string> = { bank_transfer: 'Bank transfer', duitnow: 'DuitNow', cash: 'Cash', other: 'Other' }

export function buildMonthReport(input: ReportMonthInput, settings: PricingSettings): MonthReport {
  const ctx = pricingContext(input.feeSnapshot, input.meals, settings)
  const statement = computeStatement({
    feeSnapshot: input.feeSnapshot,
    openingCredit: input.openingCredit,
    payments: input.payments.map((p) => p.amount),
    meals: input.meals,
    settings,
  })
  const rows = [...input.meals]
    .sort((a, b) => a.date.localeCompare(b.date) || (a.meal_type === 'lunch' ? -1 : 1))
    .map(
      (m): ReportMealRow => ({
        date: m.date,
        weekday: formatDay(m.date, 'EEE'),
        meal: MEAL_LABELS[m.meal_type],
        status: m.status,
        statusLabel: STATUS_LABELS[m.status],
        cancelledAt: m.status === 'user_cancelled' && m.cancelled_at ? formatInstant(m.cancelled_at, 'd MMM yyyy, HH:mm') : null,
        noticeHours:
          m.status === 'user_cancelled' && m.cancelled_at
            ? (mealDateTime(m.date, m.meal_type).getTime() - new Date(m.cancelled_at).getTime()) / 3_600_000
            : null,
        value: m.status === 'no_service' ? null : perMealValue(m, ctx),
        credit: mealCredit(m, ctx),
        note: m.note ?? '',
      }),
    )
  const payments = [...input.payments]
    .sort((a, b) => a.paid_on.localeCompare(b.paid_on))
    .map((p) => ({ date: p.paid_on, method: METHOD_LABELS[p.method] ?? p.method, amount: p.amount, note: p.note ?? '' }))
  return { period: input.period, title: formatPeriod(input.period), status: input.status, statement, rows, payments }
}

export function buildVendorReport(args: {
  vendorName: string
  settings: PricingSettings
  carryForward: boolean
  months: ReportMonthInput[]
  now: Date
}): VendorReport {
  const months = [...args.months].sort((a, b) => a.period.localeCompare(b.period)).map((m) => buildMonthReport(m, args.settings))
  const sum = (f: (s: Statement) => number) => months.reduce((t, m) => t + f(m.statement), 0)
  const s = args.settings
  return {
    vendorName: args.vendorName,
    generatedAt: formatInstant(args.now.toISOString(), 'd MMM yyyy, HH:mm'),
    terms: [
      { label: 'Cancel policy', value: s.policy === 'credit_with_notice' ? `${POLICY_LABELS[s.policy]} (${s.noticeHours}h)` : POLICY_LABELS[s.policy] },
      { label: 'Meal value', value: s.lunchValue != null || s.dinnerValue != null ? `Lunch ${s.lunchValue ?? 'auto'} / Dinner ${s.dinnerValue ?? 'auto'}` : 'Fee ÷ billable meals' },
      { label: 'Carry forward', value: args.carryForward ? 'On' : 'Off' },
    ],
    months,
    totals: {
      fees: sum((x) => x.base_fee),
      creditApplied: sum((x) => x.credit_applied),
      amountDue: sum((x) => x.amount_due),
      paid: sum((x) => x.paid),
      outstanding: sum((x) => x.outstanding),
      earned: sum((x) => x.earned_credit),
    },
  }
}

export function reportFileName(vendorName: string, months: { period: string }[], ext: 'xlsx' | 'pdf'): string {
  const slug = vendorName.replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-|-$/g, '') || 'vendor'
  const first = months[0]?.period.slice(0, 7) ?? ''
  const last = months[months.length - 1]?.period.slice(0, 7) ?? ''
  return `MealTrack_${slug}_${first === last ? first : `${first}_to_${last}`}.${ext}`
}
