import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { PageTransition } from '@/components/ui/PageTransition'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getTemplates, createTemplate, deleteTemplate, approveTemplate, rejectTemplate, bulkDeleteTemplates, bulkApproveTemplates, bulkRejectTemplates } from '@/services/dashboard'
import type { Template } from '@/types/models'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { EmptyState } from '@/components/ui/EmptyState'
import { PageSkeleton } from '@/components/ui/Skeleton'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { staggerContainer, fadeInUp, itemVariants } from '@/components/animations/variants'
import { Plus, FileText, Trash2, CheckSquare, Square, CheckCircle, XCircle } from 'lucide-react'
import { useToast } from '@/components/ui/Toast'

type FilterTab = 'all' | 'pending' | 'approved' | 'rejected'

export function TemplatesPage() {
  const queryClient = useQueryClient()
  const { addToast } = useToast()
  const [activeTab, setActiveTab] = useState<FilterTab>('all')
  const [showForm, setShowForm] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<Template | null>(null)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [showBulkDelete, setShowBulkDelete] = useState(false)
  const [showBulkApprove, setShowBulkApprove] = useState(false)
  const [showBulkReject, setShowBulkReject] = useState(false)
  const [name, setName] = useState('')
  const [body, setBody] = useState('')
  const [error, setError] = useState('')

  const [page, setPage] = useState(1)
  const PAGE_SIZE = 30

  const { data, isLoading } = useQuery({
    queryKey: ['admin-templates', page, PAGE_SIZE],
    queryFn: () => getTemplates({ page, pageSize: PAGE_SIZE }),
    staleTime: 60_000,
  })
  const templates = data?.data ?? []
  const totalPages = data?.total_pages ?? 1

  const filteredTemplates = activeTab === 'all'
    ? templates
    : templates.filter((t) => t.approval_status === activeTab)

  const pendingCount = templates.filter((t) => t.approval_status === 'pending').length

  const saveMutation = useMutation({
    mutationFn: async () => {
      await createTemplate({ name, body, variables: [] })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-templates'] })
      setShowForm(false); setName(''); setBody(''); addToast('Template created', 'success')
    },
    onError: (err: Error) => { addToast(err.message || 'Failed to create template', 'error'); setError(err.message) },
  })

  const deleteMutation = useMutation({
    mutationFn: async () => { if (deleteTarget) await deleteTemplate(deleteTarget.id) },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-templates'] })
      setDeleteTarget(null); addToast('Template deleted', 'success')
    },
    onError: (err: Error) => { addToast(err.message || 'Failed to delete template', 'error') },
  })

  const approveMutation = useMutation({
    mutationFn: approveTemplate,
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin-templates'] }); addToast('Template approved', 'success') },
    onError: (err: Error) => { addToast(err.message || 'Failed to approve template', 'error') },
  })

  const rejectMutation = useMutation({
    mutationFn: rejectTemplate,
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin-templates'] }); addToast('Template rejected', 'success') },
    onError: (err: Error) => { addToast(err.message || 'Failed to reject template', 'error') },
  })

  const bulkDeleteMutation = useMutation({
    mutationFn: () => bulkDeleteTemplates(Array.from(selectedIds)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-templates'] })
      setSelectedIds(new Set())
      setShowBulkDelete(false); addToast(`${selectedIds.size} templates deleted`, 'success')
    },
    onError: (err: Error) => { addToast(err.message || 'Failed to bulk delete templates', 'error') },
  })

  const bulkApproveMutation = useMutation({
    mutationFn: () => bulkApproveTemplates(Array.from(selectedIds)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-templates'] })
      setSelectedIds(new Set())
      setShowBulkApprove(false); addToast(`${selectedPendingCount} templates approved`, 'success')
    },
    onError: (err: Error) => { addToast(err.message || 'Failed to bulk approve templates', 'error') },
  })

  const bulkRejectMutation = useMutation({
    mutationFn: () => bulkRejectTemplates(Array.from(selectedIds)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-templates'] })
      setSelectedIds(new Set())
      setShowBulkReject(false); addToast(`${selectedPendingCount} templates rejected`, 'success')
    },
    onError: (err: Error) => { addToast(err.message || 'Failed to bulk reject templates', 'error') },
  })

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredTemplates.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(filteredTemplates.map((t) => t.id)))
    }
  }

  const isAllSelected = filteredTemplates.length > 0 && selectedIds.size === filteredTemplates.length
  const selectedTemplates = templates.filter((t) => selectedIds.has(t.id))
  const selectedPendingCount = selectedTemplates.filter((t) => t.approval_status === 'pending').length

  const tabs: { key: FilterTab; label: string; count?: number }[] = [
    { key: 'all', label: 'All', count: templates.length },
    { key: 'pending', label: 'Pending', count: pendingCount },
    { key: 'approved', label: 'Approved' },
    { key: 'rejected', label: 'Rejected' },
  ]

  if (isLoading) return <PageTransition><PageSkeleton /></PageTransition>

  return (
    <PageTransition>
    <motion.div
      initial="hidden"
      animate="visible"
      variants={staggerContainer}
      className="space-y-6"
    >
      {/* Hero header */}
      <motion.div variants={fadeInUp}>
        <div className="relative overflow-hidden rounded-2xl border border-white/[0.06] bg-white/[0.02] p-8">
          <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-emerald-600/10 blur-[80px]" />
          <div className="pointer-events-none absolute -left-8 bottom-0 h-32 w-32 rounded-full bg-blue-600/10 blur-[60px]" />
          <div className="relative flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-green-600 shadow-lg shadow-emerald-500/25">
                <FileText className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-extrabold tracking-tight text-white lg:text-4xl">
                  <span className="bg-gradient-to-r from-emerald-400 to-green-400 bg-clip-text text-transparent">Templates</span>
                </h1>
                <p className="mt-1 text-sm text-gray-400">Manage and approve message templates</p>
              </div>
            </div>
            <Button size="sm" icon={<Plus className="h-4 w-4" />} onClick={() => { setError(''); setShowForm(true) }}>New template</Button>
          </div>
        </div>
      </motion.div>

      {/* Tabs */}
      <motion.div variants={itemVariants} className="flex gap-1 rounded-xl border border-white/[0.06] bg-white/[0.03] p-1 w-fit">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => { setActiveTab(tab.key); setSelectedIds(new Set()) }}
            className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all duration-200 ${
              activeTab === tab.key
                ? 'bg-gradient-to-r from-white/[0.08] to-white/[0.05] text-gray-100 shadow-sm ring-1 ring-white/[0.06]'
                : 'text-gray-400 hover:text-gray-200 hover:bg-white/[0.04]'
            }`}
          >
            {tab.label}
            {tab.count !== undefined && tab.count > 0 && (
              <span className={`rounded-full px-1.5 py-0.5 text-xs ${
                activeTab === tab.key ? 'bg-white/[0.1] text-gray-200' : 'bg-white/[0.06] text-gray-400'
              }`}>{tab.count}</span>
            )}
          </button>
        ))}
      </motion.div>

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
              <span className="text-sm text-blue-400 font-medium">{selectedIds.size} template{selectedIds.size > 1 ? 's' : ''} selected</span>
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" onClick={() => setSelectedIds(new Set())}>Clear</Button>
                {selectedPendingCount > 0 && (
                  <>
                    <Button size="sm" className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20" icon={<CheckCircle className="h-4 w-4" />} onClick={() => setShowBulkApprove(true)}>
                      Approve ({selectedPendingCount})
                    </Button>
                    <Button size="sm" className="bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20" icon={<XCircle className="h-4 w-4" />} onClick={() => setShowBulkReject(true)}>
                      Reject ({selectedPendingCount})
                    </Button>
                  </>
                )}
                <Button size="sm" className="bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20" icon={<Trash2 className="h-4 w-4" />} onClick={() => setShowBulkDelete(true)}>
                  Delete ({selectedIds.size})
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {filteredTemplates.length === 0 ? (
        <EmptyState
          title={`No ${activeTab === 'all' ? '' : activeTab} templates`}
          description="Templates will appear here once created."
          action={activeTab === 'all' ? <Button size="sm" onClick={() => { setError(''); setShowForm(true) }}>Create template</Button> : undefined}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredTemplates.map((t) => (
            <motion.div key={t.id} variants={itemVariants}>
              <Card hover glow={
                t.approval_status === 'approved' ? 'bg-emerald-500/15' :
                t.approval_status === 'rejected' ? 'bg-red-500/15' : 'bg-amber-500/15'
              }>
                <div className="flex items-start gap-3">
                  <button
                    onClick={() => toggleSelect(t.id)}
                    className="mt-1 shrink-0 transition-colors hover:opacity-80"
                  >
                    {selectedIds.has(t.id)
                      ? <CheckSquare className="h-4 w-4 text-blue-400" />
                      : <Square className="h-4 w-4 text-gray-600" />
                    }
                  </button>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-sm font-semibold text-gray-100">{t.name}</h3>
                    {t.account_name && (
                      <p className="mt-1 text-xs text-gray-500">Account: {t.account_name}</p>
                    )}
                  </div>
                  <Badge
                    variant={t.approval_status === 'approved' ? 'success' : t.approval_status === 'rejected' ? 'danger' : 'warning'}
                    dot
                    size="sm"
                  >
                    {t.approval_status}
                  </Badge>
                </div>
                <p className="mt-2 ml-7 line-clamp-3 text-xs leading-relaxed text-gray-400">{t.body}</p>

                {t.approval_status === 'pending' && (
                  <div className="mt-3 ml-7 flex gap-2">
                    <Button variant="ghost" size="xs" className="text-emerald-400" onClick={() => approveMutation.mutate(t.id)} loading={approveMutation.isPending}>
                      Approve
                    </Button>
                    <Button variant="ghost" size="xs" className="text-red-400" onClick={() => rejectMutation.mutate(t.id)} loading={rejectMutation.isPending}>
                      Reject
                    </Button>
                  </div>
                )}

                <div className="mt-4 ml-7 flex gap-2 border-t border-white/[0.06] pt-4">
                  <Button variant="ghost" size="xs" className="text-red-400" onClick={() => setDeleteTarget(t)}>Delete</Button>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      {/* Select all checkbox */}
      {filteredTemplates.length > 0 && (
        <div className="flex justify-center">
          <button onClick={toggleSelectAll} className="flex items-center gap-2 text-xs text-gray-500 hover:text-gray-300 transition-colors">
            {isAllSelected ? <CheckSquare className="h-3.5 w-3.5 text-blue-400" /> : <Square className="h-3.5 w-3.5" />}
            {isAllSelected ? 'Deselect all' : 'Select all'}
          </button>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button size="xs" variant="ghost" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>Prev</Button>
          <span className="text-xs text-gray-400">Page {page} of {totalPages}</span>
          <Button size="xs" variant="ghost" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}>Next</Button>
        </div>
      )}

      <Modal
        open={showForm}
        onClose={() => setShowForm(false)}
        title="New template"
        footer={
          <>
            <Button variant="ghost" size="sm" onClick={() => setShowForm(false)} disabled={saveMutation.isPending}>Cancel</Button>
            <Button size="sm" onClick={() => saveMutation.mutate()} loading={saveMutation.isPending}>Create</Button>
          </>
        }
      >
        <div className="space-y-4">
          {error && <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-3 text-sm text-red-400">{error}</div>}
          <Input label="Template name" value={name} onChange={(e) => setName(e.target.value)} required />
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-300">Body</label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={5}
              className="block w-full rounded-xl border border-white/[0.08] bg-white/[0.05] px-3.5 py-2.5 text-sm text-gray-100 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-500/10 placeholder:text-gray-500"
              required
            />
          </div>
          <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-3 text-xs text-amber-400">
            New templates are created with <strong>pending</strong> status and require admin approval before they can be used.
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => deleteMutation.mutate()}
        title="Delete template"
        description={`Are you sure you want to delete "${deleteTarget?.name}"?`}
        loading={deleteMutation.isPending}
      />

      <ConfirmDialog
        open={showBulkDelete}
        onClose={() => setShowBulkDelete(false)}
        onConfirm={() => bulkDeleteMutation.mutate()}
        title="Bulk delete templates"
        description={`Are you sure you want to delete ${selectedIds.size} template${selectedIds.size > 1 ? 's' : ''}? This cannot be undone.`}
        loading={bulkDeleteMutation.isPending}
      />

      <ConfirmDialog
        open={showBulkApprove}
        onClose={() => setShowBulkApprove(false)}
        onConfirm={() => bulkApproveMutation.mutate()}
        title="Bulk approve templates"
        description={`Approve ${selectedPendingCount} pending template${selectedPendingCount > 1 ? 's' : ''}? They will be available for use immediately.`}
        loading={bulkApproveMutation.isPending}
      />

      <ConfirmDialog
        open={showBulkReject}
        onClose={() => setShowBulkReject(false)}
        onConfirm={() => bulkRejectMutation.mutate()}
        title="Bulk reject templates"
        description={`Reject ${selectedPendingCount} pending template${selectedPendingCount > 1 ? 's' : ''}? They will be marked as rejected.`}
        loading={bulkRejectMutation.isPending}
      />
    </motion.div>
    </PageTransition>
  )
}
