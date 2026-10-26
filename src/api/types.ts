import type { Tables, TablesInsert, TablesUpdate } from '@/types/database'

export type Subscription = Tables<'subscriptions'>
export type SubscriptionInsert = TablesInsert<'subscriptions'>
export type SubscriptionUpdate = TablesUpdate<'subscriptions'>
export type Month = Tables<'subscription_months'>
export type Meal = Tables<'meals'>
export type MealUpdate = TablesUpdate<'meals'>
export type OffDay = Tables<'off_days'>
export type Payment = Tables<'payments'>
export type PaymentInsert = TablesInsert<'payments'>
