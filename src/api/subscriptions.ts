import { supabase } from '@/lib/supabase'
import type { Subscription, SubscriptionInsert, SubscriptionUpdate } from './types'
import { unwrap } from './unwrap'

export async function listSubscriptions(): Promise<Subscription[]> {
  return unwrap(await supabase.from('subscriptions').select('*').order('created_at'))
}

export async function createSubscription(values: SubscriptionInsert): Promise<Subscription> {
  return unwrap(await supabase.from('subscriptions').insert(values).select().single())
}

export async function updateSubscription(id: string, patch: SubscriptionUpdate): Promise<Subscription> {
  return unwrap(await supabase.from('subscriptions').update(patch).eq('id', id).select().single())
}
