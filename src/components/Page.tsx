import { useEffect, useRef, useState, type ReactNode } from 'react'
import { CircleAlert } from 'lucide-react'
import { Spinner } from './Spinner'

/**
 * Screen scaffold. On phones the large title collapses into a compact, blurred bar pinned to the
 * top once it scrolls away, the way native iOS screens behave.
 */
export function Page({ title, eyebrow, action, children }: { title: ReactNode; eyebrow?: ReactNode; action?: ReactNode; children: ReactNode }) {
  const titleRef = useRef<HTMLHeadingElement>(null)
  const [compact, setCompact] = useState(false)

  useEffect(() => {
    const el = titleRef.current
    if (!el) return
    const io = new IntersectionObserver(([entry]) => setCompact(!entry!.isIntersecting), { rootMargin: '-44px 0px 0px 0px' })
    io.observe(el)
    return () => io.disconnect()
  }, [])

  return (
    <main className="px-4 pt-4 pb-8">
      <div
        aria-hidden={!compact}
        className={`fixed inset-x-0 top-0 z-30 border-b bg-bg/85 pt-[env(safe-area-inset-top)] backdrop-blur-xl transition-[opacity,border-color] duration-200 lg:hidden ${
          compact ? 'border-line opacity-100' : 'pointer-events-none border-transparent opacity-0'
        }`}
      >
        <p className="mx-auto flex h-11 max-w-2xl items-center justify-center truncate px-16 text-[0.95rem] font-semibold">{title}</p>
      </div>
      <header className="mb-5 flex min-h-11 items-end justify-between gap-3">
        <div className="min-w-0">
          {eyebrow && <p className="mb-0.5 text-sm font-medium text-muted">{eyebrow}</p>}
          <h1 ref={titleRef} className="truncate text-[2rem] leading-tight font-bold tracking-tight">
            {title}
          </h1>
        </div>
        {action}
      </header>
      <div className="space-y-4">{children}</div>
    </main>
  )
}

export function Loading() {
  return (
    <div className="flex justify-center py-16 text-brand">
      <Spinner />
    </div>
  )
}

export function ErrorBox({ error }: { error: unknown }) {
  return (
    <div className="flex items-start gap-3 rounded-2xl bg-vendor/10 p-4 text-sm text-vendor">
      <CircleAlert className="mt-0.5 h-5 w-5 shrink-0" />
      <span>{error instanceof Error ? error.message : 'Something went wrong.'}</span>
    </div>
  )
}

export function EmptyState({ icon, title, children }: { icon: ReactNode; title: string; children?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-[1.25rem] border border-dashed border-line px-4 py-8 text-center">
      <div className="mb-1 text-muted">{icon}</div>
      <p className="font-semibold">{title}</p>
      {children && <div className="text-sm text-muted">{children}</div>}
    </div>
  )
}
