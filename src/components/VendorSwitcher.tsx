import { useCurrentSubscription } from '@/hooks/useCurrentSubscription'

/** Horizontal vendor chips for per-vendor screens, plus a shortcut to add another vendor. */
export function VendorSwitcher() {
  const { subscription, subscriptions, select, addVendor } = useCurrentSubscription()
  return (
    <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1" role="tablist" aria-label="Vendor">
      {subscriptions.map((s) => {
        const active = s.id === subscription.id
        return (
          <button
            key={s.id}
            role="tab"
            aria-selected={active}
            onClick={() => select(s.id)}
            className={`min-h-11 shrink-0 rounded-full border px-4 text-sm font-medium whitespace-nowrap ${
              active ? 'border-brand bg-brand text-white' : 'border-line bg-surface'
            } ${s.is_active ? '' : 'opacity-60'}`}
          >
            {s.vendor_name}
          </button>
        )
      })}
      <button onClick={addVendor} className="min-h-11 shrink-0 rounded-full border border-dashed border-line px-4 text-sm whitespace-nowrap text-muted">
        + Add vendor
      </button>
    </div>
  )
}
