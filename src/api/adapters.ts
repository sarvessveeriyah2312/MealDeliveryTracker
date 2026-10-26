import type { BillingMeal, PricingSettings, ScheduleConfig } from '@/lib/billing'
import type { Meal, OffDay, Subscription } from './types'

// Maps database rows onto the shapes billing.ts works with.

export function pricingSettings(sub: Subscription): PricingSettings {
  return {
    lunchValue: sub.lunch_value == null ? null : Number(sub.lunch_value),
    dinnerValue: sub.dinner_value == null ? null : Number(sub.dinner_value),
    policy: sub.user_cancel_policy,
    noticeHours: sub.notice_hours,
  }
}

export function scheduleConfig(sub: Pick<Subscription, 'meal_types' | 'delivery_weekdays' | 'start_date' | 'end_date'>, offDays: OffDay[]): ScheduleConfig {
  return {
    mealTypes: sub.meal_types,
    weekdays: sub.delivery_weekdays,
    startDate: sub.start_date,
    endDate: sub.end_date,
    offDates: offDays.map((d) => d.date),
  }
}

export function billingMeal(m: Meal): BillingMeal {
  return {
    date: m.date,
    meal_type: m.meal_type,
    status: m.status,
    cancelled_at: m.cancelled_at,
    credit_override: m.credit_override == null ? null : Number(m.credit_override),
  }
}
