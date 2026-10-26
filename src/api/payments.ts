import { supabase } from '@/lib/supabase'
import type { Payment, PaymentInsert } from './types'
import { check, unwrap } from './unwrap'

export async function listPayments(monthId: string): Promise<Payment[]> {
  return unwrap(await supabase.from('payments').select('*').eq('subscription_month_id', monthId).order('paid_on'))
}

export async function addPayment(payment: PaymentInsert): Promise<void> {
  check(await supabase.from('payments').insert(payment))
}

export async function deletePayment(id: string): Promise<void> {
  check(await supabase.from('payments').delete().eq('id', id))
}
