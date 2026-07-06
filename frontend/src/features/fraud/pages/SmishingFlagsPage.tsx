import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { PageTransition } from '@/components/ui/PageTransition'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getSmishingFlags, reviewSmishingFlag, bulkReviewSmishingFlags } from '@/services/dashboard'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { PageSkeleton } from '@/components/ui/Skeleton'
import { EmptyState } from '@/components/ui/EmptyState'
import { FilterPanel } from '@/components/ui/FilterPanel'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { staggerContainer, fadeInUp, itemVariants } from '@/components/animations/variants'
import { CheckCircle, MessageCircleAlert, ShieldAlert, Siren, PhoneOff, UserX, CheckSquare, Square } from 'lucide-react'
import { cn } from '@/utils/cn'
import type { FraudFlag } from '@/types/models'

const categoryThemes: Record<string, { label: string; variant: 'danger' | 'warning' | 'info'; icon: React.ReactNode }> = {
  smishing: { label: 'Smishing', variant: 'danger', icon: <MessageCircleAlert className="h-3 w-3" /> },
  phishing: { label: 'Phishing', variant: 'danger', icon: <Siren className="h-3 w-3" /> },
  scam: { label: 'Scam', variant: 'warning', icon: <ShieldAlert className="h-3 w-3" /> },
  suspicious_sender: { label: 'Suspicious Sender', variant: 'warning', icon: <UserX className="h-3 w-3" /> },
  suspicious_recipient: { label: 'Suspicious Recipient', variant: 'info', icon: <PhoneOff className="h-3 w-3" /> },
}

function getCategoryTheme(flagType: string) {
  const lower = flagType.toLowerCase()
  for (const [key, theme] of Object.entries(categoryThemes)) {
    if (lower.includes(key)) return theme
  }
  return { label: 'Social Engineering', variant: 'warning' as const, icon: <ShieldAlert className="h-3 w-3" /> }
}

function extractCategory(flagType: string): string {
  // FlagType format: "sensitive content detected: smishing (3 violations)"
  const match = flagType.match(/sensitive content detected:\s*(\w+)/i)
  return match ? match[1] : 'unknown'
}

const categoryOptions = [
  { label: 'Smishing', value: 'smishing' },
  { label: 'Phishing', value: 'phishing' },
  { label: 'Scam', value: 'scam' },
  { label: 'Suspicious Sender', value: 'suspicious_sender' },
  { label: 'Suspicious Recipient', value: 'suspicious_recipient' },
]

const severityOptions = [
  { label: 'High', value: 'high' },
  { label: 'Medium', value: 'medium' },
  { label: 'Low', value: 'low' },
]

const statusOptions = [
  { label: 'Pending', value: 'pending' },
  { label: 'Reviewed', value: 'reviewed' },
]

function filterFlags(flags: FraudFlag[], filters: Record<string, string>): FraudFlag[] {
  return flags.filter((f) => {
    if (filters.category) {
      const category = extractCategory(f.flag_type)
      if (category !== filters.category) return false
    }
    if (filters.severity) {
      if (f.severity !== filters.severity) return false
    }
    if (filters.status) {
      const isReviewed = filters.status === 'reviewed'
      if (f.reviewed !== isReviewed) return false
    }
    if (filters.dateFrom) {
      const from = new Date(filters.dateFrom)
      if (new Date(f.created_at) < from) return false
    }
    if (filters.dateTo) {
      const to = new Date(filters.dateTo)
      const endOfDay = new Date(to.getFullYear(), to.getMonth(), to.getDate(), 23, 59, 59)
      if (new Date(f.created_at) > endOfDay) return false
    }
    return true
  })
}

export function SmishingFlagsPage() {
  const queryClient = useQueryClient()
  const { data: flags = [], isLoading } = useQuery({
    queryKey: ['smishing-flags'],
    queryFn: getSmishingFlags,
  })
  const reviewMutation = useMutation({
    mutationFn: reviewSmishingFlag,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['smishing-flags'] })
      queryClient.invalidateQueries({ queryKey: ['fraud-flags'] })
    },
  })

  const bulkReviewMutation = useMutation({
    mutationFn: () => bulkReviewSmishingFlags(Array.from(selectedIds)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['smishing-flags'] })
      queryClient.invalidateQueries({ queryKey: ['fraud-flags'] })
      queryClient.invalidateQueries({ queryKey: ['smishing-flags-count'] })
      setSelectedIds(new Set())
      setShowBulkReview(false)
    },
  })

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [showBulkReview, setShowBulkReview] = useState(false)
  const [filters, setFilters] = useState<Record<string, string>>({})

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredFlags.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(filteredFlags.map((f) => f.id)))
    }
  }

  const isAllSelected = filteredFlags.length > 0 && selectedIds.size === filteredFlags.length
  const selectedPendingCount = filteredFlags.filter((f) => !f.reviewed && selectedIds.has(f.id)).length

  const handleFilterChange = (key: string, value: string) => {
    setFilters((prev) => {
      const next = { ...prev }
      if (value === '' || value === undefined) {
        delete next[key]
      } else {
        next[key] = value
      }
      return next
    })
  }

  const resetFilters = () => setFilters({})

  const filteredFlags = useMemo(() => filterFlags(flags, filters), [flags, filters])

  if (isLoading) return <PageTransition><PageSkeleton /></PageTransition>

  const filterFields = [
    { key: 'category', label: 'Category', type: 'select' as const, options: categoryOptions },
    { key: 'severity', label: 'Severity', type: 'select' as const, options: severityOptions },
    { key: 'status', label: 'Status', type: 'select' as const, options: statusOptions },
    { key: 'dateFrom', label: 'From date', type: 'date' as const },
    { key: 'dateTo', label: 'To date', type: 'date' as const },
  ]

  return (
    <PageTransition>
    <motion.div initial="hidden" animate="visible" variants={staggerContainer} className="space-y-8">
      {/* Hero header */}
      <motion.div variants={fadeInUp}>
        <div className="relative overflow-hidden rounded-2xl border border-white/[0.06] bg-white/[0.02] p-8">
          <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-rose-600/10 blur-[80px]" />
          <div className="pointer-events-none absolute -left-8 bottom-0 h-32 w-32 rounded-full bg-amber-600/10 blur-[60px]" />
          <div className="pointer-events-none absolute right-1/3 top-1/2 h-24 w-24 rounded-full bg-purple-600/10 blur-[50px]" />
          <div className="relative flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-rose-500 to-amber-600 shadow-lg shadow-rose-500/25">
              <MessageCircleAlert className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-extrabold tracking-tight text-white lg:text-4xl">
                <span className="bg-gradient-to-r from-rose-400 via-amber-400 to-purple-400 bg-clip-text text-transparent">
                  Smishing Flags
                </span>
              </h1>
              <p className="mt-1 text-sm text-gray-400">
                Social engineering &amp; content-based fraud — delivery scams, phishing, suspicious senders/recipients
              </p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Filter bar */}
      <motion.div variants={fadeInUp}>
        <FilterPanel
          fields={filterFields}
          values={filters}
          onChange={handleFilterChange}
          onReset={resetFilters}
        />
      </motion.div>

      {filteredFlags.length === 0 ? (
        <motion.div variants={fadeInUp}>
          <EmptyState
            title={Object.keys(filters).length > 0 ? 'No matching flags' : 'No smishing flags'}
            description={
              Object.keys(filters).length > 0
                ? 'Try adjusting your filters to see more results.'
                : 'Social engineering and phishing attempts flagged by the content filter will appear here for review.'
            }
            icon={<MessageCircleAlert className="h-12 w-12 text-gray-500" />}
          />
        </motion.div>
      ) : (
        <motion.div variants={itemVariants} className="overflow-hidden rounded-2xl border border-white/[0.06] bg-white/[0.03]">
          {/* Bulk action bar */}
      <AnimatePresence>
        {selectedIds.size > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -10, height: 0 }}
            animate={{ opacity: 1, y: 0, height: 'auto' }}
            exit={{ opacity: 0, y: -10, height: 0 }}
            className="overflow-hidden"
          >
            <div className="flex items-center justify-between rounded-xl border border-blue-500/20 bg-blue-500/5 px-4 py-3">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-blue-400" />
                <span className="text-sm font-medium text-blue-400">{selectedIds.size} flag{selectedIds.size !== 1 ? 's' : ''} selected</span>
              </div>
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" onClick={() => setSelectedIds(new Set())}>Clear</Button>
                {selectedPendingCount > 0 && (
                  <Button
                    size="sm"
                    className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20"
                    icon={<CheckCircle className="h-4 w-4" />}
                    onClick={() => setShowBulkReview(true)}
                  >
                    Review ({selectedPendingCount})
                  </Button>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Results count & select all */}
          <div className="flex items-center justify-between border-b border-white/[0.06] px-4 py-2.5">
            <div className="flex items-center gap-3">
              <button onClick={toggleSelectAll} className="flex items-center gap-1.5 transition-colors hover:opacity-80">
                {isAllSelected
                  ? <CheckSquare className="h-3.5 w-3.5 text-blue-400" />
                  : <Square className="h-3.5 w-3.5 text-gray-600" />
                }
              </button>
              <span className="text-xs text-gray-500">
                Showing {filteredFlags.length} of {flags.length} flag{flags.length !== 1 ? 's' : ''}
              </span>
            </div>
          </div>
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-white/[0.06]">
                <th className="w-10 px-4 py-3">
                  <button onClick={toggleSelectAll} className="transition-colors hover:opacity-80">
                    {isAllSelected
                      ? <CheckSquare className="h-3.5 w-3.5 text-blue-400" />
                      : <Square className="h-3.5 w-3.5 text-gray-600" />
                    }
                  </button>
                </th>
                {['Account', 'Category', 'Severity', 'Description', 'Date', 'Status', ''].map((h) => (
                  <th key={h} className="px-4 py-3 text-xs font-medium uppercase text-gray-500">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {filteredFlags.map((f) => {
                const category = extractCategory(f.flag_type)
                const theme = getCategoryTheme(f.flag_type)
                const isSelected = selectedIds.has(f.id)
                return (
                  <tr key={f.id} className={cn('transition-colors', isSelected ? 'bg-blue-500/[0.04]' : 'hover:bg-white/[0.03]')}>
                    <td className="w-10 px-4 py-3">
                      <button onClick={() => toggleSelect(f.id)} className="transition-colors hover:opacity-80">
                        {isSelected
                          ? <CheckSquare className="h-3.5 w-3.5 text-blue-400" />
                          : <Square className="h-3.5 w-3.5 text-gray-600" />
                        }
                      </button>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-gray-100">{f.account_id.slice(0, 8)}…</td>
                    <td className="px-4 py-3">
                      <Badge variant={theme.variant} size="sm" className="gap-1">
                        {theme.icon}
                        {theme.label}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <Badge
                        variant={f.severity === 'high' ? 'danger' : f.severity === 'medium' ? 'warning' : 'default'}
                        size="sm"
                      >
                        {f.severity}
                      </Badge>
                    </td>
                    <td className="max-w-sm truncate px-4 py-3 text-xs text-gray-500">{f.description}</td>
                    <td className="px-4 py-3 text-xs text-gray-500">
                      {new Date(f.created_at).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={f.reviewed ? 'success' : 'warning'} dot size="sm">
                        {f.reviewed ? 'Reviewed' : 'Pending'}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      {!f.reviewed && (
                        <Button
                          variant="ghost"
                          size="xs"
                          icon={<CheckCircle className="h-3 w-3" />}
                          onClick={() => reviewMutation.mutate(f.id)}
                          loading={reviewMutation.isPending}
                        >
                          Review
                        </Button>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </motion.div>
      )}
      <ConfirmDialog
        open={showBulkReview}
        onClose={() => setShowBulkReview(false)}
        onConfirm={() => bulkReviewMutation.mutate()}
        title="Bulk review smishing flags"
        description={`Mark ${selectedPendingCount} pending flag${selectedPendingCount !== 1 ? 's' : ''} as reviewed? They will no longer appear in the pending count badge.`}
        loading={bulkReviewMutation.isPending}
        confirmLabel="Review all"
      />
    </motion.div>
    </PageTransition>
  )
}
