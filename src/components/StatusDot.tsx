import type { MealStatus } from '@/lib/constants'
import { STATUS_DOT } from './status'

export function StatusDot({ status, className = '' }: { status: MealStatus | undefined; className?: string }) {
  if (!status) return <span className={`inline-block h-2 w-2 ${className}`} />
  return <span className={`inline-block h-2 w-2 rounded-full border-[1.5px] ${STATUS_DOT[status]} ${className}`} />
}
