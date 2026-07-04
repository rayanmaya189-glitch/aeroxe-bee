import { useState } from 'react'
import { motion } from 'framer-motion'
import { PageTransition } from '@/components/ui/PageTransition'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getTemplates, createTemplate, deleteTemplate, approveTemplate, rejectTemplate } from '@/services/dashboard'
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
import { Plus, FileText } from 'lucide-react'

type FilterTab = 'all' | 'pending' | 'approved' | 'rejected'

export function TemplatesPage() {
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState<FilterTab>('all')
  const [showForm, setShowForm] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<Template | null>(null)
  const [name, setName] = useState('')
  const [body, setBody] = useState('')
  const [error, setError] = useState('')

  const { data: templates = [], isLoading } = useQuery({
    queryKey: ['admin-templates'],
    queryFn: getTemplates,
  })

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
      setShowForm(false); setName(''); setBody('')
    },
    onError: (err: Error) => setError(err.message),
  })

  const deleteMutation = useMutation({
    mutationFn: async () => { if (deleteTarget) await deleteTemplate(deleteTarget.id) },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-templates'] })
      setDeleteTarget(null)
    },
  })

  const approveMutation = useMutation({
    mutationFn: approveTemplate,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-templates'] }),
  })

  const rejectMutation = useMutation({
    mutationFn: rejectTemplate,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-templates'] }),
  })

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
            onClick={() => setActiveTab(tab.key)}
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
                <div className="flex items-start justify-between">
                  <h3 className="text-sm font-semibold text-gray-100">{t.name}</h3>
                  {t.account_name && (
                    <p className="mt-1 text-xs text-gray-500">Account: {t.account_name}</p>
                  )}
                  <Badge
                    variant={t.approval_status === 'approved' ? 'success' : t.approval_status === 'rejected' ? 'danger' : 'warning'}
                    dot
                    size="sm"
                  >
                    {t.approval_status}
                  </Badge>
                </div>
                <p className="mt-2 line-clamp-3 text-xs leading-relaxed text-gray-400">{t.body}</p>

                {t.approval_status === 'pending' && (
                  <div className="mt-3 flex gap-2">
                    <Button variant="ghost" size="xs" className="text-emerald-400" onClick={() => approveMutation.mutate(t.id)} loading={approveMutation.isPending}>
                      Approve
                    </Button>
                    <Button variant="ghost" size="xs" className="text-red-400" onClick={() => rejectMutation.mutate(t.id)} loading={rejectMutation.isPending}>
                      Reject
                    </Button>
                  </div>
                )}

                <div className="mt-4 flex gap-2 border-t border-white/[0.06] pt-4">
                  <Button variant="ghost" size="xs" className="text-red-400" onClick={() => setDeleteTarget(t)}>Delete</Button>
                </div>
              </Card>
            </motion.div>
          ))}
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
    </motion.div>
    </PageTransition>
  )
}
