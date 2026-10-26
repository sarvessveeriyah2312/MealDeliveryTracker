import type { PostgrestError } from '@supabase/supabase-js'

export function unwrap<T>({ data, error }: { data: T | null; error: PostgrestError | null }): NonNullable<T> {
  if (error) throw new Error(error.message)
  return data as NonNullable<T>
}

export function check({ error }: { error: PostgrestError | null }): void {
  if (error) throw new Error(error.message)
}
