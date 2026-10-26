import { useMemo, useState } from 'react'
import { BottomSheet } from '@/components/BottomSheet'
import { MonthSwitcher } from '@/components/MonthSwitcher'
import { ErrorBox, Loading, Page } from '@/components/Page'
import { StatusDot } from '@/components/StatusDot'
import { useToast } from '@/components/Toast'
import { statusPatch, useUpdateMeals } from '@/hooks/mutations'
import { useCurrentSubscription } from '@/hooks/useCurrentSubscription'
import { useMonthData, useMonthsWithCurrent } from '@/hooks/useMonthData'
import type { Month } from '@/api/types'
import { MEAL_LABELS, STATUS_LABELS, type MealStatus, type MealType } from '@/lib/constants'
import { eachDay, formatDay } from '@/lib/dates'
import { DayGrid } from './DayGrid'
import { MealEditor } from './MealEditor'

export function CalendarPage() {
  const { subscription: sub } = useCurrentSubscription()
  const { months, current, today, isLoading, error } = useMonthsWithCurrent(sub.id)
  const [monthId, setMonthId] = useState<string | null>(null)
  const month = months.find((m) => m.id === monthId) ?? current

  if (isLoading) return <Page title="Calendar"><Loading /></Page>
  if (error) return <Page title="Calendar"><ErrorBox error={error} /></Page>
  if (!month) return <Page title="Calendar"><p className="card text-sm text-muted">No months yet.</p></Page>
  return <CalendarMonth key={month.id} month={month} months={months} today={today} onChangeMonth={(m) => setMonthId(m.id)} />
}

const BULK: { status: MealStatus; label: string }[] = [
  { status: 'user_cancelled', label: '🙅 I cancelled' },
  { status: 'vendor_cancelled', label: "❌ Didn't deliver" },
  { status: 'delivered', label: '✅ Delivered' },
  { status: 'scheduled', label: '↺ Clear' },
]

function CalendarMonth({ month, months, today, onChangeMonth }: { month: Month; months: Month[]; today: string; onChangeMonth: (m: Month) => void }) {
  const { subscription: sub } = useCurrentSubscription()
  const data = useMonthData(sub, month)
  const update = useUpdateMeals(month.id)
  const toast = useToast()
  const [openDay, setOpenDay] = useState<string | null>(null)
  const [selecting, setSelecting] = useState(false)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [bulkTypes, setBulkTypes] = useState<MealType[]>(['lunch', 'dinner'])
  const locked = month.status === 'closed'

  const selectedMeals = useMemo(
    () => data.meals.filter((m) => selected.has(m.date) && bulkTypes.includes(m.meal_type) && m.status !== 'no_service'),
    [data.meals, selected, bulkTypes],
  )

  if (data.isLoading || !data.ctx) return <Page title="Calendar"><Loading /></Page>
  if (data.error) return <Page title="Calendar"><ErrorBox error={data.error} /></Page>

  const toggle = (date: string) =>
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(date)) next.delete(date)
      else next.add(date)
      return next
    })

  const fillRange = () => {
    const dates = [...selected].sort()
    if (dates.length >= 2) setSelected(new Set(eachDay(dates[0]!, dates[dates.length - 1]!)))
  }

  const exitSelect = () => {
    setSelecting(false)
    setSelected(new Set())
  }

  const bulkMark = (status: MealStatus) => {
    const targets = selectedMeals
    const before = targets.map((m) => ({ id: m.id, status: m.status, cancelled_at: m.cancelled_at }))
    update.mutate(
      { ids: targets.map((m) => m.id), patch: statusPatch(status) },
      {
        onSuccess: () => {
          toast(`${targets.length} meals → ${STATUS_LABELS[status]}`, {
            onAction: () => before.forEach((b) => update.mutate({ ids: [b.id], patch: { status: b.status, cancelled_at: b.cancelled_at } })),
          })
          exitSelect()
        },
        onError: (e) => toast(e.message, { tone: 'error' }),
      },
    )
  }

  const dayMeals = openDay ? data.meals.filter((m) => m.date === openDay) : []

  return (
    <Page
      title="Calendar"
      action={
        !locked && (
          <button className="btn-secondary" onClick={() => (selecting ? exitSelect() : setSelecting(true))}>
            {selecting ? 'Done' : 'Select'}
          </button>
        )
      }
    >
      <MonthSwitcher months={months} value={month} onChange={onChangeMonth} />
      <DayGrid
        period={month.period}
        today={today}
        meals={data.meals}
        selected={selected}
        onTap={(d) => (selecting ? toggle(d) : setOpenDay(d))}
        onLongPress={(d) => {
          if (locked) return
          setSelecting(true)
          toggle(d)
        }}
      />
      <Legend />
      {!selecting && !locked && <p className="text-center text-xs text-muted">Tap a day to edit · long-press to select several days</p>}

      {selecting && (
        <div className="fixed inset-x-0 bottom-[calc(4rem+env(safe-area-inset-bottom))] z-30 px-3">
          <div className="mx-auto max-w-md space-y-2 rounded-2xl border border-line bg-surface p-3 shadow-xl">
            <div className="flex items-center justify-between text-sm">
              <span>
                {selected.size} day{selected.size === 1 ? '' : 's'} · {selectedMeals.length} meals
              </span>
              <button className="min-h-11 px-2 text-brand disabled:opacity-40" disabled={selected.size < 2} onClick={fillRange}>
                Fill range
              </button>
            </div>
            <div className="flex gap-2">
              {(['lunch', 'dinner'] as const).map((t) => (
                <button
                  key={t}
                  aria-pressed={bulkTypes.includes(t)}
                  onClick={() => setBulkTypes((b) => (b.includes(t) ? b.filter((x) => x !== t) : [...b, t]))}
                  className={`min-h-11 flex-1 rounded-xl border text-sm ${bulkTypes.includes(t) ? 'border-brand bg-brand/10 font-semibold' : 'border-line'}`}
                >
                  {MEAL_LABELS[t]}
                </button>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-2">
              {BULK.map((b) => (
                <button key={b.status} className="btn-secondary text-sm" disabled={!selectedMeals.length || update.isPending} onClick={() => bulkMark(b.status)}>
                  {b.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      <BottomSheet open={!!openDay} onClose={() => setOpenDay(null)} title={openDay ? formatDay(openDay, 'EEEE, d MMMM') : ''}>
        {dayMeals.length === 0 ? (
          <p className="text-sm text-muted">No meals scheduled on this day.</p>
        ) : (
          <div className="space-y-4">
            {locked && <p className="text-sm text-muted">🔒 This month is closed. Reopen it from Summary to edit.</p>}
            {dayMeals.map((m) => (
              <MealEditor
                key={`${m.id}-${m.status}-${m.note}-${m.credit_override}-${m.cancelled_at}`}
                meal={m}
                ctx={data.ctx!}
                locked={locked}
                autoDeliver={sub.auto_mark_delivered}
                onSave={(patch) =>
                  update.mutate(
                    { ids: [m.id], patch },
                    { onSuccess: () => toast(`${MEAL_LABELS[m.meal_type]} saved`), onError: (e) => toast(e.message, { tone: 'error' }) },
                  )
                }
              />
            ))}
          </div>
        )}
      </BottomSheet>
    </Page>
  )
}

function Legend() {
  const items: MealStatus[] = ['delivered', 'vendor_cancelled', 'user_cancelled', 'no_service', 'scheduled']
  return (
    <div className="flex flex-wrap justify-center gap-x-3 gap-y-1 text-xs text-muted">
      {items.map((s) => (
        <span key={s} className="flex items-center gap-1">
          <StatusDot status={s} /> {STATUS_LABELS[s]}
        </span>
      ))}
      <span>· left dot lunch, right dinner</span>
    </div>
  )
}
