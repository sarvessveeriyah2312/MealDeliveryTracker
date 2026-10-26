import { useState } from 'react'
import { MonthSwitcher } from '@/components/MonthSwitcher'
import { ErrorBox, Loading } from '@/components/Page'
import { useToast } from '@/components/Toast'
import { useCurrentSubscription } from '@/hooks/useCurrentSubscription'
import { useMonthData, useMonthsWithCurrent } from '@/hooks/useMonthData'
import type { Month } from '@/api/types'
import { buildShareText } from '@/lib/shareText'

/** WhatsApp-ready month summary for the vendor. */
export function ShareSection() {
  const { subscription: sub } = useCurrentSubscription()
  const { months, current, isLoading, error } = useMonthsWithCurrent(sub.id)
  const [monthId, setMonthId] = useState<string | null>(null)
  const month = months.find((m) => m.id === monthId) ?? current

  if (isLoading) return <Loading />
  if (error) return <ErrorBox error={error} />
  if (!month) return null
  return <ShareMonth key={month.id} month={month} months={months} onSelect={(m) => setMonthId(m.id)} />
}

function ShareMonth({ month, months, onSelect }: { month: Month; months: Month[]; onSelect: (m: Month) => void }) {
  const { subscription: sub } = useCurrentSubscription()
  const data = useMonthData(sub, month)
  const toast = useToast()

  if (data.isLoading || !data.statement || !data.settings || !data.billingMeals) return <Loading />
  if (data.error) return <ErrorBox error={data.error} />

  const text = buildShareText({
    vendorName: sub.vendor_name,
    period: month.period,
    feeSnapshot: Number(month.fee_snapshot),
    meals: data.billingMeals,
    settings: data.settings,
    statement: data.statement,
    nextMonthFee: Number(sub.monthly_fee),
    carryForwardEnabled: sub.carry_forward_enabled,
  })
  const phone = sub.vendor_phone?.replace(/\D/g, '')
  const waUrl = `https://wa.me/${phone ?? ''}?text=${encodeURIComponent(text)}`

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text)
      toast('Copied — paste it into WhatsApp')
    } catch {
      toast('Copy failed. Long-press the text to copy it.', { tone: 'error' })
    }
  }

  return (
    <section className="space-y-3">
      <h2 className="font-semibold">WhatsApp summary</h2>
      <MonthSwitcher months={months} value={month} onChange={onSelect} />
      <pre className="card overflow-x-auto font-sans text-sm whitespace-pre-wrap select-text">{text}</pre>
      <div className="grid grid-cols-2 gap-3">
        <button className="btn-secondary min-h-14" onClick={copy}>📋 Copy</button>
        <a className="btn-primary min-h-14" href={waUrl} target="_blank" rel="noreferrer">
          💬 WhatsApp
        </a>
      </div>
      {!phone && <p className="text-center text-xs text-muted">Add the vendor's number in Settings to open their chat directly.</p>}
    </section>
  )
}
