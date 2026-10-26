import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? import.meta.env.VITE_SUPABASE_ANON_KEY

if (!url || !key) {
  throw new Error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_PUBLISHABLE_KEY. Copy .env.example to .env.local.')
}
const anonKey: string = key

export const supabase = createClient<Database>(url, anonKey, {
  // PKCE: Google redirects back with ?code=…, which the client exchanges for a session on load.
  auth: { flowType: 'pkce', persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
})

/** Whether an OAuth provider is switched on in the Supabase dashboard. */
export async function isProviderEnabled(provider: string): Promise<boolean> {
  const res = await fetch(`${url}/auth/v1/settings`, { headers: { apikey: anonKey } })
  if (!res.ok) return true // Can't tell; let the redirect report any problem.
  const settings = (await res.json()) as { external?: Record<string, boolean> }
  return settings.external?.[provider] === true
}
