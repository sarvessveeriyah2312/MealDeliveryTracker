import { LoaderCircle } from 'lucide-react'

export function Spinner({ className = '' }: { className?: string }) {
  return <LoaderCircle role="status" aria-label="Loading" className={`h-6 w-6 animate-spin ${className}`} />
}

export function FullScreenSpinner() {
  return (
    <div className="flex min-h-dvh items-center justify-center text-brand">
      <Spinner />
    </div>
  )
}
