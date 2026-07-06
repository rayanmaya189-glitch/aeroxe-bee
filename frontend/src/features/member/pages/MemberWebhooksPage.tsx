import { useState } from 'react'
import { motion } from 'framer-motion'
import { PageTransition } from '@/components/ui/PageTransition'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/services/api'
import type { ApiResponse, PaginatedResponse } from '@/types/api'
import type { Webhook } from '@/types/models'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { EmptyState } from '@/components/ui/EmptyState'
import { PageSkeleton } from '@/components/ui/Skeleton'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { staggerContainer, fadeInUp, itemVariants } from '@/components/animations/variants'
import { Plus, Pencil, Key, Trash2, WebhookIcon } from 'lucide-react'

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
    queryFn: async () => { const res = await api.get<ApiResponse<PaginatedResponse<Webhook>>>('/member/webhooks'); return res.data.data?.data || [] },
  })

  const saveMutation = useMutation({
    mutationFn: async () => {
      const eventList = events.split(',').map((e) => e.trim()).filter(Boolean)
      if (editing) { await api.put(`/member/webhooks/${editing.id}`, { url, events: eventList }) }
      else { await api.post('/member/webhooks', { url, events: eventList }) }
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['member-webhooks'] }); closeForm() },
    onError: (err: Error) => setError(err.message),
  })

  const deleteMutation = useMutation({
    mutationFn: async () => { if (!deleteTarget) return; await api.delete(`/member/webhooks/${deleteTarget.id}`) },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['member-webhooks'] }); setDeleteTarget(null) },
  })

  const rotateSecretMutation = useMutation({
    mutationFn: async (id: string) => { await api.post<ApiResponse<{ secret: string }>>(`/member/webhooks/${id}/rotate-secret`) },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['member-webhooks'] }),
  })

  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => { await api.put(`/member/webhooks/${id}`, { active }) },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['member-webhooks'] }),
  })

  function openForm(webhook?: Webhook) { setEditing(webhook || null); setUrl(webhook?.url || ''); setEvents(webhook?.events?.join(', ') || ''); setError(''); setShowForm(true) }
  function closeForm() { setShowForm(false); setEditing(null); setUrl(''); setEvents(''); setError('') }

  if (isLoading) return <PageTransition><PageSkeleton /></PageTransition>

  return (
    <PageTransition>
    <motion.div initial="hidden" animate="visible" variants={staggerContainer} className="space-y-8">
      <motion.div variants={fadeInUp}>
        <div className="relative overflow-hidden rounded-2xl border border-white/[0.06] bg-white/[0.02] p-8">
          <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-indigo-600/10 blur-[80px]" />
          <div className="pointer-events-none absolute -left-8 bottom-0 h-32 w-32 rounded-full bg-purple-600/10 blur-[60px]" />
          <div className="relative flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 shadow-lg shadow-indigo-500/25">
                <WebhookIcon className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-extrabold tracking-tight text-white lg:text-4xl">
                  <span className="bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">Webhooks</span>
                </h1>
                <p className="mt-1 text-sm text-gray-400">Configure event notifications to your endpoints</p>
              </div>
            </div>
            <Button size="sm" icon={<Plus className="h-4 w-4" />} onClick={() => openForm()}>New webhook</Button>
          </div>
        </div>
      </motion.div>

      {webhooks.length === 0 ? (
        <EmptyState title="No webhooks configured" description="Add a webhook to receive event notifications." action={<Button size="sm" onClick={() => openForm()}>Add webhook</Button>} />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {webhooks.map((wh) => (
            <motion.div key={wh.id} variants={itemVariants}>
              <Card hover>
                <div className="flex items-start justify-between">
                  <div className="min-w-0 flex-1">
                    <h3 className="truncate text-sm font-semibold text-gray-100">{wh.url}</h3>
                    <div className="mt-2 flex flex-wrap gap-1">{wh.events.map((e) => <Badge key={e} variant="default" size="sm">{e}</Badge>)}</div>
                  </div>
                  <button onClick={() => toggleActiveMutation.mutate({ id: wh.id, active: !wh.active })}
                    className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors ${wh.active ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-white/[0.06] text-gray-400 border border-white/[0.08]'}`}>
                    <span className={`h-1.5 w-1.5 rounded-full ${wh.active ? 'bg-emerald-400' : 'bg-gray-500'}`} />{wh.active ? 'Active' : 'Inactive'}
                  </button>
                </div>
                <div className="mt-4 flex gap-2 border-t border-white/[0.06] pt-4">
                  <Button variant="ghost" size="xs" icon={<Pencil className="h-3 w-3" />} onClick={() => openForm(wh)}>Edit</Button>
                  <Button variant="ghost" size="xs" icon={<Key className="h-3 w-3" />} onClick={() => rotateSecretMutation.mutate(wh.id)}>Rotate secret</Button>
                  <Button variant="ghost" size="xs" icon={<Trash2 className="h-3 w-3" />} className="text-red-400" onClick={() => setDeleteTarget(wh)}>Delete</Button>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      <Modal open={showForm} onClose={closeForm} title={editing ? 'Edit webhook' : 'New webhook'}
        footer={<><Button variant="ghost" size="sm" onClick={closeForm} disabled={saveMutation.isPending}>Cancel</Button><Button size="sm" onClick={() => saveMutation.mutate()} loading={saveMutation.isPending}>{editing ? 'Update' : 'Create'}</Button></>}>
        <div className="space-y-4">
          {error && <div className="rounded-2xl border border-red-500/20 bg-red-500/5 p-3 text-sm text-red-400">{error}</div>}
          <Input label="Endpoint URL" type="url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://example.com/webhook" required />
          <Input label="Events" value={events} onChange={(e) => setEvents(e.target.value)} hint="Comma-separated, e.g. message.delivered, message.failed" required />
        </div>
      </Modal>

      <ConfirmDialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)} onConfirm={() => deleteMutation.mutate()} title="Delete webhook" description={`Are you sure you want to delete the webhook for ${deleteTarget?.url}?`} loading={deleteMutation.isPending} />
    </motion.div>
    </PageTransition>
  )
}
