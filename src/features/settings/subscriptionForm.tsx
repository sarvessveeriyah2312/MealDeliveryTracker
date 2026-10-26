import { Controller, type Control, type FieldErrors, type UseFormRegister } from 'react-hook-form'
import { z } from 'zod'
import type { Subscription, SubscriptionInsert } from '@/api/types'
import { MEAL_LABELS, MEAL_TYPES, POLICY_LABELS, WEEKDAY_SHORT, type CancelPolicy } from '@/lib/constants'

const money = z.number({ invalid_type_error: 'Enter an amount' }).min(0, 'Must be 0 or more')

export const subscriptionSchema = z
  .object({
    vendor_name: z.string().trim().min(1, 'Vendor name is required'),
    vendor_phone: z.string().trim(),
    meal_types: z.array(z.enum(['lunch', 'dinner'])).min(1, 'Pick at least one meal'),
    delivery_weekdays: z.array(z.number().int().min(0).max(6)).min(1, 'Pick at least one day'),
    monthly_fee: money,
    lunch_value: money.nullable(),
    dinner_value: money.nullable(),
    user_cancel_policy: z.enum(['full_credit', 'credit_with_notice', 'no_credit']),
    notice_hours: z.number({ invalid_type_error: 'Enter hours' }).int().min(0),
    carry_forward_enabled: z.boolean(),
    auto_mark_delivered: z.boolean(),
    start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Pick a start date'),
    end_date: z.string().nullable(),
  })
  .refine((v) => !v.end_date || v.end_date >= v.start_date, { path: ['end_date'], message: 'End date must be after start' })

export type SubscriptionFormValues = z.infer<typeof subscriptionSchema>

export function defaultsFrom(sub: Subscription | null, today: string): SubscriptionFormValues {
  return {
    vendor_name: sub?.vendor_name ?? '',
    vendor_phone: sub?.vendor_phone ?? '',
    meal_types: sub?.meal_types ?? ['lunch', 'dinner'],
    delivery_weekdays: sub?.delivery_weekdays ?? [1, 2, 3, 4, 5],
    monthly_fee: sub ? Number(sub.monthly_fee) : NaN,
    lunch_value: sub?.lunch_value == null ? null : Number(sub.lunch_value),
    dinner_value: sub?.dinner_value == null ? null : Number(sub.dinner_value),
    user_cancel_policy: sub?.user_cancel_policy ?? 'credit_with_notice',
    notice_hours: sub?.notice_hours ?? 24,
    carry_forward_enabled: sub?.carry_forward_enabled ?? true,
    auto_mark_delivered: sub?.auto_mark_delivered ?? true,
    start_date: sub?.start_date ?? today,
    end_date: sub?.end_date ?? null,
  }
}

export function toRow(v: SubscriptionFormValues): Omit<SubscriptionInsert, 'user_id' | 'id'> {
  return { ...v, vendor_phone: v.vendor_phone || null, meal_types: [...v.meal_types].sort(), delivery_weekdays: [...v.delivery_weekdays].sort() }
}

const num = { setValueAs: (v: string) => (v === '' ? NaN : Number(v)) }
const optionalNum = { setValueAs: (v: string) => (v === '' || v == null ? null : Number(v)) }

type FieldProps = { register: UseFormRegister<SubscriptionFormValues>; control: Control<SubscriptionFormValues>; errors: FieldErrors<SubscriptionFormValues> }

function Err({ msg }: { msg: string | undefined }) {
  return msg ? <p className="text-sm text-vendor">{msg}</p> : null
}

function Chip({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={onClick}
      className={`chip px-3 ${on ? 'chip-on' : ''}`}
    >
      {children}
    </button>
  )
}

export function VendorFields({ register, errors }: FieldProps) {
  return (
    <div className="space-y-3">
      <div className="space-y-1">
        <label className="field-label" htmlFor="vendor_name">Vendor name</label>
        <input id="vendor_name" className="input" {...register('vendor_name')} placeholder="e.g. Kak Ros Catering" />
        <Err msg={errors.vendor_name?.message} />
      </div>
      <div className="space-y-1">
        <label className="field-label" htmlFor="vendor_phone">Vendor WhatsApp number (optional)</label>
        <input id="vendor_phone" className="input" inputMode="tel" {...register('vendor_phone')} placeholder="60123456789" />
      </div>
    </div>
  )
}

export function ScheduleFields({ register, control, errors }: FieldProps) {
  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <span className="field-label">Meals</span>
        <Controller
          control={control}
          name="meal_types"
          render={({ field }) => (
            <div className="flex gap-2">
              {MEAL_TYPES.map((t) => (
                <Chip key={t} on={field.value.includes(t)} onClick={() => field.onChange(field.value.includes(t) ? field.value.filter((x) => x !== t) : [...field.value, t])}>
                  {MEAL_LABELS[t]}
                </Chip>
              ))}
            </div>
          )}
        />
        <Err msg={errors.meal_types?.message} />
      </div>
      <div className="space-y-1">
        <span className="field-label">Delivery days</span>
        <Controller
          control={control}
          name="delivery_weekdays"
          render={({ field }) => (
            <div className="grid grid-cols-7 gap-1">
              {[1, 2, 3, 4, 5, 6, 0].map((d) => (
                <Chip key={d} on={field.value.includes(d)} onClick={() => field.onChange(field.value.includes(d) ? field.value.filter((x) => x !== d) : [...field.value, d])}>
                  {WEEKDAY_SHORT[d]!.slice(0, 1)}
                </Chip>
              ))}
            </div>
          )}
        />
        <Err msg={errors.delivery_weekdays?.message} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <label className="field-label" htmlFor="start_date">Start date</label>
          <input id="start_date" type="date" className="input" {...register('start_date')} />
          <Err msg={errors.start_date?.message} />
        </div>
        <div className="space-y-1">
          <label className="field-label" htmlFor="end_date">End date</label>
          <input id="end_date" type="date" className="input" {...register('end_date', { setValueAs: (v: string) => v || null })} />
          <Err msg={errors.end_date?.message} />
        </div>
      </div>
    </div>
  )
}

export function PricingFields({ register, errors, control }: FieldProps) {
  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <label className="field-label" htmlFor="monthly_fee">Monthly fee (RM)</label>
        <input id="monthly_fee" type="number" inputMode="decimal" step="0.01" className="input" {...register('monthly_fee', num)} />
        <Err msg={errors.monthly_fee?.message} />
      </div>
      <fieldset className="space-y-1">
        <legend className="field-label">Fixed credit per meal (optional)</legend>
        <p className="text-xs text-muted">Leave blank to use monthly fee ÷ number of meals.</p>
        <div className="grid grid-cols-2 gap-3">
          <input aria-label="Lunch value" placeholder="Lunch RM" type="number" inputMode="decimal" step="0.01" className="input" {...register('lunch_value', optionalNum)} />
          <input aria-label="Dinner value" placeholder="Dinner RM" type="number" inputMode="decimal" step="0.01" className="input" {...register('dinner_value', optionalNum)} />
        </div>
      </fieldset>
      <div className="space-y-1">
        <span className="field-label">When I cancel a meal</span>
        <Controller
          control={control}
          name="user_cancel_policy"
          render={({ field }) => (
            <div className="grid grid-cols-3 gap-2">
              {(Object.keys(POLICY_LABELS) as CancelPolicy[]).map((p) => (
                <Chip key={p} on={field.value === p} onClick={() => field.onChange(p)}>
                  {POLICY_LABELS[p]}
                </Chip>
              ))}
            </div>
          )}
        />
      </div>
      <div className="space-y-1">
        <label className="field-label" htmlFor="notice_hours">Notice needed (hours)</label>
        <input id="notice_hours" type="number" inputMode="numeric" className="input" {...register('notice_hours', num)} />
        <p className="text-xs text-muted">Only for "credit with notice". Measured from lunch 12:00 / dinner 19:00.</p>
        <Err msg={errors.notice_hours?.message} />
      </div>
      <label className="flex min-h-11 items-center justify-between gap-3">
        <span className="text-sm">Carry unused credit into next month</span>
        <input type="checkbox" className="toggle" {...register('carry_forward_enabled')} />
      </label>
      <label className="flex min-h-11 items-center justify-between gap-3">
        <span className="text-sm">
          Mark meals as delivered automatically
          <span className="block text-xs text-muted">After lunch 12:00 / dinner 19:00, unless you mark them cancelled.</span>
        </span>
        <input type="checkbox" className="toggle" {...register('auto_mark_delivered')} />
      </label>
    </div>
  )
}
