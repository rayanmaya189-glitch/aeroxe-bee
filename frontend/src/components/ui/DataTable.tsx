import { useState, useCallback, type ReactNode } from 'react'
import { cn } from '@/utils/cn'
import { Skeleton } from './Skeleton'
import { EmptyState } from './EmptyState'

export interface Column<T> {
  key: string
  header: string
  sortKey?: string
  render?: (item: T) => ReactNode
  className?: string
  width?: string
}

interface DataTableProps<T> {
  columns: Column<T>[]
  data: T[]
  keyExtractor: (item: T) => string
  loading?: boolean
  loadingRows?: number
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
  onSort?: (key: string) => void
  selected?: Set<string>
  onSelect?: (id: string) => void
  onSelectAll?: () => void
  emptyTitle?: string
  emptyDescription?: string
  emptyAction?: ReactNode
  onRowClick?: (item: T) => void
  className?: string
}

export function DataTable<T extends object>({
  columns,
  data,
  keyExtractor,
  loading,
  loadingRows = 5,
  sortBy,
  sortOrder,
  onSort,
  selected,
  onSelect,
  onSelectAll,
  emptyTitle = 'No data found',
  emptyDescription,
  emptyAction,
  onRowClick,
  className,
}: DataTableProps<T>) {
  const [hoveredRow, setHoveredRow] = useState<string | null>(null)

  const renderSortIcon = useCallback(
    (key: string) => {
      if (sortBy !== key) {
        return (
          <svg className="h-3.5 w-3.5 text-surface-300 dark:text-surface-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
          </svg>
        )
      }
      return (
        <svg className={cn('h-3.5 w-3.5', sortOrder === 'asc' ? 'rotate-180' : '')} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      )
    },
    [sortBy, sortOrder],
  )

  if (loading) {
    return (
      <div className={cn('rounded-2xl border bg-white p-4 dark:bg-surface-800 dark:border-surface-700', className)}>
        <Skeleton className="mb-4 h-4 w-48" />
        <div className="divide-y divide-surface-100 dark:divide-surface-700">
          {Array.from({ length: loadingRows }).map((_, i) => (
            <div key={i} className="flex gap-4 py-3">
              {columns.map((col) => (
                <Skeleton key={col.key} className="h-3 flex-1" />
              ))}
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (data.length === 0) {
    return (
      <div className={cn('rounded-2xl border bg-white dark:bg-surface-800 dark:border-surface-700', className)}>
        <EmptyState title={emptyTitle} description={emptyDescription} action={emptyAction} />
      </div>
    )
  }

  return (
    <div className={cn('overflow-hidden rounded-2xl border bg-white dark:bg-surface-800 dark:border-surface-700', className)}>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-surface-100 bg-surface-50/50 dark:border-surface-700 dark:bg-surface-800/50">
              {onSelect && onSelectAll && (
                <th className="w-10 px-4 py-3">
                  <input
                    type="checkbox"
                    checked={selected?.size === data.length && data.length > 0}
                    onChange={onSelectAll}
                    className="h-4 w-4 rounded border-surface-300 text-primary-600 focus:ring-primary-500"
                  />
                </th>
              )}
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={cn(
                    'px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-surface-500 dark:text-surface-400',
                    col.sortKey && 'cursor-pointer select-none hover:text-surface-700 dark:hover:text-surface-200',
                    col.className,
                  )}
                  style={{ width: col.width }}
                  onClick={() => col.sortKey && onSort?.(col.sortKey)}
                >
                  <div className="flex items-center gap-1.5">
                    {col.header}
                    {col.sortKey && renderSortIcon(col.sortKey)}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-surface-100 dark:divide-surface-700">
            {data.map((item) => {
              const id = keyExtractor(item)
              return (
                <tr
                  key={id}
                  className={cn(
                    'transition-colors duration-150',
                    onRowClick && 'cursor-pointer',
                    hoveredRow === id ? 'bg-surface-50 dark:bg-surface-700/50' : 'bg-white dark:bg-surface-800',
                  )}
                  onMouseEnter={() => setHoveredRow(id)}
                  onMouseLeave={() => setHoveredRow(null)}
                  onClick={() => onRowClick?.(item)}
                >
                  {onSelect && (
                    <td className="w-10 px-4 py-3">
                      <input
                        type="checkbox"
                        checked={selected?.has(id)}
                        onChange={() => onSelect(id)}
                        onClick={(e) => e.stopPropagation()}
                        className="h-4 w-4 rounded border-surface-300 text-primary-600 focus:ring-primary-500"
                      />
                    </td>
                  )}
                  {columns.map((col) => (
                    <td
                      key={col.key}
                      className={cn('whitespace-nowrap px-4 py-3 text-sm text-surface-700 dark:text-surface-300', col.className)}
                    >
                      {col.render ? col.render(item) : (item as Record<string, ReactNode>)[col.key] ?? '—'}
                    </td>
                  ))}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
