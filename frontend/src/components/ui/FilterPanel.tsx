import { useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import { cn } from '@/utils/cn'

interface FilterOption {
  label: string
  value: string
}

interface FilterPanelProps {
  searchPlaceholder?: string
  statusOptions?: FilterOption[]
  roleOptions?: FilterOption[]
  showDateRange?: boolean
  filters: {
    search: string
    status?: string
    role?: string
    dateFrom?: string
    dateTo?: string
  }
  onFilterChange: (key: string, value: string) => void
  onReset: () => void
  className?: string
}

export function FilterPanel({
  searchPlaceholder = 'Search...',
  statusOptions,
  roleOptions,
  showDateRange,
  filters,
  onFilterChange,
  onReset,
  className,
}: FilterPanelProps) {
  const [, setSearchParams] = useSearchParams()

  const handleSearchChange = useCallback(
    (value: string) => {
      onFilterChange('search', value)
      setSearchParams((prev) => {
        if (value) prev.set('search', value)
        else prev.delete('search')
        return prev
      }, { replace: true })
    },
    [onFilterChange, setSearchParams],
  )

  const hasFilters = filters.search || filters.status || filters.role || filters.dateFrom || filters.dateTo

  return (
    <div className={cn('flex flex-wrap items-center gap-3', className)}>
      <div className="relative flex-1 min-w-[200px] max-w-sm">
        <svg
          className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-surface-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          type="text"
          placeholder={searchPlaceholder}
          value={filters.search}
          onChange={(e) => handleSearchChange(e.target.value)}
          className="h-10 w-full rounded-xl border border-surface-300 bg-white pl-10 pr-4 text-sm text-surface-900 placeholder:text-surface-400 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 dark:border-surface-600 dark:bg-surface-800 dark:text-surface-100 dark:placeholder:text-surface-500"
        />
      </div>

      {statusOptions && (
        <select
          value={filters.status ?? ''}
          onChange={(e) => onFilterChange('status', e.target.value)}
          className="h-10 rounded-xl border border-surface-300 bg-white px-3 text-sm text-surface-700 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 dark:border-surface-600 dark:bg-surface-800 dark:text-surface-300"
        >
          <option value="">All Status</option>
          {statusOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      )}

      {roleOptions && (
        <select
          value={filters.role ?? ''}
          onChange={(e) => onFilterChange('role', e.target.value)}
          className="h-10 rounded-xl border border-surface-300 bg-white px-3 text-sm text-surface-700 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 dark:border-surface-600 dark:bg-surface-800 dark:text-surface-300"
        >
          <option value="">All Roles</option>
          {roleOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      )}

      {showDateRange && (
        <>
          <input
            type="date"
            value={filters.dateFrom ?? ''}
            onChange={(e) => onFilterChange('dateFrom', e.target.value)}
            className="h-10 rounded-xl border border-surface-300 bg-white px-3 text-sm text-surface-700 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 dark:border-surface-600 dark:bg-surface-800 dark:text-surface-300"
          />
          <span className="text-surface-400">—</span>
          <input
            type="date"
            value={filters.dateTo ?? ''}
            onChange={(e) => onFilterChange('dateTo', e.target.value)}
            className="h-10 rounded-xl border border-surface-300 bg-white px-3 text-sm text-surface-700 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 dark:border-surface-600 dark:bg-surface-800 dark:text-surface-300"
          />
        </>
      )}

      {hasFilters && (
        <button
          onClick={onReset}
          className="h-10 whitespace-nowrap rounded-xl px-4 text-sm font-medium text-surface-500 hover:text-surface-700 dark:text-surface-400 dark:hover:text-surface-200"
        >
          Clear filters
        </button>
      )}
    </div>
  )
}
