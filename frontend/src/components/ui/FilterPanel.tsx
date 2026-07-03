import { useState, type ReactNode } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/utils/cn'
import { Button } from './Button'
import { Input } from './Input'
import { ChevronDown } from 'lucide-react'

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
    <div className={cn('rounded-xl border border-white/[0.06] bg-white/[0.03]', className)}>
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-3">
          <button onClick={() => setExpanded(!expanded)} className="flex items-center gap-2 text-sm font-medium text-gray-300 hover:text-gray-100 transition-colors">
            <ChevronDown className={cn('h-4 w-4 transition-transform', expanded && 'rotate-180')} />
            Filters
          </button>
          {hasActiveFilters && (<span className="rounded-full bg-blue-500/10 border border-blue-500/20 px-2 py-0.5 text-xs font-medium text-blue-400">Active</span>)}
        </div>
        {children}
      </div>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            <div className="border-t border-white/[0.06] px-4 py-4">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {fields.map((field) => (
                  <div key={field.key}>
                    {field.type === 'select' ? (
                      <div>
                        <label className="mb-1.5 block text-sm font-medium text-gray-300">{field.label}</label>
                        <select value={values[field.key] || ''} onChange={(e) => onChange(field.key, e.target.value)} className="block w-full rounded-lg border border-white/[0.08] bg-white/[0.05] px-3.5 py-2.5 text-sm text-gray-100 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-500/10">
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
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
