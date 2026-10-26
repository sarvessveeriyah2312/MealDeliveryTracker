import { createContext, useContext, useState, type ReactNode } from 'react'
import type { Subscription } from '@/api/types'

const STORAGE_KEY = 'mealtrack.subscriptionId'

function readStored(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY)
  } catch {
    return null
  }
}

type Ctx = {
  subscription: Subscription
  subscriptions: Subscription[]
  select: (id: string) => void
  /** Opens the add-vendor wizard. */
  addVendor: () => void
}

const SubscriptionContext = createContext<Ctx | null>(null)

/** Picks the remembered subscription, else the newest active one, else the newest. */
export function SubscriptionProvider({ subscriptions, onAddVendor, children }: { subscriptions: Subscription[]; onAddVendor: () => void; children: ReactNode }) {
  const [selectedId, setSelectedId] = useState<string | null>(readStored)
  const subscription =
    subscriptions.find((s) => s.id === selectedId) ??
    [...subscriptions].reverse().find((s) => s.is_active) ??
    subscriptions[subscriptions.length - 1]!

  const select = (id: string) => {
    setSelectedId(id)
    try {
      localStorage.setItem(STORAGE_KEY, id)
    } catch {
      // Private mode etc. — selection just won't persist.
    }
  }
  return <SubscriptionContext.Provider value={{ subscription, subscriptions, select, addVendor: onAddVendor }}>{children}</SubscriptionContext.Provider>
}

export function useCurrentSubscription(): Ctx {
  const ctx = useContext(SubscriptionContext)
  if (!ctx) throw new Error('useCurrentSubscription must be used inside SubscriptionProvider')
  return ctx
}
