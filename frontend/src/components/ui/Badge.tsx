import { type ReactNode } from 'react'
import { cn } from '@/utils/cn'

type BadgeVariant = 'default' | 'primary' | 'success' | 'warning' | 'danger' | 'info'
type BadgeSize = 'sm' | 'md'

interface BadgeProps {
  children: ReactNode
  variant?: BadgeVariant
  size?: BadgeSize
  dot?: boolean
  className?: string
}

const variantStyles: Record<BadgeVariant, string> = {
  default:
    'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
  primary:
    'bg-primary-50 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300',
  success:
    'bg-success-50 text-success-700 dark:bg-success-900/30 dark:text-success-300',
  warning:
    'bg-warning-50 text-warning-700 dark:bg-warning-900/30 dark:text-warning-300',
  danger:
    'bg-danger-50 text-danger-700 dark:bg-danger-900/30 dark:text-danger-300',
  info:
    'bg-info-50 text-info-700 dark:bg-info-900/30 dark:text-info-300',
}

const dotColors: Record<BadgeVariant, string> = {
  default: 'bg-gray-500',
  primary: 'bg-primary-500',
  success: 'bg-success-500',
  warning: 'bg-warning-500',
  danger: 'bg-danger-500',
  info: 'bg-info-500',
}

export function Badge({
  children,
  variant = 'default',
  size = 'sm',
  dot = false,
  className,
}: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 font-medium rounded-full',
        size === 'sm' && 'px-2 py-0.5 text-xs',
        size === 'md' && 'px-2.5 py-1 text-sm',
        variantStyles[variant],
        className,
      )}
    >
      {dot && (
        <span className={cn('h-1.5 w-1.5 rounded-full', dotColors[variant])} />
      )}
      {children}
    </span>
  )
}
