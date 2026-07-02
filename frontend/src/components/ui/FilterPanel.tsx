import { useState, type ReactNode } from 'react'
import { cn } from '@/utils/cn'
import { Button } from './Button'
import { Input } from './Input'

interface FilterField {
  key: string
  label: string
  type?: 'text' | 'select' | 'date'
  options?: Array<{ label: string; value: string }>
  placeholder?: string
}

interface FilterPanelProps {
  fields: FilterField[]
  values: Record<string, string>
  onChange: (key: string, value: string) => void
  onReset?: () => void
  className?: string
  children?: ReactNode
}

export function FilterPanel({ fields, values, onChange, onReset, className, children }: FilterPanelProps) {
  const [expanded, setExpanded] = useState(false)
  const hasActiveFilters = Object.values(values).some((v) => v !== '' && v !== undefined)

  return (
    <div className={cn('rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900', className)}>
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-3">
          <button onClick={() => setExpanded(!expanded)} className="flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-gray-900 dark:text-gray-300 dark:hover:text-gray-100">
            <svg className={cn('h-4 w-4 transition-transform', expanded && 'rotate-180')} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
            </svg>
            Filters
          </button>
          {hasActiveFilters && (<span className="rounded-full bg-primary-100 px-2 py-0.5 text-xs font-medium text-primary-700 dark:bg-primary-900/30 dark:text-primary-300">Active</span>)}
        </div>
        {children}
      </div>

      {expanded && (
        <div className="animate-slideDown border-t border-gray-200 px-4 py-4 dark:border-gray-800">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {fields.map((field) => (
              <div key={field.key}>
                {field.type === 'select' ? (
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">{field.label}</label>
                    <select value={values[field.key] || ''} onChange={(e) => onChange(field.key, e.target.value)} className="block w-full rounded-lg border border-gray-300 bg-white px-3.5 py-2.5 text-sm text-gray-900 shadow-sm focus:border-primary-500 focus:outline-none focus:ring-4 focus:ring-primary-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100">
                      <option value="">All</option>
                      {field.options?.map((opt) => (<option key={opt.value} value={opt.value}>{opt.label}</option>))}
                    </select>
                  </div>
                ) : (
                  <Input label={field.label} type={field.type || 'text'} placeholder={field.placeholder} value={values[field.key] || ''} onChange={(e) => onChange(field.key, e.target.value)} />
                )}
              </div>
            ))}
          </div>
          {hasActiveFilters && onReset && (
            <div className="mt-4 flex justify-end"><Button variant="ghost" size="sm" onClick={onReset}>Clear all</Button></div>
          )}
        </div>
      )}
    </div>
  )
}
