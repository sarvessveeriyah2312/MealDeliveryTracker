import { useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { OnboardingWizard } from '@/features/onboarding/OnboardingWizard'
import { useSubscriptions } from '@/hooks/queries'
import { useAutoDeliver } from '@/hooks/useAutoDeliver'
import { SubscriptionProvider, useCurrentSubscription } from '@/hooks/useCurrentSubscription'
import { BottomNav } from './BottomNav'
import { SideNav } from './SideNav'
import { ErrorBox, Loading } from './Page'
import { VendorSwitcher } from './VendorSwitcher'

export function AppLayout() {
  const subs = useSubscriptions()
  const [adding, setAdding] = useState(false)
  if (subs.isLoading) return <Loading />
  if (subs.error) return <div className="p-4"><ErrorBox error={subs.error} /></div>
  if (!subs.data?.length) return <OnboardingWizard onDone={() => undefined} />

  return (
    <SubscriptionProvider subscriptions={subs.data} onAddVendor={() => setAdding(true)}>
      <Shell />
      {adding && <AddVendor onClose={() => setAdding(false)} />}
    </SubscriptionProvider>
  )
}

function Shell() {
  useAutoDeliver(useCurrentSubscription().subscriptions)
  // Today shows every vendor at once; the other screens are per vendor.
  const { pathname } = useLocation()
  const showSwitcher = pathname !== '/'
  return (
    <div className="lg:flex">
      <SideNav />
      <div className="min-w-0 flex-1">
        <div className="mx-auto min-h-dvh max-w-md pt-[env(safe-area-inset-top)] pb-[calc(5.5rem+env(safe-area-inset-bottom))] md:max-w-2xl lg:max-w-6xl lg:px-6 lg:pt-4 lg:pb-12">
          {showSwitcher && (
            <div className="px-4 pt-4">
              <VendorSwitcher />
            </div>
          )}
          {/* Fade between tabs so a switch reads as a change of screen. */}
          <div key={pathname} className="animate-fade">
            <Outlet />
          </div>
        </div>
      </div>
      <BottomNav />
    </div>
  )
}

function AddVendor({ onClose }: { onClose: () => void }) {
  const { select } = useCurrentSubscription()
  return (
    <OnboardingWizard
      onCancel={onClose}
      onDone={(created) => {
        select(created.id)
        onClose()
      }}
    />
  )
}
