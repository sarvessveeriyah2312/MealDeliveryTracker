import { Ban, CalendarOff, CircleCheck, CircleX, Clock, type LucideIcon } from 'lucide-react'
import type { MealStatus } from '@/lib/constants'

export const STATUS_DOT: Record<MealStatus, string> = {
  delivered: 'bg-delivered border-delivered',
  vendor_cancelled: 'bg-vendor border-vendor',
  user_cancelled: 'bg-user border-user',
  no_service: 'bg-noservice border-noservice',
  scheduled: 'bg-transparent border-muted/60',
}

export const STATUS_PILL: Record<MealStatus, string> = {
  delivered: 'bg-delivered/12 text-delivered',
  vendor_cancelled: 'bg-vendor/12 text-vendor',
  user_cancelled: 'bg-user/15 text-user',
  no_service: 'bg-noservice/15 text-muted',
  scheduled: 'bg-surface-2 text-muted',
}

/** Solid fill used when a status is the selected one. */
export const STATUS_SOLID: Record<MealStatus, string> = {
  delivered: 'bg-delivered text-white border-delivered dark:text-bg',
  vendor_cancelled: 'bg-vendor text-white border-vendor dark:text-bg',
  user_cancelled: 'bg-user text-white border-user dark:text-bg',
  no_service: 'bg-noservice text-white border-noservice dark:text-bg',
  scheduled: 'bg-fg text-bg border-fg',
}

export const STATUS_ICON: Record<MealStatus, LucideIcon> = {
  delivered: CircleCheck,
  vendor_cancelled: CircleX,
  user_cancelled: Ban,
  no_service: CalendarOff,
  scheduled: Clock,
}
