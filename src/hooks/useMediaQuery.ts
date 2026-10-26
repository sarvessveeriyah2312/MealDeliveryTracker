import { useSyncExternalStore } from 'react'

export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (onChange) => {
      const mql = window.matchMedia(query)
      mql.addEventListener('change', onChange)
      return () => mql.removeEventListener('change', onChange)
    },
    () => window.matchMedia(query).matches,
  )
}

/** Matches Tailwind's `lg` breakpoint, where the app switches to side navigation and two columns. */
export const useIsDesktop = () => useMediaQuery('(min-width: 1024px)')
