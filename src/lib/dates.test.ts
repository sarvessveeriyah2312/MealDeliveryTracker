import { describe, expect, it } from 'vitest'
import { addMonths, daysInPeriod, eachDay, lastDayOfPeriod, mealDateTime, periodOf, todayLocal, toLocalDate, weekdayOf } from './dates'

describe('timezone', () => {
  it('a meal logged at 23:30 MYT lands on the local date, not the UTC one', () => {
    // 2027-02-01 23:30 MYT = 2027-02-01T15:30Z
    expect(toLocalDate('2027-02-01T15:30:00Z')).toBe('2027-02-01')
    // 00:30 MYT on the 2nd is still the 1st in UTC
    expect(toLocalDate('2027-02-01T16:30:00Z')).toBe('2027-02-02')
    expect(todayLocal(new Date('2027-02-01T16:30:00Z'))).toBe('2027-02-02')
  })

  it('meal due times are in MYT', () => {
    expect(mealDateTime('2027-02-10', 'lunch').toISOString()).toBe('2027-02-10T04:00:00.000Z')
    expect(mealDateTime('2027-02-10', 'dinner').toISOString()).toBe('2027-02-10T11:00:00.000Z')
  })
})

describe('calendar helpers', () => {
  it('handles month boundaries', () => {
    expect(periodOf('2027-02-17')).toBe('2027-02-01')
    expect(addMonths('2027-12-01', 1)).toBe('2028-01-01')
    expect(addMonths('2027-01-01', -1)).toBe('2026-12-01')
    expect(lastDayOfPeriod('2028-02-01')).toBe('2028-02-29')
    expect(daysInPeriod('2027-02-01')).toHaveLength(28)
  })

  it('weekdays and ranges', () => {
    expect(weekdayOf('2027-02-01')).toBe(1)
    expect(eachDay('2027-02-14', '2027-02-10')).toEqual(['2027-02-10', '2027-02-11', '2027-02-12', '2027-02-13', '2027-02-14'])
  })
})
