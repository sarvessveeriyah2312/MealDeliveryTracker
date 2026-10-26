import { describe, expect, it } from 'vitest'
import { generateMeals, type PricingSettings } from './billing'
import { buildVendorReport, reportFileName, type ReportMonthInput } from './report'

const settings: PricingSettings = { lunchValue: null, dinnerValue: null, policy: 'credit_with_notice', noticeHours: 24 }

function month(period: string, openingCredit: number, paid: number[]): ReportMonthInput {
  const meals = generateMeals(period, { mealTypes: ['lunch', 'dinner'], weekdays: [1, 2, 3, 4, 5], startDate: '2027-01-01', endDate: null, offDates: [] }).map((m) => ({
    ...m,
    cancelled_at: null,
    credit_override: null,
    note: null,
  }))
  return { period, status: 'closed', feeSnapshot: 600, openingCredit, meals, payments: paid.map((amount) => ({ paid_on: period, method: 'duitnow', amount, note: null })) }
}

describe('buildVendorReport', () => {
  it('builds per-meal rows with values, credits and notice hours', () => {
    const feb = month('2027-02-01', 0, [600])
    feb.meals[2]!.status = 'vendor_cancelled'
    feb.meals[3]!.status = 'user_cancelled' // Tue 2 Feb dinner, due 19:00 MYT = 11:00Z
    feb.meals[3]!.cancelled_at = '2027-02-01T05:00:00Z' // 30h before
    const report = buildVendorReport({ vendorName: 'Kak Ros', settings, carryForward: true, months: [feb], now: new Date('2027-03-01T00:00:00Z') })

    const m = report.months[0]!
    expect(m.title).toBe('February 2027')
    expect(m.rows).toHaveLength(40)
    expect(m.rows[2]).toMatchObject({ date: '2027-02-02', weekday: 'Tue', meal: 'Lunch', statusLabel: "They didn't deliver", value: 15, credit: 15 })
    expect(m.rows[3]).toMatchObject({ meal: 'Dinner', noticeHours: 30, credit: 15, cancelledAt: '1 Feb 2027, 13:00' })
    expect(m.statement.earned_credit).toBe(30)
    expect(m.payments[0]).toMatchObject({ method: 'DuitNow', amount: 600 })
  })

  it('sums totals across months in period order', () => {
    const report = buildVendorReport({
      vendorName: 'Kak Ros',
      settings,
      carryForward: true,
      months: [month('2027-03-01', 75, [525]), month('2027-02-01', 0, [600])],
      now: new Date(),
    })
    expect(report.months.map((m) => m.period)).toEqual(['2027-02-01', '2027-03-01'])
    expect(report.totals).toMatchObject({ fees: 1200, creditApplied: 75, amountDue: 1125, paid: 1125, outstanding: 0 })
  })

  it('names files by vendor and range', () => {
    expect(reportFileName('Kak Ros Catering', [{ period: '2027-02-01' }], 'xlsx')).toBe('MealTrack_Kak-Ros-Catering_2027-02.xlsx')
    expect(reportFileName('A&B', [{ period: '2027-02-01' }, { period: '2027-04-01' }], 'pdf')).toBe('MealTrack_A-B_2027-02_to_2027-04.pdf')
  })
})
