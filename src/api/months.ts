import { supabase } from '@/lib/supabase'
import type { TablesInsert } from '@/types/database'
import type { Meal, Month } from './types'
import { check, unwrap } from './unwrap'

export async function listMonths(subscriptionId: string): Promise<Month[]> {
  return unwrap(await supabase.from('subscription_months').select('*').eq('subscription_id', subscriptionId).order('period'))
}

export async function insertMonthWithMeals(
  month: TablesInsert<'subscription_months'>,
  meals: Omit<TablesInsert<'meals'>, 'subscription_month_id'>[],
): Promise<Month> {
  const created: Month = unwrap(await supabase.from('subscription_months').insert(month).select().single())
  if (meals.length) {
    const res = await supabase.from('meals').insert(meals.map((m) => ({ ...m, subscription_month_id: created.id })))
    if (res.error) {
      // Don't leave a month without meals behind.
      await supabase.from('subscription_months').delete().eq('id', created.id)
      throw new Error(res.error.message)
    }
  }
  return created
}

export async function updateMonth(id: string, patch: Partial<Pick<Month, 'status' | 'opening_credit' | 'closing_credit' | 'closed_at' | 'fee_snapshot' | 'meal_types_snapshot' | 'weekdays_snapshot'>>): Promise<void> {
  check(await supabase.from('subscription_months').update(patch).eq('id', id))
}

export async function listMeals(monthId: string): Promise<Meal[]> {
  return unwrap(await supabase.from('meals').select('*').eq('subscription_month_id', monthId).order('date').order('meal_type'))
}
