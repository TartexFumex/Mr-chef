import { create } from 'zustand'

interface Toast {
  id: number
  text: string
  kind: 'info' | 'error'
}
interface ToastState {
  toasts: Toast[]
  push(text: string, kind?: Toast['kind']): void
  dismiss(id: number): void
}

let seq = 0
export const useToasts = create<ToastState>((set, get) => ({
  toasts: [],
  push(text, kind = 'info') {
    const id = ++seq
    set({ toasts: [...get().toasts, { id, text, kind }] })
    setTimeout(() => get().dismiss(id), kind === 'error' ? 8000 : 4000)
  },
  dismiss(id) {
    set({ toasts: get().toasts.filter((t) => t.id !== id) })
  },
}))

export const toast = (text: string) => useToasts.getState().push(text, 'info')
export const toastError = (text: string) => useToasts.getState().push(text, 'error')

export function Toasts() {
  const { toasts, dismiss } = useToasts()
  return (
    <div className="toasts" role="status" aria-live="polite">
      {toasts.map((t) => (
        <div key={t.id} className={`toast ${t.kind}`}>
          <span>{t.text}</span>
          <button type="button" onClick={() => dismiss(t.id)} aria-label="Fermer">
            OK
          </button>
        </div>
      ))}
    </div>
  )
}
