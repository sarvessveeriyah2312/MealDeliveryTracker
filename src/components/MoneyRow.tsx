import type { ReactNode } from 'react'
import { formatRM } from '@/lib/money'

type Tone = 'default' | 'good' | 'bad'
const TONE: Record<Tone, string> = { default: '', good: 'text-delivered', bad: 'text-vendor' }

/** One line of a bill: label, dotted leader, value. `total` draws the accountant's double rule above it. */
export function LedgerRow({ label, value, hint, strong, total, tone = 'default' }: { label: ReactNode; value: ReactNode; hint?: string; strong?: boolean; total?: boolean; tone?: Tone }) {
  return (
    <div className={total ? 'mt-1 border-t-[3px] border-double border-fg/25 pt-1.5' : ''}>
      <div className={`ledger-row ${strong || total ? 'font-semibold' : ''}`}>
        <span className={strong || total ? '' : 'text-muted'}>{label}</span>
        <span aria-hidden className="ledger-leader" />
        <span className={`tabular ${total ? 'figure text-lg' : ''} ${TONE[tone]}`}>{value}</span>
      </div>
      {hint && <p className="-mt-1 pb-1 text-xs text-muted">{hint}</p>}
    </div>
  )
}

export function MoneyRow({ label, amount, strong, total, sign, hint, tone }: { label: string; amount: number; strong?: boolean; total?: boolean; sign?: '−' | '+'; hint?: string; tone?: Tone }) {
  return <LedgerRow label={label} hint={hint} strong={strong} total={total} tone={tone} value={`${sign && amount > 0 ? `${sign} ` : ''}${formatRM(amount)}`} />
}
