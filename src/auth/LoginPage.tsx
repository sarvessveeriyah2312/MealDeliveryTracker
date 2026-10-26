import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { CircleAlert, LoaderCircle } from 'lucide-react'
import { isProviderEnabled, supabase } from '@/lib/supabase'
import { useAuth } from './AuthProvider'

// OAuth failures come back as error/error_description in the query (PKCE) or hash.
function readAuthError(): string | null {
  const params = new URLSearchParams(window.location.hash.slice(1))
  new URLSearchParams(window.location.search).forEach((v, k) => params.set(k, v))
  const description = params.get('error_description')
  return description ? description.replace(/\+/g, ' ') : null
}

export function LoginPage() {
  const { session } = useAuth()
  const [error, setError] = useState<string | null>(readAuthError)
  const [busy, setBusy] = useState(false)

  if (session) return <Navigate to="/" replace />

  const signIn = async () => {
    setError(null)
    setBusy(true)
    try {
      if (!(await isProviderEnabled('google'))) {
        setError('Google sign-in is not enabled for this Supabase project yet.')
      } else {
        const { error } = await supabase.auth.signInWithOAuth({
          provider: 'google',
          options: { redirectTo: window.location.origin, queryParams: { prompt: 'select_account' } },
        })
        // On success the browser navigates to Google, so leave the button busy.
        if (!error) return
        setError(error.message)
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not start sign-in')
    }
    setBusy(false)
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col px-6 pt-[calc(2.5rem+env(safe-area-inset-top))] pb-[calc(2.5rem+env(safe-area-inset-bottom))]">
      <div className="flex flex-1 flex-col justify-center">
        <TingkatMark />
        <h1 className="mt-10 text-[2.6rem] leading-[1.05] font-bold tracking-tight">Know what your caterer owes you.</h1>
        <p className="mt-4 max-w-[30ch] text-base text-muted">Log lunch and dinner, count the meals that never came, and pay the right amount next month.</p>
      </div>

      <div className="flex flex-col gap-3">
        {error && (
          <p className="flex items-start gap-2 rounded-xl bg-vendor/10 p-3 text-sm text-vendor">
            <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" />
            {error}
          </p>
        )}
        <button className="btn-secondary min-h-14 w-full text-base" onClick={signIn} disabled={busy}>
          {busy ? <LoaderCircle className="h-5 w-5 animate-spin" /> : <GoogleLogo />}
          {busy ? 'Opening Google…' : 'Continue with Google'}
        </button>
        <p className="text-center text-xs text-muted">Your first sign-in creates your account.</p>
      </div>
    </main>
  )
}

/** A three-tier tingkat in the app's status colours; the tiers settle into place on load. */
function TingkatMark() {
  const tiers = ['bg-delivered', 'bg-user', 'bg-vendor']
  return (
    <div aria-hidden className="relative w-28 pt-7">
      <svg viewBox="0 0 112 32" className="absolute top-0 left-0 h-8 w-28 text-fg/80" fill="none">
        <path d="M18 32V14C18 8 22 4 28 4H84C90 4 94 8 94 14V32" stroke="currentColor" strokeWidth="5" strokeLinecap="round" />
      </svg>
      <div className="space-y-1">
        {tiers.map((tone, i) => (
          <div key={tone} className="animate-tier relative h-9 overflow-hidden rounded-xl border-2 border-fg/80 bg-surface" style={{ animationDelay: `${i * 110}ms` }}>
            <div className={`h-2 ${tone}`} />
          </div>
        ))}
      </div>
      <div className="mx-3 h-2 rounded-b-lg bg-fg/80" />
    </div>
  )
}

function GoogleLogo() {
  return (
    <svg aria-hidden viewBox="0 0 48 48" className="h-5 w-5">
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3 0 5.8 1.1 7.9 3l5.7-5.7C34.1 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.2-.1-2.4-.4-3.5z" />
      <path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3 0 5.8 1.1 7.9 3l5.7-5.7C34.1 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.2-.1-2.4-.4-3.5z" />
    </svg>
  )
}
