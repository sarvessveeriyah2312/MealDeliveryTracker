import { NavLink } from 'react-router-dom'
import { useAuth } from '@/auth/AuthProvider'
import { useProfile } from '@/hooks/useProfile'
import { NAV_ITEMS } from './navItems'

/** Desktop navigation rail; the bottom bar takes over below the `lg` breakpoint. */
export function SideNav() {
  const { user } = useAuth()
  const profile = useProfile()
  const name = profile.data?.full_name ?? (user?.user_metadata.full_name as string | undefined) ?? user?.email
  const avatar = profile.data?.avatar_url ?? (user?.user_metadata.avatar_url as string | undefined)

  return (
    <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col border-r border-line px-4 py-6 lg:flex">
      <div className="mb-8 flex items-center gap-2.5 px-2">
        <img src="/icon.svg" alt="" className="h-9 w-9 rounded-xl" />
        <span className="font-display text-xl font-bold tracking-tight">MealTrack</span>
      </div>
      <nav>
        <ul className="space-y-1">
          {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
            <li key={to}>
              <NavLink
                to={to}
                end={to === '/'}
                className={({ isActive }) =>
                  `flex min-h-11 items-center gap-3 rounded-xl px-3 font-semibold transition-colors ${
                    isActive ? 'bg-brand-soft text-brand-strong' : 'text-muted hover:bg-surface-2 hover:text-fg'
                  }`
                }
              >
                <Icon className="h-5 w-5" />
                {label}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
      <div className="mt-auto flex items-center gap-3 px-2">
        {avatar ? (
          <img src={avatar} alt="" referrerPolicy="no-referrer" className="h-9 w-9 rounded-full" />
        ) : (
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-soft text-sm font-semibold text-brand-strong">{name?.[0]?.toUpperCase()}</span>
        )}
        <span className="min-w-0 truncate text-sm font-medium">{name}</span>
      </div>
    </aside>
  )
}
