import { formatRM } from '@/lib/money'

export function MoneyRow({ label, amount, strong, sign, hint }: { label: string; amount: number; strong?: boolean; sign?: '−' | '+'; hint?: string }) {
  return (
    <div className={`flex items-baseline justify-between gap-3 py-1.5 ${strong ? 'text-base font-semibold' : 'text-sm'}`}>
      <span className={strong ? '' : 'text-muted'}>
        {label}
        {hint && <span className="block text-xs text-muted">{hint}</span>}
      </span>
      <span className="tabular-nums">
        {sign && amount > 0 ? `${sign} ` : ''}
        {formatRM(amount)}
      </span>
    </div>
  )
}
