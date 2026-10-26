import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { BottomSheet } from '@/components/BottomSheet'

const METHODS = [
  { value: 'bank_transfer', label: 'Bank transfer' },
  { value: 'duitnow', label: 'DuitNow' },
  { value: 'cash', label: 'Cash' },
  { value: 'other', label: 'Other' },
] as const

const schema = z.object({
  amount: z.number({ invalid_type_error: 'Enter an amount' }).positive('Must be more than 0'),
  paid_on: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Pick a date'),
  method: z.enum(['bank_transfer', 'duitnow', 'cash', 'other']),
  note: z.string(),
})
export type PaymentValues = z.infer<typeof schema>

export function PaymentSheet({ open, onClose, defaults, onSubmit }: { open: boolean; onClose: () => void; defaults: PaymentValues; onSubmit: (v: PaymentValues) => Promise<void> }) {
  const { register, handleSubmit, formState } = useForm<PaymentValues>({ resolver: zodResolver(schema), values: defaults })
  return (
    <BottomSheet open={open} onClose={onClose} title="Add payment">
      <form className="space-y-3" onSubmit={handleSubmit(onSubmit)}>
        <div className="space-y-1">
          <label className="field-label" htmlFor="amount">Amount (RM)</label>
          <input id="amount" type="number" step="0.01" inputMode="decimal" className="input" {...register('amount', { setValueAs: (v: string) => (v === '' ? NaN : Number(v)) })} />
          {formState.errors.amount && <p className="text-sm text-vendor">{formState.errors.amount.message}</p>}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="field-label" htmlFor="paid_on">Paid on</label>
            <input id="paid_on" type="date" className="input" {...register('paid_on')} />
          </div>
          <div className="space-y-1">
            <label className="field-label" htmlFor="method">Method</label>
            <select id="method" className="input" {...register('method')}>
              {METHODS.map((m) => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="space-y-1">
          <label className="field-label" htmlFor="pnote">Note</label>
          <input id="pnote" className="input" placeholder="optional" {...register('note')} />
        </div>
        <button className="btn-primary w-full" type="submit" disabled={formState.isSubmitting}>
          {formState.isSubmitting ? 'Saving…' : 'Save payment'}
        </button>
      </form>
    </BottomSheet>
  )
}

export const METHOD_LABELS: Record<string, string> = Object.fromEntries(METHODS.map((m) => [m.value, m.label]))
