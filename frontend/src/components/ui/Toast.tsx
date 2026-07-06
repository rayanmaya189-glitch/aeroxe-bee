import { useState, useCallback, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/utils/cn'
import { CheckCircle, XCircle, AlertTriangle, Info, X } from 'lucide-react'

type ToastVariant = 'success' | 'error' | 'warning' | 'info'

interface GroupedToast {
  id: string
  variant: ToastVariant
  message: string
  count: number
  timerId: ReturnType<typeof setTimeout>
}

interface ToastContextValue {
  addToast: (message: string, variant?: ToastVariant) => void
  removeToast: (id: string) => void
}

let _context: ToastContextValue | null = null

export function useToast() {
  if (!_context) {
    throw new Error('useToast must be used within ToastProvider')
  }
  return _context
}

const variantStyles: Record<ToastVariant, string> = {
  success: 'border-emerald-500/20 bg-emerald-500/10 text-emerald-400',
  error: 'border-red-500/20 bg-red-500/10 text-red-400',
  warning: 'border-amber-500/20 bg-amber-500/10 text-amber-400',
  info: 'border-blue-500/20 bg-blue-500/10 text-blue-400',
}

const icons: Record<ToastVariant, React.ReactNode> = {
  success: <CheckCircle className="h-4 w-4" />,
  error: <XCircle className="h-4 w-4" />,
  warning: <AlertTriangle className="h-4 w-4" />,
  info: <Info className="h-4 w-4" />,
}

const TOAST_DURATION = 4000
const MAX_VISIBLE = 3

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<GroupedToast[]>([])
  const [showAll, setShowAll] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const scheduleRemove = useCallback((id: string) => {
    const timer = setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
    }, TOAST_DURATION)
    return timer
  }, [])

  const addToast = useCallback((message: string, variant: ToastVariant = 'info') => {
    setToasts((prev) => {
      const existing = prev.find((t) => t.variant === variant)
      if (existing) {
        // Extend timer for the grouped toast, increment count
        clearTimeout(existing.timerId)
        const newTimer = scheduleRemove(existing.id)
        return prev.map((t) =>
          t.id === existing.id
            ? { ...t, message, count: t.count + 1, timerId: newTimer }
            : t
        )
      }
      const id = Math.random().toString(36).slice(2)
      const timerId = scheduleRemove(id)
      return [...prev, { id, variant, message, count: 1, timerId }]
    })
  }, [scheduleRemove])

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => {
      const target = prev.find((t) => t.id === id)
      if (target) clearTimeout(target.timerId)
      return prev.filter((t) => t.id !== id)
    })
  }, [])

  // Auto-collapse back to MAX_VISIBLE when count drops to threshold or below
  useEffect(() => {
    if (showAll && toasts.length <= MAX_VISIBLE) {
      setShowAll(false)
    }
  }, [toasts.length, showAll])

  // Dismiss newest toast on click outside
  useEffect(() => {
    if (toasts.length === 0) return

    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        const newest = toasts[toasts.length - 1]
        if (newest) removeToast(newest.id)
      }
    }

    const timer = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside)
    }, 100)

    return () => {
      clearTimeout(timer)
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [toasts, removeToast])

  useEffect(() => {
    _context = { addToast, removeToast }
  }, [addToast, removeToast])

  // Keep a ref to the latest toasts so unmount cleanup can clear all active timers
  const toastsRef = useRef(toasts)
  toastsRef.current = toasts

  // Cleanup all timers on unmount
  useEffect(() => {
    return () => {
      toastsRef.current.forEach((t) => clearTimeout(t.timerId))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const visibleToasts = showAll ? toasts : toasts.slice(-MAX_VISIBLE)
  const hiddenCount = toasts.length - MAX_VISIBLE

  const clearAll = useCallback(() => {
    setToasts((prev) => {
      prev.forEach((t) => clearTimeout(t.timerId))
      return []
    })
    setShowAll(false)
  }, [])

  return (
    <>
      {children}
      {toasts.length > 0 && (
        <div ref={containerRef} className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
          <AnimatePresence>
            {hiddenCount > 0 && !showAll && (
              <motion.div
                key="actions-bar"
                layout
                initial={{ opacity: 0, y: 20, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -10, scale: 0.96 }}
                transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
                className="flex items-center gap-2"
              >
                <motion.button
                  layout
                  onClick={() => setShowAll(true)}
                  className={cn(
                    'flex cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-white/10 px-3 py-2 text-xs font-medium text-white/70 shadow-xl backdrop-blur-xl transition-colors hover:border-white/20 hover:text-white/90',
                    'bg-white/5',
                  )}
                >
                  <span className="flex h-4 min-w-[16px] items-center justify-center rounded-full bg-white/10 px-1 text-[10px] font-semibold text-white/80">
                    {hiddenCount > 99 ? '99+' : hiddenCount}
                  </span>
                  <span>more</span>
                </motion.button>
                <motion.button
                  layout
                  onClick={clearAll}
                  className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-red-500/20 bg-red-500/5 px-3 py-2 text-xs font-medium text-red-400/80 shadow-xl backdrop-blur-xl transition-colors hover:border-red-500/30 hover:text-red-300"
                >
                  <X className="h-3.5 w-3.5" />
                  <span>Dismiss all</span>
                </motion.button>
              </motion.div>
            )}
            {visibleToasts.map((toast) => (
              <motion.div
                key={toast.id}
                layout
                drag="x"
                dragSnapToOrigin
                dragElastic={0.2}
                initial={{ opacity: 0, y: 20, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 20, scale: 0.96 }}
                transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
                onDragEnd={(_, info) => {
                  if (Math.abs(info.offset.x) > 100 || Math.abs(info.velocity.x) > 500) {
                    removeToast(toast.id)
                  }
                }}
                whileDrag={{
                  opacity: 0.6,
                  scale: 0.95,
                  cursor: 'grabbing',
                  transition: { duration: 0 },
                }}
                className={cn(
                  'flex cursor-grab active:cursor-grabbing items-center gap-3 rounded-lg border px-4 py-3 text-sm font-medium shadow-xl backdrop-blur-xl touch-none select-none',
                  variantStyles[toast.variant],
                )}
                onClick={() => removeToast(toast.id)}
              >
                {icons[toast.variant]}
                <span className="flex-1">{toast.message}</span>
                {toast.count > 1 && (
                  <span className={cn(
                    'flex h-5 min-w-[20px] items-center justify-center rounded-full px-1.5 text-[11px] font-semibold',
                    toast.variant === 'success' ? 'bg-emerald-500/20 text-emerald-300' :
                    toast.variant === 'error' ? 'bg-red-500/20 text-red-300' :
                    toast.variant === 'warning' ? 'bg-amber-500/20 text-amber-300' :
                    'bg-blue-500/20 text-blue-300',
                  )}>
                    {toast.count > 99 ? '99+' : toast.count}
                  </span>
                )}
                <button
                  onClick={(e) => { e.stopPropagation(); removeToast(toast.id) }}
                  className="rounded p-0.5 hover:bg-white/10"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </>
  )
}

export function ToastContainer() {
  return null
}
