import { useState, useSyncExternalStore } from 'react'
import { Share, X } from 'lucide-react'
import { canPromptInstall, isIOS, isStandalone, promptInstall, subscribeInstall } from '@/lib/install'

const DISMISSED_KEY = 'mealtrack.installDismissed'

function readDismissed(): boolean {
  try {
    return localStorage.getItem(DISMISSED_KEY) === '1'
  } catch {
    return false
  }
}

/** Invites phone users to add MealTrack to their Home Screen so it opens full-screen like an app. */
export function InstallHint() {
  const [dismissed, setDismissed] = useState(readDismissed)
  const canPrompt = useSyncExternalStore(subscribeInstall, canPromptInstall)
  const ios = isIOS()

  if (dismissed || isStandalone() || (!ios && !canPrompt)) return null

  const dismiss = () => {
    setDismissed(true)
    try {
      localStorage.setItem(DISMISSED_KEY, '1')
    } catch {
      // Shown again next visit; harmless.
    }
  }

  return (
    <section className="flex items-center gap-3 rounded-[1.25rem] border border-line bg-surface p-3 lg:hidden">
      <img src="/apple-touch-icon.png" alt="" className="h-11 w-11 shrink-0 rounded-xl" />
      <div className="min-w-0 flex-1 text-sm">
        <p className="font-semibold">Add MealTrack to your Home Screen</p>
        {ios ? (
          <p className="text-muted">
            Tap <Share className="inline h-4 w-4 -translate-y-0.5" aria-label="Share" /> then <span className="font-medium text-fg">Add to Home Screen</span>.
          </p>
        ) : (
          <p className="text-muted">Opens full-screen, like an app.</p>
        )}
      </div>
      {!ios && (
        <button className="btn-primary min-h-10 px-3 text-sm" onClick={() => void promptInstall()}>
          Install
        </button>
      )}
      <button className="icon-btn -mr-1" aria-label="Dismiss" onClick={dismiss}>
        <X className="h-4 w-4" />
      </button>
    </section>
  )
}
