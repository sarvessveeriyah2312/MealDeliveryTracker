import type { ReactNode } from 'react'
import { CircleAlert } from 'lucide-react'
import { Spinner } from './Spinner'

export function Page({ title, eyebrow, action, children }: { title: ReactNode; eyebrow?: ReactNode; action?: ReactNode; children: ReactNode }) {
  return (
    <main className="px-4 pt-4 pb-8">
      <header className="mb-5 flex min-h-11 items-end justify-between gap-3">
        <div className="min-w-0">
          {eyebrow && <p className="mb-0.5 text-sm font-medium text-muted">{eyebrow}</p>}
          <h1 className="truncate text-[2rem] leading-tight font-bold tracking-tight">{title}</h1>
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
