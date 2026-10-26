import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react'

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

  return (
    <ToastContext.Provider value={show}>
      {children}
      <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-50 flex justify-center px-4">
        {toast && (
          <div
            key={toast.id}
            className={`pointer-events-auto flex w-full max-w-md items-center gap-3 rounded-xl px-4 py-3 text-sm shadow-lg ${toast.tone === 'error' ? 'bg-vendor text-white' : 'bg-fg text-bg'}`}
          >
            <span className="flex-1">{toast.message}</span>
            {toast.onAction && (
              <button
                className="min-h-11 rounded-lg px-3 font-semibold text-brand"
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
