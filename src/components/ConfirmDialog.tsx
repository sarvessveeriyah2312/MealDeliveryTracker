import type { ReactNode } from 'react'
import { BottomSheet } from './BottomSheet'

export function ConfirmDialog(props: {
  open: boolean
  title: string
  children: ReactNode
  confirmLabel: string
  tone?: 'primary' | 'danger'
  busy?: boolean
  onConfirm: () => void
  onCancel: () => void
}) {
  return (
    <BottomSheet open={props.open} onClose={props.onCancel} title={props.title}>
      <div className="space-y-3 text-sm">{props.children}</div>
      <div className="mt-5 grid grid-cols-2 gap-3">
        <button className="btn-secondary" onClick={props.onCancel} disabled={props.busy}>
          Cancel
        </button>
        <button className={props.tone === 'danger' ? 'btn-danger' : 'btn-primary'} onClick={props.onConfirm} disabled={props.busy}>
          {props.busy ? 'Working…' : props.confirmLabel}
        </button>
      </div>
    </BottomSheet>
  )
}
