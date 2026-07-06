import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { PageTransition } from '@/components/ui/PageTransition'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getWebhooks, createWebhook, deleteWebhook, rotateWebhookSecret, bulkDeleteWebhooks } from '@/services/dashboard'
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
import { staggerContainer, fadeInUp, itemVariants } from '@/components/animations/variants'
import { Plus, WebhookIcon, Trash2, CheckSquare, Square } from 'lucide-react'
import { useToast } from '@/components/ui/Toast'

export function WebhooksPage() {
  const queryClient = useQueryClient()
  const { addToast } = useToast()
  const [showForm, setShowForm] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<Webhook | null>(null)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [showBulkDelete, setShowBulkDelete] = useState(false)
  const [url, setUrl] = useState('')
  const [events, setEvents] = useState('')
  const [error, setError] = useState('')

  const [page, setPage] = useState(1)
  const PAGE_SIZE = 30

  const { data, isLoading } = useQuery({
    queryKey: ['admin-webhooks', page, PAGE_SIZE],
    queryFn: () => getWebhooks({ page, pageSize: PAGE_SIZE }),
    staleTime: 60_000,
  })
  const webhooks = data?.data ?? []
  const totalPages = data?.total_pages ?? 1

  const saveMutation = useMutation({
    mutationFn: async () => {
      const eventList = events.split(',').map((e) => e.trim()).filter(Boolean)
      await createWebhook({ url, events: eventList })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-webhooks'] })
      setShowForm(false); setUrl(''); setEvents(''); addToast('Webhook created', 'success')
    },
    onError: (err: Error) => { addToast(err.message || 'Failed to create webhook', 'error'); setError(err.message) },
  })

  const deleteMutation = useMutation({
    mutationFn: async () => { if (deleteTarget) await deleteWebhook(deleteTarget.id) },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-webhooks'] })
      setDeleteTarget(null); addToast('Webhook deleted', 'success')
    },
  })

  const bulkDeleteMutation = useMutation({
    mutationFn: () => bulkDeleteWebhooks(Array.from(selectedIds)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-webhooks'] })
      setSelectedIds(new Set())
      setShowBulkDelete(false); addToast(`${selectedIds.size} webhooks deleted`, 'success')
    },
  })

  const rotateMutation = useMutation({
    mutationFn: rotateWebhookSecret,
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin-webhooks'] }); addToast('Secret rotated', 'success') },
  })

  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      const res = await api.put(`/webhooks/${id}`, { active })
      return res.data
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-webhooks'] }),
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
    if (selectedIds.size === webhooks.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(webhooks.map((w) => w.id)))
    }
  }

  const isAllSelected = webhooks.length > 0 && selectedIds.size === webhooks.length

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
          <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-indigo-600/10 blur-[80px]" />
          <div className="pointer-events-none absolute -left-8 bottom-0 h-32 w-32 rounded-full bg-cyan-600/10 blur-[60px]" />
          <div className="relative flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-cyan-600 shadow-lg shadow-indigo-500/25">
                <WebhookIcon className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-extrabold tracking-tight text-white lg:text-4xl">
                  <span className="bg-gradient-to-r from-indigo-400 to-cyan-400 bg-clip-text text-transparent">Webhooks</span>
                </h1>
                <p className="mt-1 text-sm text-gray-400">Configure event notifications to your endpoints</p>
              </div>
            </div>
            <Button size="sm" icon={<Plus className="h-4 w-4" />} onClick={() => { setError(''); setShowForm(true) }}>New webhook</Button>
          </div>
        </div>
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
              <span className="text-sm text-blue-400 font-medium">{selectedIds.size} webhook{selectedIds.size > 1 ? 's' : ''} selected</span>
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" onClick={() => setSelectedIds(new Set())}>Clear</Button>
                <Button size="sm" className="bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20" icon={<Trash2 className="h-4 w-4" />} onClick={() => setShowBulkDelete(true)}>
                  Delete ({selectedIds.size})
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {webhooks.length === 0 ? (
        <EmptyState
          title="No webhooks configured"
          description="Add a webhook to receive event notifications."
          action={<Button size="sm" onClick={() => { setError(''); setShowForm(true) }}>Add webhook</Button>}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {webhooks.map((wh) => (
            <motion.div key={wh.id} variants={itemVariants}>
              <Card hover glow={wh.active ? 'bg-emerald-500/15' : 'bg-gray-500/10'}>
                <div className="flex items-start gap-3">
                  <button
                    onClick={() => toggleSelect(wh.id)}
                    className="mt-1 shrink-0 transition-colors hover:opacity-80"
                  >
                    {selectedIds.has(wh.id)
                      ? <CheckSquare className="h-4 w-4 text-blue-400" />
                      : <Square className="h-4 w-4 text-gray-600" />
                    }
                  </button>
                  <div className="min-w-0 flex-1">
                    <h3 className="truncate text-sm font-semibold text-gray-100">{wh.url}</h3>
                    {wh.account_name && (
                      <p className="mt-1 text-xs text-gray-500">Account: {wh.account_name}</p>
                    )}
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {wh.events.map((e) => <Badge key={e} size="sm">{e}</Badge>)}
                    </div>
                  </div>
                  <button
                    onClick={() => toggleActiveMutation.mutate({ id: wh.id, active: !wh.active })}
                    className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium transition-all duration-200 ${
                      wh.active
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20'
                        : 'bg-white/[0.06] text-gray-400 border border-white/[0.08] hover:bg-white/[0.1]'
                    }`}
                  >
                    <span className={`h-1.5 w-1.5 rounded-full ${wh.active ? 'bg-emerald-400 animate-pulse' : 'bg-gray-500'}`} />
                    {wh.active ? 'Active' : 'Inactive'}
                  </button>
                </div>
                <div className="mt-4 flex gap-2 border-t border-white/[0.06] pt-4">
                  <Button variant="ghost" size="xs" onClick={() => rotateMutation.mutate(wh.id)}>Rotate secret</Button>
                  <Button variant="ghost" size="xs" className="text-red-400" onClick={() => setDeleteTarget(wh)}>Delete</Button>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      {/* Select all checkbox */}
      {webhooks.length > 0 && (
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
        title="New webhook"
        footer={
          <>
            <Button variant="ghost" size="sm" onClick={() => setShowForm(false)} disabled={saveMutation.isPending}>Cancel</Button>
            <Button size="sm" onClick={() => saveMutation.mutate()} loading={saveMutation.isPending}>Create</Button>
          </>
        }
      >
        <div className="space-y-4">
          {error && <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-3 text-sm text-red-400">{error}</div>}
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

      <ConfirmDialog
        open={showBulkDelete}
        onClose={() => setShowBulkDelete(false)}
        onConfirm={() => bulkDeleteMutation.mutate()}
        title="Bulk delete webhooks"
        description={`Are you sure you want to delete ${selectedIds.size} webhook${selectedIds.size > 1 ? 's' : ''}? This cannot be undone.`}
        loading={bulkDeleteMutation.isPending}
      />
    </motion.div>
    </PageTransition>
  )
}
