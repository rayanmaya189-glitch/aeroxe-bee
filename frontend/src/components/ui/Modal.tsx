import { useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/utils/cn'

interface ModalProps {
  open: boolean
  onClose: () => void
  title?: string
  description?: string
  children: React.ReactNode
  footer?: React.ReactNode
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full'
  className?: string
}

const sizeClasses = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
  full: 'max-w-3xl',
}

export function Modal({ open, onClose, title, description, children, footer, size = 'md', className }: ModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    if (open) {
      document.addEventListener('keydown', handler)
      document.body.style.overflow = 'hidden'
    }
    return () => {
      document.removeEventListener('keydown', handler)
      document.body.style.overflow = ''
    }
  }, [open, onClose])

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            ref={overlayRef}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={(e) => e.target === overlayRef.current && onClose()}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ type: 'spring', duration: 0.3, bounce: 0.3 }}
            role="dialog"
            aria-modal="true"
            className={cn(
              'relative w-full rounded-2xl border bg-white p-6 shadow-xl',
              'dark:bg-surface-800 dark:border-surface-700',
              sizeClasses[size],
              className,
            )}
          >
            {title && (
              <div className="mb-2">
                <h2 className="text-lg font-semibold text-surface-900 dark:text-surface-100">{title}</h2>
                {description && <p className="mt-1 text-sm text-surface-500 dark:text-surface-400">{description}</p>}
              </div>
            )}
            <div className="max-h-[60vh] overflow-y-auto">{children}</div>
            {footer && <div className="mt-6 flex items-center justify-end gap-3 border-t border-surface-100 pt-4 dark:border-surface-700">{footer}</div>}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
