import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react'
import { CircleAlert, CircleCheck } from 'lucide-react'

type ToastOptions = { actionLabel?: string; onAction?: () => void; tone?: 'default' | 'error' }
type ToastItem = ToastOptions & { id: number; message: string }

const ToastContext = createContext<((message: string, options?: ToastOptions) => void) | null>(null)

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<ToastItem | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  const show = useCallback((message: string, options: ToastOptions = {}) => {
    clearTimeout(timer.current)
    const id = Date.now()
    setToast({ id, message, ...options })
    timer.current = setTimeout(() => setToast((t) => (t?.id === id ? null : t)), options.onAction ? 6000 : 3500)
  }, [])

  const Icon = toast?.tone === 'error' ? CircleAlert : CircleCheck
  return (
    <ToastContext.Provider value={show}>
      {children}
      <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-[calc(5rem+env(safe-area-inset-bottom))] lg:bottom-8 lg:pl-60 z-[60] flex justify-center px-4">
        {toast && (
          <div
            key={toast.id}
            className={`animate-toast pointer-events-auto flex w-full max-w-md items-center gap-3 rounded-xl py-2 pr-2 pl-4 text-sm font-medium shadow-[var(--shadow-float)] ${
              toast.tone === 'error' ? 'bg-vendor text-white' : 'bg-fg text-bg'
            }`}
          >
            <Icon className={`h-5 w-5 shrink-0 ${toast.tone === 'error' ? '' : 'text-brand-soft dark:text-brand'}`} />
            <span className="flex-1 py-2">{toast.message}</span>
            {toast.onAction && (
              <button
                className="min-h-10 rounded-lg px-3 font-bold underline underline-offset-4 hover:bg-bg/10"
                onClick={() => {
                  toast.onAction?.()
                  setToast(null)
                }}
              >
                {toast.actionLabel ?? 'Undo'}
              </button>
            )}
          </div>
        )}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used inside ToastProvider')
  return ctx
}
