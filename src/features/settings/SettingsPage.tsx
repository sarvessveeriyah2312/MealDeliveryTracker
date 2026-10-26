import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/auth/AuthProvider'
import { scheduleConfig } from '@/api/adapters'
import { applyRegeneration } from '@/api/monthOps'
import { listMeals } from '@/api/months'
import { updateSubscription } from '@/api/subscriptions'
import type { Meal, Month, Subscription } from '@/api/types'
import { CalendarDays, HandCoins, LogOut, Monitor, Moon, Palette, Plus, Store, Sun } from 'lucide-react'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { SectionHeader } from '@/components/SectionHeader'
import { ErrorBox, Loading, Page } from '@/components/Page'
import { useToast } from '@/components/Toast'
import { keys } from '@/hooks/keys'
import { useMonths, useOffDays } from '@/hooks/queries'
import { useCurrentSubscription } from '@/hooks/useCurrentSubscription'
import { useProfile } from '@/hooks/useProfile'
import { isEmptyPlan, planRegeneration, type RegenerationPlan } from '@/lib/billing'
import { MEAL_LABELS } from '@/lib/constants'
import { formatDay, formatPeriod, todayLocal } from '@/lib/dates'
import { getTheme, setTheme, type Theme } from '@/lib/theme'
import { OffDaysManager } from './OffDaysManager'
import { PricingFields, ScheduleFields, VendorFields, defaultsFrom, subscriptionSchema, toRow, type SubscriptionFormValues } from './subscriptionForm'

export function SettingsPage() {
  const { subscription: sub, addVendor } = useCurrentSubscription()
  const months = useMonths(sub.id)
  const offDays = useOffDays(sub.id)
  const today = todayLocal()

  return (
    <Page title={`${sub.vendor_name} settings`}>
      {months.isLoading || offDays.isLoading ? (
        <Loading />
      ) : months.error || offDays.error ? (
        <ErrorBox error={months.error ?? offDays.error} />
      ) : (
        <>
          <SubscriptionSettings key={sub.id} sub={sub} months={months.data ?? []} today={today} />
          <OffDaysManager subscriptionId={sub.id} offDays={offDays.data ?? []} months={months.data ?? []} today={today} />
        </>
      )}

      <button className="btn-secondary w-full border-dashed" onClick={addVendor}>
        <Plus className="h-5 w-5" /> Add another vendor
      </button>

      <AppearanceAndAccount />
    </Page>
  )
}

type PendingSave = { values: SubscriptionFormValues; plans: { month: Month; plan: RegenerationPlan<Meal> }[] }

function SubscriptionSettings({ sub, months, today }: { sub: Subscription; months: Month[]; today: string }) {
  const qc = useQueryClient()
  const toast = useToast()
  const offDays = useOffDays(sub.id)
  const [pending, setPending] = useState<PendingSave | null>(null)
  const [busy, setBusy] = useState(false)
  const form = useForm<SubscriptionFormValues>({ resolver: zodResolver(subscriptionSchema), defaultValues: defaultsFrom(sub, today) })
  const { register, control, formState, handleSubmit, reset } = form
  const [isActive, setIsActive] = useState(sub.is_active)

  const persist = async (values: SubscriptionFormValues, plans: PendingSave['plans']) => {
    setBusy(true)
    try {
      const row = toRow(values)
      const saved = await updateSubscription(sub.id, { ...row, is_active: isActive })
      for (const { month, plan } of plans) await applyRegeneration({ month, sub: saved, plan })
      await Promise.all([qc.invalidateQueries({ queryKey: keys.subscriptions }), qc.invalidateQueries({ queryKey: ['meals'] }), qc.invalidateQueries({ queryKey: ['months'] })])
      reset(defaultsFrom(saved, today))
      setPending(null)
      toast('Settings saved')
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Could not save', { tone: 'error' })
    } finally {
      setBusy(false)
    }
  }

  const onSubmit = handleSubmit(async (values) => {
    // Schedule changes only touch future, unmarked meals in open months; preview them first.
    const config = scheduleConfig(toRow(values) as Subscription, offDays.data ?? [])
    const plans: PendingSave['plans'] = []
    for (const month of months.filter((m) => m.status === 'open')) {
      const plan = planRegeneration(await listMeals(month.id), month.period, config, today)
      if (!isEmptyPlan(plan)) plans.push({ month, plan })
    }
    if (plans.length) setPending({ values, plans })
    else await persist(values, [])
  })

  const fieldProps = { register, control, errors: formState.errors }
  return (
    <form className="space-y-4" onSubmit={onSubmit}>
      <section className="card space-y-4">
        <SectionHeader icon={Store} title="Vendor" />
        <VendorFields {...fieldProps} />
      </section>
      <section className="card space-y-4">
        <SectionHeader icon={CalendarDays} title="Schedule" description="Changes apply to future, unmarked meals in open months. Past and marked meals never change." />
        <ScheduleFields {...fieldProps} />
      </section>
      <section className="card space-y-4">
        <SectionHeader icon={HandCoins} title="Pricing & credit" description="The monthly fee applies to months opened from now on. To change the current month's fee, tap it on the Summary screen." />
        <PricingFields {...fieldProps} />
      </section>
      <label className="card flex items-center justify-between gap-3">
        <span className="text-sm font-medium">
          Active vendor
          <span className="block text-xs text-muted">Inactive vendors are hidden from Today and don't open new months.</span>
        </span>
        <input type="checkbox" className="toggle" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
      </label>
      <button type="submit" className="btn-primary w-full min-h-14" disabled={busy || formState.isSubmitting || (!formState.isDirty && isActive === sub.is_active)}>
        {busy || formState.isSubmitting ? 'Saving…' : 'Save changes'}
      </button>

      <ConfirmDialog
        open={!!pending}
        title="Update upcoming meals?"
        confirmLabel="Save & update"
        busy={busy}
        onCancel={() => setPending(null)}
        onConfirm={() => pending && persist(pending.values, pending.plans)}
      >
        {pending?.plans.map(({ month, plan }) => (
          <div key={month.id} className="card-flat space-y-1">
            <p className="font-semibold text-fg">{formatPeriod(month.period)}</p>
            <PlanList label="Added" items={plan.toAdd} />
            <PlanList label="Removed" items={plan.toRemove} />
            <PlanList label="Changed" items={plan.toUpdate.map((u) => ({ ...u.meal, status: u.status }))} />
          </div>
        ))}
        <p className="text-xs text-muted">Today's and past meals, and any meal you've already marked, are left alone.</p>
      </ConfirmDialog>
    </form>
  )
}

function PlanList({ label, items }: { label: string; items: { date: string; meal_type: 'lunch' | 'dinner' }[] }) {
  if (!items.length) return null
  const shown = items.slice(0, 8)
  return (
    <p className="text-muted">
      <span className="text-fg">
        {label} {items.length}:
      </span>{' '}
      {shown.map((m) => `${formatDay(m.date, 'd MMM')} ${MEAL_LABELS[m.meal_type].toLowerCase()}`).join(', ')}
      {items.length > shown.length && ` +${items.length - shown.length} more`}
    </p>
  )
}

function AppearanceAndAccount() {
  const { user, signOut } = useAuth()
  const profile = useProfile()
  const [theme, setThemeState] = useState<Theme>(getTheme)
  const name = profile.data?.full_name ?? (user?.user_metadata.full_name as string | undefined)
  const avatar = profile.data?.avatar_url ?? (user?.user_metadata.avatar_url as string | undefined)
  return (
    <section className="card space-y-4">
      <SectionHeader icon={Palette} title="Appearance" />
      <div className="space-y-1">
        <div className="grid grid-cols-3 gap-1 rounded-xl bg-surface-2 p-1">
          {(['system', 'light', 'dark'] as const).map((t) => (
            <button
              key={t}
              aria-pressed={theme === t}
              onClick={() => {
                setTheme(t)
                setThemeState(t)
              }}
              className={`flex min-h-11 items-center justify-center gap-1.5 rounded-lg text-sm font-medium capitalize transition-colors ${theme === t ? 'bg-surface text-fg ring-1 ring-line' : 'text-muted'}`}
            >
              {t === 'system' ? <Monitor className="h-4 w-4" /> : t === 'light' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              {t}
            </button>
          ))}
        </div>
      </div>
      <div className="flex items-center gap-3 border-t border-line pt-4">
        {avatar ? (
          <img src={avatar} alt="" referrerPolicy="no-referrer" className="h-11 w-11 shrink-0 rounded-full" />
        ) : (
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand-soft font-semibold text-brand-strong">{(name ?? user?.email ?? '?')[0]!.toUpperCase()}</span>
        )}
        <span className="min-w-0 flex-1">
          {name && <span className="block truncate text-sm font-medium">{name}</span>}
          <span className="block truncate text-xs text-muted">{profile.data?.email ?? user?.email}</span>
        </span>
        <button className="btn-ghost min-h-11 px-3 text-vendor hover:text-vendor" onClick={signOut}>
          <LogOut className="h-4 w-4" /> Sign out
        </button>
      </div>
    </section>
  )
}
