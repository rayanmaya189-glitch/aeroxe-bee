import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/services/api'
import type { ApiResponse } from '@/types/api'
import type { Webhook } from '@/types/models'
import { Card, CardHeader, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { EmptyState } from '@/components/ui/EmptyState'
import { PageSkeleton } from '@/components/ui/Skeleton'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'

export function MemberWebhooksPage() {
  const queryClient = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Webhook | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Webhook | null>(null)
  const [url, setUrl] = useState('')
  const [events, setEvents] = useState('')
  const [error, setError] = useState('')

  const { data: webhooks = [], isLoading } = useQuery({
    queryKey: ['member-webhooks'],
    queryFn: async () => {
      const res = await api.get<ApiResponse<Webhook[]>>('/member/webhooks')
      return res.data.data || []
    },
  })

  const saveMutation = useMutation({
    mutationFn: async () => {
      const eventList = events.split(',').map((e) => e.trim()).filter(Boolean)
      if (editing) {
        await api.put(`/member/webhooks/${editing.id}`, { url, events: eventList })
      } else {
        await api.post('/member/webhooks', { url, events: eventList })
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['member-webhooks'] })
      closeForm()
    },
    onError: (err: Error) => setError(err.message),
  })

  const deleteMutation = useMutation({
    mutationFn: async () => {
      if (!deleteTarget) return
      await api.delete(`/member/webhooks/${deleteTarget.id}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['member-webhooks'] })
      setDeleteTarget(null)
    },
  })

  const rotateSecretMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await api.post<ApiResponse<{ secret: string }>>(`/member/webhooks/${id}/rotate-secret`)
      return res.data.data!.secret
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['member-webhooks'] })
    },
  })

  function openForm(webhook?: Webhook) {
    setEditing(webhook || null)
    setUrl(webhook?.url || '')
    setEvents(webhook?.events?.join(', ') || '')
    setError('')
    setShowForm(true)
  }

  function closeForm() {
    setShowForm(false)
    setEditing(null)
    setUrl('')
    setEvents('')
    setError('')
  }

  if (isLoading) return <PageSkeleton />

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-100">Webhooks</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Configure event notifications to your endpoints</p>
        </div>
        <Button size="sm" onClick={() => openForm()}>New webhook</Button>
      </div>

      {webhooks.length === 0 ? (
        <EmptyState
          title="No webhooks configured"
          description="Add a webhook to receive event notifications."
          action={<Button size="sm" onClick={() => openForm()}>Add webhook</Button>}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {webhooks.map((wh) => (
            <Card key={wh.id} hover>
              <div className="flex items-start justify-between">
                <div className="min-w-0 flex-1">
                  <h3 className="truncate text-sm font-semibold text-gray-900 dark:text-gray-100">{wh.url}</h3>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {wh.events.map((e) => (
                      <Badge key={e} variant="default" size="sm">{e}</Badge>
                    ))}
                  </div>
                </div>
                <Badge variant={wh.active ? 'success' : 'default'} dot size="sm">
                  {wh.active ? 'Active' : 'Inactive'}
                </Badge>
              </div>
              <div className="mt-4 flex gap-2 border-t border-gray-100 pt-4 dark:border-gray-800">
                <Button variant="ghost" size="xs" onClick={() => openForm(wh)}>Edit</Button>
                <Button variant="ghost" size="xs" onClick={() => rotateSecretMutation.mutate(wh.id)}>Rotate secret</Button>
                <Button variant="ghost" size="xs" className="text-danger-600" onClick={() => setDeleteTarget(wh)}>Delete</Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal
        open={showForm}
        onClose={closeForm}
        title={editing ? 'Edit webhook' : 'New webhook'}
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
          <Input label="Endpoint URL" type="url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://example.com/webhook" required />
          <Input label="Events" value={events} onChange={(e) => setEvents(e.target.value)} hint="Comma-separated, e.g. message.delivered, message.failed" required />
        </div>
      </Modal>

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => deleteMutation.mutate()}
        title="Delete webhook"
        description={`Are you sure you want to delete the webhook for ${deleteTarget?.url}?`}
        loading={deleteMutation.isPending}
      />
    </div>
  )
}
