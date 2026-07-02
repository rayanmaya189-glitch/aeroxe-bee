import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getWebhooks, createWebhook, deleteWebhook, rotateWebhookSecret } from '@/services/dashboard'
import api from '@/services/api'
import type { Webhook } from '@/types/models'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { EmptyState } from '@/components/ui/EmptyState'
import { PageSkeleton } from '@/components/ui/Skeleton'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'

export function WebhooksPage() {
  const queryClient = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<Webhook | null>(null)
  const [url, setUrl] = useState('')
  const [events, setEvents] = useState('')
  const [error, setError] = useState('')

  const { data: webhooks = [], isLoading } = useQuery({
    queryKey: ['admin-webhooks'],
    queryFn: getWebhooks,
  })

  const saveMutation = useMutation({
    mutationFn: async () => {
      const eventList = events.split(',').map((e) => e.trim()).filter(Boolean)
      await createWebhook({ url, events: eventList })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-webhooks'] })
      setShowForm(false); setUrl(''); setEvents('')
    },
    onError: (err: Error) => setError(err.message),
  })

  const deleteMutation = useMutation({
    mutationFn: async () => { if (deleteTarget) await deleteWebhook(deleteTarget.id) },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-webhooks'] })
      setDeleteTarget(null)
    },
  })

  const rotateMutation = useMutation({
    mutationFn: rotateWebhookSecret,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-webhooks'] }),
  })

  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      const res = await api.put(`/webhooks/${id}`, { active })
      return res.data
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-webhooks'] }),
  })

  if (isLoading) return <PageSkeleton />

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-100">Webhooks</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Configure event notifications to your endpoints</p>
        </div>
        <Button size="sm" onClick={() => { setError(''); setShowForm(true) }}>New webhook</Button>
      </div>

      {webhooks.length === 0 ? (
        <EmptyState
          title="No webhooks configured"
          description="Add a webhook to receive event notifications."
          action={<Button size="sm" onClick={() => { setError(''); setShowForm(true) }}>Add webhook</Button>}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {webhooks.map((wh) => (
            <Card key={wh.id} hover>
              <div className="flex items-start justify-between">
                <div className="min-w-0 flex-1">
                  <h3 className="truncate text-sm font-semibold text-gray-900 dark:text-gray-100">{wh.url}</h3>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {wh.events.map((e) => <Badge key={e} size="sm">{e}</Badge>)}
                  </div>
                </div>
                <button
                  onClick={() => toggleActiveMutation.mutate({ id: wh.id, active: !wh.active })}
                  className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors ${
                    wh.active
                      ? 'bg-success-50 text-success-700 hover:bg-success-100 dark:bg-success-900/30 dark:text-success-300'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400'
                  }`}
                >
                  <span className={`h-1.5 w-1.5 rounded-full ${wh.active ? 'bg-success-500' : 'bg-gray-400'}`} />
                  {wh.active ? 'Active' : 'Inactive'}
                </button>
              </div>
              <div className="mt-4 flex gap-2 border-t border-gray-100 pt-4 dark:border-gray-800">
                <Button variant="ghost" size="xs" onClick={() => rotateMutation.mutate(wh.id)}>Rotate secret</Button>
                <Button variant="ghost" size="xs" className="text-danger-600" onClick={() => setDeleteTarget(wh)}>Delete</Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal
        open={showForm}
        onClose={() => setShowForm(false)}
        title="New webhook"
        footer={
          <>
            <Button variant="ghost" size="sm" onClick={() => setShowForm(false)} disabled={saveMutation.isPending}>Cancel</Button>
            <Button size="sm" onClick={() => saveMutation.mutate()} loading={saveMutation.isPending}>Create</Button>
          </>
        }
      >
        <div className="space-y-4">
          {error && <div className="rounded-lg border border-danger-200 bg-danger-50 p-3 text-sm text-danger-700">{error}</div>}
          <Input label="Endpoint URL" type="url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://example.com/webhook" required />
          <Input label="Events" value={events} onChange={(e) => setEvents(e.target.value)} hint="Comma-separated events" required />
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
