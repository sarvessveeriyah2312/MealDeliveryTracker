import { useState } from 'react'
import { useForm, type FieldPath } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useQueryClient } from '@tanstack/react-query'
import { createSubscription } from '@/api/subscriptions'
import { openMonth, suggestedFee } from '@/api/monthOps'
import type { Subscription } from '@/api/types'
import { keys } from '@/hooks/keys'
import { formatPeriod, periodOf, todayLocal } from '@/lib/dates'
import { formatRM } from '@/lib/money'
import { PricingFields, ScheduleFields, VendorFields, defaultsFrom, subscriptionSchema, toRow, type SubscriptionFormValues } from '@/features/settings/subscriptionForm'

const STEPS: { title: string; fields: FieldPath<SubscriptionFormValues>[] }[] = [
  { title: 'Who delivers your meals?', fields: ['vendor_name', 'vendor_phone'] },
  { title: 'When do they deliver?', fields: ['meal_types', 'delivery_weekdays', 'start_date', 'end_date'] },
  { title: 'What do you pay?', fields: ['monthly_fee', 'lunch_value', 'dinner_value', 'user_cancel_policy', 'notice_hours'] },
  { title: 'Open your first month', fields: [] },
]

/** First-run (and "add subscription") flow: creates the subscription and opens its first month. */
export function OnboardingWizard({ onDone, onCancel }: { onDone: (sub: Subscription) => void; onCancel?: () => void }) {
  const today = todayLocal()
  const qc = useQueryClient()
  const [step, setStep] = useState(0)
  const [feeOverride, setFeeOverride] = useState<string>('')
  const [openingCredit, setOpeningCredit] = useState<string>('')
  const [error, setError] = useState<string | null>(null)
  const form = useForm<SubscriptionFormValues>({ resolver: zodResolver(subscriptionSchema), defaultValues: defaultsFrom(null, today) })
  const { register, control, formState, trigger, getValues, handleSubmit } = form

  const values = getValues()
  const firstPeriod = periodOf(values.start_date > today ? values.start_date : today)
  const preview = { ...toRow(values), id: '', user_id: '', is_active: true, created_at: '' } as Subscription
  const suggested = step === 3 && !Number.isNaN(values.monthly_fee) ? suggestedFee(preview, firstPeriod, []) : 0

  const next = async () => {
    if (await trigger(STEPS[step]!.fields)) setStep((s) => s + 1)
  }

  const submit = handleSubmit(async (v) => {
    setError(null)
    try {
      const sub = await createSubscription(toRow(v))
      const fee = feeOverride === '' ? undefined : Number(feeOverride)
      await openMonth({ sub, period: firstPeriod, openingCredit: Number(openingCredit) || 0, offDays: [], fee })
      await qc.invalidateQueries({ queryKey: keys.subscriptions })
      onDone(sub)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save')
    }
  })

  const fieldProps = { register, control, errors: formState.errors }
  return (
    // When opened from Settings it covers the bottom nav so its buttons stay reachable.
    <div className={onCancel ? 'fixed inset-0 z-40 overflow-y-auto bg-bg' : ''}>
      <main className="mx-auto flex min-h-dvh max-w-md flex-col px-4 pt-[calc(1.5rem+env(safe-area-inset-top))] pb-[calc(1.5rem+env(safe-area-inset-bottom))]">
        <div className="mb-2 flex gap-1" aria-hidden>
          {STEPS.map((_, i) => (
            <span key={i} className={`h-1.5 flex-1 rounded-full ${i <= step ? 'bg-brand' : 'bg-line'}`} />
          ))}
        </div>
        <p className="text-sm text-muted">
          Step {step + 1} of {STEPS.length}
        </p>
        <h1 className="mt-1 mb-5 text-2xl font-bold">{STEPS[step]!.title}</h1>

        <form className="flex flex-1 flex-col" onSubmit={(e) => e.preventDefault()}>
          <div className="flex-1">
            {step === 0 && <VendorFields {...fieldProps} />}
            {step === 1 && <ScheduleFields {...fieldProps} />}
            {step === 2 && <PricingFields {...fieldProps} />}
            {step === 3 && (
              <div className="space-y-4">
                <div className="card space-y-1 text-sm">
                  <p className="font-medium">{values.vendor_name}</p>
                  <p className="text-muted">
                    First month: {formatPeriod(firstPeriod)} · {formatRM(values.monthly_fee)}/month
                  </p>
                </div>
                <div className="space-y-1">
                  <label className="field-label" htmlFor="fee">Fee for {formatPeriod(firstPeriod)} (RM)</label>
                  <input id="fee" type="number" inputMode="decimal" step="0.01" className="input" placeholder={suggested.toFixed(2)} value={feeOverride} onChange={(e) => setFeeOverride(e.target.value)} />
                  <p className="text-xs text-muted">
                    {suggested.toFixed(2) === Number(values.monthly_fee).toFixed(2)
                      ? 'Full month.'
                      : `Prorated for a partial month: ${formatRM(suggested)}. Change it if you paid a different amount.`}
                  </p>
                </div>
                <div className="space-y-1">
                  <label className="field-label" htmlFor="opening">Credit you already have with this vendor (RM)</label>
                  <input id="opening" type="number" inputMode="decimal" step="0.01" className="input" placeholder="0.00" value={openingCredit} onChange={(e) => setOpeningCredit(e.target.value)} />
                </div>
                {error && <p className="text-sm text-vendor">{error}</p>}
              </div>
            )}
          </div>

          <div className="mt-6 grid grid-cols-2 gap-3">
            {step === 0 ? (
              onCancel ? <button type="button" className="btn-secondary" onClick={onCancel}>Cancel</button> : <span />
            ) : (
              <button type="button" className="btn-secondary" onClick={() => setStep((s) => s - 1)}>
                Back
              </button>
            )}
            {step < STEPS.length - 1 ? (
              <button type="button" className="btn-primary" onClick={next}>
                Next
              </button>
            ) : (
              <button type="button" className="btn-primary" onClick={submit} disabled={formState.isSubmitting}>
                {formState.isSubmitting ? 'Saving…' : 'Start tracking'}
              </button>
            )}
          </div>
        </form>
      </main>
    </div>
  )
}
