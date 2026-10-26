import type { MealStatus } from '@/lib/constants'
import { STATUS_DOT } from './status'

export function StatusDot({ status, className = '' }: { status: MealStatus | undefined; className?: string }) {
  if (!status) return <span className={`inline-block h-1.5 w-1.5 ${className}`} />
  return <span className={`inline-block h-1.5 w-1.5 rounded-full border ${STATUS_DOT[status]} ${className}`} />
}
