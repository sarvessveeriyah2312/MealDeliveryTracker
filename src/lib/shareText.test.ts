import { describe, expect, it } from 'vitest'
import { computeStatement, generateMeals, type BillingMeal, type PricingSettings } from './billing'
import { buildShareText } from './shareText'

const settings: PricingSettings = { lunchValue: null, dinnerValue: null, policy: 'credit_with_notice', noticeHours: 24 }

describe('buildShareText', () => {
  it('lists missed meals, credit and next month amount', () => {
    const meals: BillingMeal[] = generateMeals('2027-02-01', {
      mealTypes: ['lunch', 'dinner'],
      weekdays: [1, 2, 3, 4, 5],
      startDate: '2027-01-01',
      endDate: null,
      offDates: [],
    }).map((m) => ({ ...m, cancelled_at: null, credit_override: null }))
    meals[2]!.status = 'vendor_cancelled'
    const statement = computeStatement({ feeSnapshot: 600, openingCredit: 0, payments: [600], meals, settings })
    const text = buildShareText({
      vendorName: 'Kak Ros',
      period: '2027-02-01',
      feeSnapshot: 600,
      meals,
      settings,
      statement,
      nextMonthFee: 600,
      carryForwardEnabled: true,
    })
    expect(text).toContain('February 2027')
    expect(text).toContain('Meals not delivered (1)')
    expect(text).toContain('Tue 2 Feb Lunch')
    expect(text).toMatch(/I'll pay RM\s?585\.00/)
  })
})
