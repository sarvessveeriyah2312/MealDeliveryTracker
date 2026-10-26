import type { ReactNode } from 'react'
import { Spinner } from './Spinner'

export function Page({ title, action, children }: { title: string; action?: ReactNode; children: ReactNode }) {
  return (
    <main className="px-4 pt-3 pb-6">
      <header className="mb-4 flex min-h-11 items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">{title}</h1>
        {action}
      </header>
      <div className="space-y-4">{children}</div>
    </main>
  )
}

export function Loading() {
  return (
    <div className="flex justify-center py-16 text-muted">
      <Spinner />
    </div>
  )
}

export function ErrorBox({ error }: { error: unknown }) {
  return (
    <div className="card border-vendor/40 text-sm text-vendor">
      {error instanceof Error ? error.message : 'Something went wrong.'}
    </div>
  )
}
