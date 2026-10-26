import { supabase } from '@/lib/supabase'
import type { OffDay } from './types'
import { check, unwrap } from './unwrap'

export async function listOffDays(subscriptionId: string): Promise<OffDay[]> {
  return unwrap(await supabase.from('off_days').select('*').eq('subscription_id', subscriptionId).order('date'))
}

export async function addOffDay(subscriptionId: string, date: string, reason: string): Promise<void> {
  check(await supabase.from('off_days').insert({ subscription_id: subscriptionId, date, reason }))
}

export async function deleteOffDay(id: string): Promise<void> {
  check(await supabase.from('off_days').delete().eq('id', id))
}
