import { useState } from 'react'
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

  if (isLoading) return <PageSkeleton />

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-100">Templates</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Manage and approve message templates</p>
        </div>
        <Button size="sm" onClick={() => { setError(''); setShowForm(true) }}>New template</Button>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 rounded-lg border border-gray-200 bg-white p-1 dark:border-gray-800 dark:bg-gray-900">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              activeTab === tab.key
                ? 'bg-gray-100 text-gray-900 dark:bg-gray-800 dark:text-gray-100'
                : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
            }`}
          >
            {tab.label}
            {tab.count !== undefined && tab.count > 0 && (
              <span className="rounded-full bg-gray-200 px-1.5 py-0.5 text-xs dark:bg-gray-700">{tab.count}</span>
            )}
          </button>
        ))}
      </div>

      {filteredTemplates.length === 0 ? (
        <EmptyState
          title={`No ${activeTab === 'all' ? '' : activeTab} templates`}
          description="Templates will appear here once created."
          action={activeTab === 'all' ? <Button size="sm" onClick={() => { setError(''); setShowForm(true) }}>Create template</Button> : undefined}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredTemplates.map((t) => (
            <Card key={t.id} hover>
              <div className="flex items-start justify-between">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">{t.name}</h3>
                <Badge
                  variant={t.approval_status === 'approved' ? 'success' : t.approval_status === 'rejected' ? 'danger' : 'warning'}
                  dot
                  size="sm"
                >
                  {t.approval_status}
                </Badge>
              </div>
              <p className="mt-2 line-clamp-3 text-xs text-gray-500 dark:text-gray-400">{t.body}</p>

              {/* Approve/Reject buttons for pending templates */}
              {t.approval_status === 'pending' && (
                <div className="mt-3 flex gap-2">
                  <Button variant="ghost" size="xs" className="text-success-600" onClick={() => approveMutation.mutate(t.id)} loading={approveMutation.isPending}>
                    Approve
                  </Button>
                  <Button variant="ghost" size="xs" className="text-danger-600" onClick={() => rejectMutation.mutate(t.id)} loading={rejectMutation.isPending}>
                    Reject
                  </Button>
                </div>
              )}

              <div className="mt-4 flex gap-2 border-t border-gray-100 pt-4 dark:border-gray-800">
                <Button variant="ghost" size="xs" className="text-danger-600" onClick={() => setDeleteTarget(t)}>Delete</Button>
              </div>
            </Card>
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
          {error && <div className="rounded-lg border border-danger-200 bg-danger-50 p-3 text-sm text-danger-700">{error}</div>}
          <Input label="Template name" value={name} onChange={(e) => setName(e.target.value)} required />
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Body</label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={5}
              className="block w-full rounded-lg border border-gray-300 bg-white px-3.5 py-2.5 text-sm text-gray-900 shadow-sm focus:border-primary-500 focus:outline-none focus:ring-4 focus:ring-primary-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
              required
            />
          </div>
          <div className="rounded-lg border border-warning-200 bg-warning-50 p-3 text-xs text-warning-700 dark:border-warning-800/50 dark:bg-warning-900/20 dark:text-warning-300">
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
    </div>
  )
}
