import { STATUS_LABELS, type MealStatus } from '@/lib/constants'
import { STATUS_ICON, STATUS_PILL } from './status'

export function StatusPill({ status, children }: { status: MealStatus; children?: React.ReactNode }) {
  const Icon = STATUS_ICON[status]
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${STATUS_PILL[status]}`}>
      <Icon className="h-3.5 w-3.5" strokeWidth={2.5} />
      {children ?? STATUS_LABELS[status]}
    </span>
  )
}

export function StatusIcon({ status, className = 'h-4 w-4' }: { status: MealStatus; className?: string }) {
  const Icon = STATUS_ICON[status]
  return <Icon className={className} />
}
