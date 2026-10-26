export const TZ = 'Asia/Kuala_Lumpur'

export type MealType = 'lunch' | 'dinner'
export type MealStatus = 'scheduled' | 'delivered' | 'vendor_cancelled' | 'user_cancelled' | 'no_service'
export type CancelPolicy = 'full_credit' | 'credit_with_notice' | 'no_credit'

/** Local (MYT) wall-clock time each meal is due; used for the cancellation-notice rule. */
export const MEAL_TIMES: Record<MealType, string> = { lunch: '12:00', dinner: '19:00' }

export const MEAL_TYPES: MealType[] = ['lunch', 'dinner']

export const MEAL_LABELS: Record<MealType, string> = { lunch: 'Lunch', dinner: 'Dinner' }

export const STATUS_LABELS: Record<MealStatus, string> = {
  scheduled: 'Not marked',
  delivered: 'Delivered',
  vendor_cancelled: 'Not delivered',
  user_cancelled: 'I cancelled',
  no_service: 'No service',
}

export const WEEKDAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export const POLICY_LABELS: Record<CancelPolicy, string> = {
  full_credit: 'Full credit',
  credit_with_notice: 'Credit with notice',
  no_credit: 'No credit',
}
