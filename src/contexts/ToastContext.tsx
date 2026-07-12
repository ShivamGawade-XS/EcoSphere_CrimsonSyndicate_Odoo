/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, useCallback } from 'react'
import { CheckCircle, XCircle, AlertTriangle, Info, X } from 'lucide-react'

type ToastType = 'success' | 'error' | 'warning' | 'info'

interface Toast {
  id: string
  type: ToastType
  title: string
  message?: string
}

interface ToastContextValue {
  toast: (type: ToastType, title: string, message?: string) => void
  success: (title: string, message?: string) => void
  error: (title: string, message?: string) => void
  warning: (title: string, message?: string) => void
  info: (title: string, message?: string) => void
}

const ToastContext = createContext<ToastContextValue>({
  toast: () => {},
  success: () => {},
  error: () => {},
  warning: () => {},
  info: () => {},
})

const ICONS = {
  success: CheckCircle,
  error: XCircle,
  warning: AlertTriangle,
  info: Info,
}

const STYLES = {
  success: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400',
  error:   'border-red-500/30 bg-red-500/10 text-red-400',
  warning: 'border-amber-500/30 bg-amber-500/10 text-amber-400',
  info:    'border-blue-500/30 bg-blue-500/10 text-blue-400',
}

let toastCount = 0

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  const toast = useCallback((type: ToastType, title: string, message?: string) => {
    const id = `toast-${++toastCount}`
    setToasts(prev => [...prev, { id, type, title, message }])
    setTimeout(() => removeToast(id), 4000)
  }, [removeToast])

  const success = useCallback((title: string, msg?: string) => toast('success', title, msg), [toast])
  const error   = useCallback((title: string, msg?: string) => toast('error', title, msg), [toast])
  const warning = useCallback((title: string, msg?: string) => toast('warning', title, msg), [toast])
  const info    = useCallback((title: string, msg?: string) => toast('info', title, msg), [toast])

  return (
    <ToastContext.Provider value={{ toast, success, error, warning, info }}>
      {children}

      {/* Toast Portal */}
      <div className="fixed bottom-5 right-5 z-[9999] flex flex-col gap-2 pointer-events-none">
        {toasts.map(t => {
          const Icon = ICONS[t.type]
          return (
            <div
              key={t.id}
              className={`pointer-events-auto flex items-start gap-3 px-4 py-3 rounded-xl border shadow-xl backdrop-blur-sm animate-fade-in max-w-sm ${STYLES[t.type]}`}
            >
              <Icon className="w-4 h-4 mt-0.5 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground leading-tight">{t.title}</p>
                {t.message && <p className="text-xs text-muted-foreground mt-0.5">{t.message}</p>}
              </div>
              <button
                onClick={() => removeToast(t.id)}
                className="shrink-0 text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )
        })}
      </div>
    </ToastContext.Provider>
  )
}

export const useToast = () => useContext(ToastContext)
