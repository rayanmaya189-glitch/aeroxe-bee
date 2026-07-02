import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/services/api'
import type { ApiResponse } from '@/types/api'
import type { Template } from '@/types/models'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { EmptyState } from '@/components/ui/EmptyState'
import { PageSkeleton } from '@/components/ui/Skeleton'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'

export function MemberTemplatesPage() {
  const queryClient = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Template | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Template | null>(null)
  const [name, setName] = useState('')
  const [body, setBody] = useState('')
  const [error, setError] = useState('')

  const { data: templates = [], isLoading } = useQuery({
    queryKey: ['member-templates'],
    queryFn: async () => {
      const res = await api.get<ApiResponse<Template[]>>('/member/templates')
      return res.data.data || []
    },
  })

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (editing) {
        await api.put(`/member/templates/${editing.id}`, { name, body, variables: [] })
      } else {
        await api.post('/member/templates', { name, body, variables: [] })
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['member-templates'] })
      closeForm()
    },
    onError: (err: Error) => setError(err.message),
  })

  const deleteMutation = useMutation({
    mutationFn: async () => {
      if (!deleteTarget) return
      await api.delete(`/member/templates/${deleteTarget.id}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['member-templates'] })
      setDeleteTarget(null)
    },
  })

  function openForm(template?: Template) {
    setEditing(template || null)
    setName(template?.name || '')
    setBody(template?.body || '')
    setError('')
    setShowForm(true)
  }

  function closeForm() {
    setShowForm(false)
    setEditing(null)
    setName('')
    setBody('')
    setError('')
  }

  if (isLoading) return <PageSkeleton />

  const statusColors: Record<string, { bg: string; text: string; border: string }> = {
    pending: { bg: 'bg-warning-50 dark:bg-warning-900/20', text: 'text-warning-700 dark:text-warning-300', border: 'border-warning-200 dark:border-warning-800/50' },
    approved: { bg: 'bg-success-50 dark:bg-success-900/20', text: 'text-success-700 dark:text-success-300', border: 'border-success-200 dark:border-success-800/50' },
    rejected: { bg: 'bg-danger-50 dark:bg-danger-900/20', text: 'text-danger-700 dark:text-danger-300', border: 'border-danger-200 dark:border-danger-800/50' },
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-100">Templates</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Manage your message templates</p>
        </div>
        <Button size="sm" onClick={() => openForm()}>New template</Button>
      </div>

      {/* Info banner */}
      <div className="rounded-lg border border-info-200 bg-info-50 p-3 text-sm text-info-700 dark:border-info-800/50 dark:bg-info-900/20 dark:text-info-300">
        Templates require admin approval after creation. You can edit or delete templates while they are pending.
      </div>

      {templates.length === 0 ? (
        <EmptyState
          title="No templates yet"
          description="Create a template to reuse message content. Templates require admin approval before use."
          action={<Button size="sm" onClick={() => openForm()}>Create template</Button>}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {templates.map((t) => {
            const sc = statusColors[t.approval_status] || statusColors.pending
            return (
              <Card key={t.id} hover>
                <div className="flex items-start justify-between">
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">{t.name}</h3>
                  <Badge variant={t.approval_status === 'approved' ? 'success' : t.approval_status === 'rejected' ? 'danger' : 'warning'} dot size="sm">
                    {t.approval_status}
                  </Badge>
                </div>
                <p className="mt-2 line-clamp-3 text-xs text-gray-500 dark:text-gray-400">{t.body}</p>

                {/* Status message */}
                <div className={`mt-3 rounded-lg border p-2.5 text-xs ${sc.border} ${sc.bg} ${sc.text}`}>
                  {t.approval_status === 'pending' && (
                    <span>⏳ Waiting for admin approval. You can still edit or delete this template.</span>
                  )}
                  {t.approval_status === 'approved' && (
                    <span>✅ This template is approved and ready to use in messages.</span>
                  )}
                  {t.approval_status === 'rejected' && (
                    <span>❌ This template was rejected by an admin. Edit and resubmit for review.</span>
                  )}
                </div>

                <div className="mt-4 flex gap-2 border-t border-gray-100 pt-4 dark:border-gray-800">
                  <Button variant="ghost" size="xs" onClick={() => openForm(t)}>Edit</Button>
                  <Button variant="ghost" size="xs" className="text-danger-600" onClick={() => setDeleteTarget(t)}>Delete</Button>
                </div>
              </Card>
            )
          })}
        </div>
      )}

      <Modal
        open={showForm}
        onClose={closeForm}
        title={editing ? 'Edit template' : 'New template'}
        footer={
          <>
            <Button variant="ghost" size="sm" onClick={closeForm} disabled={saveMutation.isPending}>Cancel</Button>
            <Button size="sm" onClick={() => saveMutation.mutate()} loading={saveMutation.isPending}>{editing ? 'Update' : 'Create'}</Button>
          </>
        }
      >
        <div className="space-y-4">
          {error && (
            <div className="rounded-lg border border-danger-200 bg-danger-50 p-3 text-sm text-danger-700">{error}</div>
          )}
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
          {!editing && (
            <div className="rounded-lg border border-warning-200 bg-warning-50 p-3 text-xs text-warning-700 dark:border-warning-800/50 dark:bg-warning-900/20 dark:text-warning-300">
              New templates start with <strong>pending</strong> status. An admin will review and approve your template.
            </div>
          )}
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
