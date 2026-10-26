import { CalendarDays, FileChartColumn, House, Settings, Wallet, type LucideIcon } from 'lucide-react'
import { NavLink } from 'react-router-dom'

const tabs: { to: string; label: string; icon: LucideIcon }[] = [
  { to: '/', label: 'Today', icon: House },
  { to: '/calendar', label: 'Calendar', icon: CalendarDays },
  { to: '/summary', label: 'Summary', icon: Wallet },
  { to: '/reports', label: 'Reports', icon: FileChartColumn },
  { to: '/settings', label: 'Settings', icon: Settings },
]

export function BottomNav() {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-bg/92 pb-[env(safe-area-inset-bottom)] backdrop-blur-lg">
      <ul className="mx-auto grid max-w-md grid-cols-5">
        {tabs.map(({ to, label, icon: Icon }) => (
          <li key={to}>
            <NavLink
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                `relative flex min-h-15 flex-col items-center justify-center gap-1 text-[0.7rem] font-semibold transition-colors ${
                  isActive ? 'text-brand' : 'text-muted hover:text-fg'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <span aria-hidden className={`absolute top-0 h-[3px] w-8 rounded-b-full transition-colors ${isActive ? 'bg-brand' : 'bg-transparent'}`} />
                  <Icon className="h-[1.35rem] w-[1.35rem]" strokeWidth={isActive ? 2.4 : 2} />
                  {label}
                </>
              )}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  )
}
