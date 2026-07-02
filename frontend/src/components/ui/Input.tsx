import { forwardRef, type InputHTMLAttributes } from 'react'
import { cn } from '@/utils/cn'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  helperText?: string
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, helperText, id, ...props }, ref) => (
    <div className="space-y-1.5">
      {label && (
        <label htmlFor={id} className="block text-sm font-medium text-surface-700 dark:text-surface-300">
          {label}
        </label>
      )}
      <input
        ref={ref}
        id={id}
        className={cn(
          'block w-full rounded-xl border bg-white px-4 py-2.5 text-sm text-surface-900',
          'placeholder:text-surface-400',
          'transition-all duration-200',
          'focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20',
          'disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-surface-50',
          'dark:bg-surface-800 dark:text-surface-100 dark:placeholder:text-surface-500',
          'dark:focus:border-primary-400 dark:focus:ring-primary-400/20',
          error
            ? 'border-danger focus:border-danger focus:ring-danger/20'
            : 'border-surface-300 dark:border-surface-600',
          className,
        )}
        {...props}
      />
      {error && <p className="text-xs text-danger">{error}</p>}
      {helperText && !error && <p className="text-xs text-surface-400">{helperText}</p>}
    </div>
  ),
)
Input.displayName = 'Input'
