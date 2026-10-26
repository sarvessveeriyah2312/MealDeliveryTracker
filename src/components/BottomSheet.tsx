import { useEffect, type ReactNode } from 'react'
import { X } from 'lucide-react'

export function BottomSheet({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: ReactNode }) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = overflow
    }
  }, [open, onClose])

  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center" role="dialog" aria-modal="true" aria-label={title}>
      <button aria-label="Close" className="animate-fade absolute inset-0 bg-slate-950/45 backdrop-blur-[2px]" onClick={onClose} />
      <div className="animate-sheet relative max-h-[90dvh] w-full max-w-md overflow-y-auto rounded-t-[1.5rem] bg-surface px-5 pt-2 pb-[calc(1.5rem+env(safe-area-inset-bottom))] shadow-[var(--shadow-float)]">
        <div className="sticky top-0 z-10 -mx-5 bg-surface px-5 pt-1 pb-3">
          <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-line" />
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-xl font-semibold tracking-tight">{title}</h2>
            <button className="icon-btn -mr-2 bg-surface-2" aria-label="Close" onClick={onClose}>
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>
        {children}
      </div>
    </div>
  )
}
