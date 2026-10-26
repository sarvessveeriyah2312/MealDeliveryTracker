import { useState } from 'react'
import type { Meal, Month } from '@/api/types'
import { BottomSheet } from '@/components/BottomSheet'
import { MoneyRow } from '@/components/MoneyRow'
import { UnmarkedMealsList } from '@/components/UnmarkedMealsList'
import { nextOpeningCredit, round2, type Statement } from '@/lib/billing'
import type { MealStatus } from '@/lib/constants'
import { addMonths, formatPeriod, lastDayOfPeriod } from '@/lib/dates'

export function CloseMonthSheet(props: {
  open: boolean
  onClose: () => void
  month: Month
  today: string
  statement: Statement
  unmarked: Meal[]
  autoMark: boolean
  carryForward: boolean
  onMark: (ids: string[], status: MealStatus) => void
  onConfirm: () => Promise<void>
}) {
  const [busy, setBusy] = useState(false)
  const blocked = props.unmarked.length > 0 && !props.autoMark
  const early = props.today <= lastDayOfPeriod(props.month.period)
  const closing = round2(props.statement.closing_credit)

  const confirm = async () => {
    setBusy(true)
    try {
      await props.onConfirm()
    } finally {
      setBusy(false)
    }
  }

  return (
    <BottomSheet open={props.open} onClose={props.onClose} title={`Close ${formatPeriod(props.month.period)}`}>
      <div className="space-y-4">
        {blocked ? (
          <>
            <p className="text-sm">
              Resolve <strong>{props.unmarked.length}</strong> unmarked past meal{props.unmarked.length === 1 ? '' : 's'} first.
            </p>
            <UnmarkedMealsList meals={props.unmarked} onMark={props.onMark} />
          </>
        ) : (
          <>
            {props.unmarked.length > 0 && (
              <p className="rounded-xl bg-bg p-3 text-sm">
                {props.unmarked.length} unmarked past meal{props.unmarked.length === 1 ? '' : 's'} will be marked as delivered (auto-mark is on).
              </p>
            )}
            {early && (
              <p className="rounded-xl bg-user/15 p-3 text-sm text-user">
                {formatPeriod(props.month.period)} isn't over yet. Meals after today stay as they are and won't earn credit unless you reopen.
              </p>
            )}
            <div className="card">
              <MoneyRow label="Closing credit" amount={closing} strong />
              <MoneyRow label={`Opening credit for ${formatPeriod(addMonths(props.month.period, 1))}`} amount={nextOpeningCredit(closing, props.carryForward)} />
              {props.statement.outstanding > 0 && <MoneyRow label="Still unpaid this month" amount={props.statement.outstanding} />}
            </div>
            <p className="text-xs text-muted">Closing locks this month's meals. You can reopen it later; credit will be recalculated for later months.</p>
          </>
        )}
        <button className="btn-primary w-full" disabled={blocked || busy} onClick={confirm}>
          {busy ? 'Closing…' : `Close ${formatPeriod(props.month.period)}`}
        </button>
      </div>
    </BottomSheet>
  )
}
