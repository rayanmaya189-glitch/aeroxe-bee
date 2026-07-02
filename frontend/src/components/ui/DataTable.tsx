import { useMemo, useCallback } from 'react'
import { cn } from '@/utils/cn'
import { Button } from './Button'
import { EmptyState } from './EmptyState'
import { Skeleton } from './Skeleton'

export interface Column<T> {
  key: string
  header: string
  sortable?: boolean
  className?: string
  render?: (row: T, index: number) => React.ReactNode
}

interface DataTableProps<T extends object> {
  data: T[]
  columns: Column<T>[]
  loading?: boolean
  totalItems?: number
  page?: number
  pageSize?: number
  onPageChange?: (page: number) => void
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
  onSort?: (key: string) => void
  emptyTitle?: string
  emptyDescription?: string
  emptyAction?: React.ReactNode
  onRowClick?: (row: T) => void
  selectedIds?: string[]
  onSelectionChange?: (ids: string[]) => void
  getRowId?: (row: T) => string
  className?: string
}

function SortIcon({ direction }: { direction?: 'asc' | 'desc' }) {
  return (
    <svg className="h-3.5 w-3.5 text-gray-400" viewBox="0 0 16 16" fill="none">
      <path d="M4.5 6L8 2.5L11.5 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity={direction === 'asc' ? 1 : 0.3} />
      <path d="M4.5 10L8 13.5L11.5 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity={direction === 'desc' ? 1 : 0.3} />
    </svg>
  )
}

export function DataTable<T extends object>({
  data, columns, loading = false, totalItems = 0, page = 1, pageSize = 10,
  onPageChange, sortBy, sortOrder, onSort, emptyTitle = 'No data',
  emptyDescription, emptyAction, onRowClick, selectedIds = [], onSelectionChange,
  getRowId, className,
}: DataTableProps<T>) {
  const totalPages = Math.ceil(totalItems / pageSize)
  const startItem = totalItems === 0 ? 0 : (page - 1) * pageSize + 1
  const endItem = Math.min(page * pageSize, totalItems)

  const allSelected = useMemo(
    () => data.length > 0 && data.every((row) => getRowId && selectedIds.includes(getRowId(row as T))),
    [data, selectedIds, getRowId],
  )

  const handleSelectAll = useCallback(() => {
    if (!onSelectionChange || !getRowId) return
    if (allSelected) { onSelectionChange([]) } else { onSelectionChange(data.map((row) => getRowId(row as T))) }
  }, [allSelected, data, getRowId, onSelectionChange])

  const handleSelectRow = useCallback(
    (row: T) => {
      if (!onSelectionChange || !getRowId) return
      const id = getRowId(row)
      if (selectedIds.includes(id)) { onSelectionChange(selectedIds.filter((i) => i !== id)) } else { onSelectionChange([...selectedIds, id]) }
    },
    [selectedIds, getRowId, onSelectionChange],
  )

  if (loading) {
    return (
      <div className={cn('overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900', className)}>
        <div className="space-y-0">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 border-b border-gray-100 px-5 py-3.5 last:border-0 dark:border-gray-800/50">
              {columns.map((col) => (<div key={col.key} className="flex-1"><Skeleton className="h-3.5" /></div>))}
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (data.length === 0) {
    return (
      <div className={cn('overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900', className)}>
        <EmptyState title={emptyTitle} description={emptyDescription} action={emptyAction} />
      </div>
    )
  }

  return (
    <div className={cn('overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900', className)}>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-gray-200 dark:border-gray-800">
              {onSelectionChange && getRowId && (
                <th className="w-12 px-4 py-3">
                  <input type="checkbox" checked={allSelected} onChange={handleSelectAll} className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500 dark:border-gray-600" />
                </th>
              )}
              {columns.map((col) => (
                <th key={col.key} className={cn('px-4 py-3 text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400', col.sortable && 'cursor-pointer select-none hover:text-gray-700 dark:hover:text-gray-200', col.className)} onClick={col.sortable && onSort ? () => onSort(col.key) : undefined}>
                  <div className="flex items-center gap-1.5">{col.header}{col.sortable && <SortIcon direction={sortBy === col.key ? sortOrder : undefined} />}</div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800/50">
            {data.map((row, index) => {
              const isSelected = getRowId ? selectedIds.includes(getRowId(row)) : false
              return (
                <tr key={getRowId ? getRowId(row) : index} className={cn('transition-colors hover:bg-gray-50/50 dark:hover:bg-gray-800/30', onRowClick && 'cursor-pointer', isSelected && 'bg-primary-50/50 dark:bg-primary-900/10')} onClick={() => onRowClick?.(row)}>
                  {onSelectionChange && getRowId && (
                    <td className="w-12 px-4 py-3"><input type="checkbox" checked={isSelected} onChange={() => handleSelectRow(row)} onClick={(e) => e.stopPropagation()} className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500 dark:border-gray-600" /></td>
                  )}
                  {columns.map((col) => (
                    <td key={col.key} className={cn('px-4 py-3 text-gray-600 dark:text-gray-400', col.className)}>
                      {col.render ? col.render(row, index) : String((row as Record<string, unknown>)[col.key] ?? '')}
                    </td>
                  ))}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-gray-200 px-4 py-3 dark:border-gray-800">
          <p className="text-sm text-gray-500 dark:text-gray-400">Showing {startItem}–{endItem} of {totalItems}</p>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="xs" disabled={page <= 1} onClick={() => onPageChange?.(page - 1)}>Previous</Button>
            {Array.from({ length: Math.min(5, totalPages) }).map((_, i) => {
              const pageNum = Math.max(1, Math.min(page - 2, totalPages - 4)) + i
              if (pageNum > totalPages) return null
              return (<Button key={pageNum} variant={pageNum === page ? 'primary' : 'ghost'} size="xs" onClick={() => onPageChange?.(pageNum)}>{pageNum}</Button>)
            })}
            <Button variant="ghost" size="xs" disabled={page >= totalPages} onClick={() => onPageChange?.(page + 1)}>Next</Button>
          </div>
        </div>
      )}
    </div>
  )
}
