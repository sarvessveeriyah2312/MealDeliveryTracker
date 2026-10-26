import { useEffect, useRef, useState, type PointerEvent, type ReactNode } from 'react'
import { X } from 'lucide-react'

const DISMISS_DISTANCE = 110
const DISMISS_VELOCITY = 0.6 // px per ms

export function BottomSheet({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: ReactNode }) {
  const [dragY, setDragY] = useState(0)
  const drag = useRef<{ startY: number; startT: number; id: number } | null>(null)

  useEffect(() => {
    if (!open) return
    setDragY(0)
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = overflow
    }
  }, [open, onClose])

  // Pull the sheet down by its header to dismiss it, like a native sheet.
  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest('button')) return
    drag.current = { startY: e.clientY, startT: performance.now(), id: e.pointerId }
    e.currentTarget.setPointerCapture(e.pointerId)
  }
  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    if (drag.current?.id !== e.pointerId) return
    setDragY(Math.max(0, e.clientY - drag.current.startY))
  }
  const onPointerEnd = (e: PointerEvent<HTMLDivElement>) => {
    const d = drag.current
    if (d?.id !== e.pointerId) return
    drag.current = null
    const distance = Math.max(0, e.clientY - d.startY)
    const velocity = distance / Math.max(1, performance.now() - d.startT)
    if (distance > DISMISS_DISTANCE || velocity > DISMISS_VELOCITY) onClose()
    else setDragY(0)
  }

  if (!open) return null
  const dragging = drag.current !== null
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center" role="dialog" aria-modal="true" aria-label={title}>
      <button
        aria-label="Close"
        className="animate-fade absolute inset-0 bg-slate-950/45 backdrop-blur-[2px]"
        style={{ opacity: 1 - Math.min(dragY / 400, 0.6) }}
        onClick={onClose}
      />
      <div
        className="animate-sheet relative max-h-[90dvh] w-full max-w-md overflow-y-auto overscroll-contain rounded-t-[1.5rem] bg-surface px-5 pb-[calc(1.5rem+env(safe-area-inset-bottom))] shadow-[var(--shadow-float)]"
        style={{ transform: dragY ? `translateY(${dragY}px)` : undefined, transition: dragging ? 'none' : 'transform 220ms cubic-bezier(0.22, 1, 0.36, 1)' }}
      >
        <div
          className="sticky top-0 z-10 -mx-5 cursor-grab touch-none bg-surface px-5 pt-2 pb-3 active:cursor-grabbing"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerEnd}
          onPointerCancel={onPointerEnd}
        >
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
