import { supabase } from '@/lib/supabase'
import type { Tables } from '@/types/database'

export type Profile = Tables<'profiles'>

export async function getProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle()
  if (error) throw new Error(error.message)
  return data
}
