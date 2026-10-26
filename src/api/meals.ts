import { mealsDueForAutoDelivery } from '@/lib/billing'
import { todayLocal } from '@/lib/dates'
import { supabase } from '@/lib/supabase'
import type { TablesInsert } from '@/types/database'
import type { MealUpdate } from './types'
import { check } from './unwrap'

export async function updateMeal(id: string, patch: MealUpdate): Promise<void> {
  check(await supabase.from('meals').update(patch).eq('id', id))
}

export async function updateMeals(ids: string[], patch: MealUpdate): Promise<void> {
  if (ids.length) check(await supabase.from('meals').update(patch).in('id', ids))
}

export async function insertMeals(meals: TablesInsert<'meals'>[]): Promise<void> {
  if (meals.length) check(await supabase.from('meals').insert(meals))
}

export async function deleteMeals(ids: string[]): Promise<void> {
  if (ids.length) check(await supabase.from('meals').delete().in('id', ids))
}

/**
 * Marks every unmarked meal whose time has passed as delivered, in the open months of vendors with
 * auto-mark on. Only rows still 'scheduled' are updated, so a mark made meanwhile is never overwritten.
 */
export async function autoDeliverDueMeals(subscriptionIds: string[], now: Date): Promise<number> {
  if (!subscriptionIds.length) return 0
  const months = await supabase.from('subscription_months').select('id').eq('status', 'open').in('subscription_id', subscriptionIds)
  if (months.error) throw new Error(months.error.message)
  const monthIds = months.data.map((m) => m.id)
  if (!monthIds.length) return 0

  const pending = await supabase
    .from('meals')
    .select('id, date, meal_type, status')
    .in('subscription_month_id', monthIds)
    .eq('status', 'scheduled')
    .lte('date', todayLocal(now))
  if (pending.error) throw new Error(pending.error.message)

  const due = mealsDueForAutoDelivery(pending.data, now)
  if (!due.length) return 0
  check(await supabase.from('meals').update({ status: 'delivered' }).in('id', due.map((m) => m.id)).eq('status', 'scheduled'))
  return due.length
}
