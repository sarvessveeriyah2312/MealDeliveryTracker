import { CalendarDays, FileChartColumn, House, Settings, Wallet, type LucideIcon } from 'lucide-react'

export const NAV_ITEMS: { to: string; label: string; icon: LucideIcon }[] = [
  { to: '/', label: 'Today', icon: House },
  { to: '/calendar', label: 'Calendar', icon: CalendarDays },
  { to: '/summary', label: 'Summary', icon: Wallet },
  { to: '/reports', label: 'Reports', icon: FileChartColumn },
  { to: '/settings', label: 'Settings', icon: Settings },
]
