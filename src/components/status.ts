import type { MealStatus } from '@/lib/constants'

export const STATUS_DOT: Record<MealStatus, string> = {
  delivered: 'bg-delivered border-delivered',
  vendor_cancelled: 'bg-vendor border-vendor',
  user_cancelled: 'bg-user border-user',
  no_service: 'bg-noservice border-noservice',
  scheduled: 'bg-transparent border-muted',
}

export const STATUS_PILL: Record<MealStatus, string> = {
  delivered: 'bg-delivered/15 text-delivered',
  vendor_cancelled: 'bg-vendor/15 text-vendor',
  user_cancelled: 'bg-user/15 text-user',
  no_service: 'bg-noservice/20 text-muted',
  scheduled: 'border border-line text-muted',
}

export const STATUS_EMOJI: Record<MealStatus, string> = {
  delivered: '✅',
  vendor_cancelled: '❌',
  user_cancelled: '🙅',
  no_service: '⛔',
  scheduled: '⏳',
}
