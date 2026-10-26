import { Plus } from 'lucide-react'
import { useCurrentSubscription } from '@/hooks/useCurrentSubscription'

/** Horizontal vendor chips for per-vendor screens, plus a shortcut to add another vendor. */
export function VendorSwitcher() {
  const { subscription, subscriptions, select, addVendor } = useCurrentSubscription()
  return (
    <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none]" role="tablist" aria-label="Vendor">
      {subscriptions.map((s) => {
        const active = s.id === subscription.id
        return (
          <button
            key={s.id}
            role="tab"
            aria-selected={active}
            onClick={() => select(s.id)}
            className={`chip shrink-0 ${active ? 'chip-on' : ''} ${s.is_active ? '' : 'opacity-55'}`}
          >
            {s.vendor_name}
          </button>
        )
      })}
      <button onClick={addVendor} className="chip shrink-0 border-dashed text-muted">
        <Plus className="h-4 w-4" /> Add vendor
      </button>
    </div>
  )
}
