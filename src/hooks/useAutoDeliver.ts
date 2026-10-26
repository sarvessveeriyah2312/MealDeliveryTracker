import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { autoDeliverDueMeals } from '@/api/meals'
import type { Subscription } from '@/api/types'

const INTERVAL_MS = 5 * 60_000

/**
 * While the app is open (and whenever it returns to the foreground), marks meals whose time has
 * passed as delivered for vendors with auto-mark on.
 */
export function useAutoDeliver(subscriptions: Subscription[]) {
  const qc = useQueryClient()
  const ids = subscriptions
    .filter((s) => s.is_active && s.auto_mark_delivered)
    .map((s) => s.id)
    .join(',')

  useEffect(() => {
    if (!ids) return
    let running = false
    const run = async () => {
      if (running || document.visibilityState !== 'visible') return
      running = true
      try {
        if ((await autoDeliverDueMeals(ids.split(','), new Date())) > 0) await qc.invalidateQueries({ queryKey: ['meals'] })
      } catch {
        // Best effort: the next tick or foreground event retries.
      } finally {
        running = false
      }
    }
    void run()
    const timer = setInterval(run, INTERVAL_MS)
    document.addEventListener('visibilitychange', run)
    return () => {
      clearInterval(timer)
      document.removeEventListener('visibilitychange', run)
    }
  }, [ids, qc])
}
