import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { PageTransition } from '@/components/ui/PageTransition'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getWebhooks, createWebhook, deleteWebhook, rotateWebhookSecret, bulkDeleteWebhooks, getWebhookDeliveries, testWebhook } from '@/services/dashboard'
import type { WebhookTestResult } from '@/services/dashboard'
import api from '@/services/api'
import type { Webhook, WebhookDelivery } from '@/types/models'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { EmptyState } from '@/components/ui/EmptyState'
import { PageSkeleton } from '@/components/ui/Skeleton'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { staggerContainer, fadeInUp, itemVariants } from '@/components/animations/variants'
import { Plus, WebhookIcon, Trash2, CheckSquare, Square, Eye, EyeOff, Check, Copy, ChevronDown, ChevronRight, Shield, History, CheckCircle, XCircle, Clock, Loader2, Send } from 'lucide-react'
import { useToast } from '@/components/ui/Toast'
import { WebhookVerificationDocs } from '@/components/ui/WebhookVerificationDocs'
import { cn } from '@/utils/cn'

export function WebhooksPage() {
  const queryClient = useQueryClient()
  const { addToast } = useToast()
  const [showForm, setShowForm] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<Webhook | null>(null)
  const [rotateTarget, setRotateTarget] = useState<Webhook | null>(null)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [showBulkDelete, setShowBulkDelete] = useState(false)
  const [url, setUrl] = useState('')
  const [events, setEvents] = useState('')
  const [error, setError] = useState('')
  const [createdSecret, setCreatedSecret] = useState<string | null>(null)
  const [createdWebhookUrl, setCreatedWebhookUrl] = useState('')
  const [rotatedSecret, setRotatedSecret] = useState<string | null>(null)
  const [showVerificationDocs, setShowVerificationDocs] = useState(false)
  const [copied, setCopied] = useState(false)
  const [secretVisible, setSecretVisible] = useState(false)
  const [logsExpanded, setLogsExpanded] = useState<Record<string, boolean>>({})
  const [deliveriesCache, setDeliveriesCache] = useState<Record<string, WebhookDelivery[]>>({})
  const [loadingLogs, setLoadingLogs] = useState<Record<string, boolean>>({})
  const [testResult, setTestResult] = useState<{ webhookId: string; url: string; result: WebhookTestResult } | null>(null)
  const [testLoading, setTestLoading] = useState<string | null>(null)

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
      const result = await createWebhook({ url, events: eventList })
      if (result.secret) {
        setCreatedSecret(result.secret)
        setCreatedWebhookUrl(result.url)
      }
      return result
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
    mutationFn: async (id: string) => {
      const secret = await rotateWebhookSecret(id)
      setRotatedSecret(secret)
      return secret
    },
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
                  <Button variant="ghost" size="xs" icon={<Send className="h-3 w-3" />} onClick={async () => { setTestLoading(wh.id); try { const result = await testWebhook(wh.id); setTestResult({ webhookId: wh.id, url: wh.url, result }) } catch { addToast('Failed to test webhook', 'error') } finally { setTestLoading(null) } }} loading={testLoading === wh.id}>Test</Button>
                  <Button variant="ghost" size="xs" onClick={() => setRotateTarget(wh)}>Rotate secret</Button>
                  <Button variant="ghost" size="xs" className="text-red-400" onClick={() => setDeleteTarget(wh)}>Delete</Button>
                </div>
                {/* ─── Delivery log toggle ────────────────────────────── */}
                <div className="mt-2 border-t border-white/[0.04] pt-2">
                  <button
                    onClick={async () => {
                      const expanded = !logsExpanded[wh.id]
                      setLogsExpanded((prev) => ({ ...prev, [wh.id]: expanded }))
                      if (expanded && !deliveriesCache[wh.id]) {
                        setLoadingLogs((prev) => ({ ...prev, [wh.id]: true }))
                        try {
                          const deliveries = await getWebhookDeliveries(wh.id)
                          setDeliveriesCache((prev) => ({ ...prev, [wh.id]: deliveries }))
                        } catch {
                          setDeliveriesCache((prev) => ({ ...prev, [wh.id]: [] }))
                          addToast('Failed to load delivery logs', 'error')
                        } finally {
                          setLoadingLogs((prev) => ({ ...prev, [wh.id]: false }))
                        }
                      }
                    }}
                    className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-xs text-gray-500 hover:text-gray-300 hover:bg-white/[0.03] transition-colors"
                  >
                    <History className="h-3 w-3" />
                    <span>Delivery logs</span>
                    {loadingLogs[wh.id] && <Loader2 className="ml-auto h-3 w-3 animate-spin" />}
                    {logsExpanded[wh.id]
                      ? <ChevronDown className="ml-auto h-3 w-3" />
                      : <ChevronRight className="ml-auto h-3 w-3" />
                    }
                  </button>
                  <AnimatePresence>
                    {logsExpanded[wh.id] && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                      >
                        <DeliveryLogTable deliveries={deliveriesCache[wh.id] || []} loading={loadingLogs[wh.id]} />
                      </motion.div>
                    )}
                  </AnimatePresence>
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

      {/* ─── Secret Reveal Modal (on create) ─────────────────────────── */}
      <Modal open={!!createdSecret} onClose={() => { setCreatedSecret(null); setSecretVisible(false); setCopied(false) }} title="Webhook created" size="lg"
        footer={<Button size="sm" onClick={() => { setCreatedSecret(null); setSecretVisible(false); setCopied(false) }}>I've saved the secret</Button>}>
        {createdSecret && (
          <div className="space-y-5">
            <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4">
              <p className="text-sm text-emerald-300 font-medium">
                Your webhook endpoint <span className="font-mono text-emerald-200">{createdWebhookUrl}</span> has been created.
              </p>
              <p className="mt-1 text-xs text-emerald-400/70">
                <Shield className="mr-1 inline-block h-3 w-3" />
                This secret is shown once. Save it now — you'll need it to verify webhook signatures.
              </p>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-medium text-gray-400 uppercase tracking-wider">Webhook Secret</label>
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <code className="block w-full overflow-x-auto rounded-xl border border-white/[0.08] bg-black/40 px-4 py-3 font-mono text-sm text-amber-300 break-all">
                    {secretVisible ? createdSecret : '•'.repeat(Math.min(createdSecret.length, 48))}
                  </code>
                </div>
                <button
                  onClick={() => setSecretVisible(!secretVisible)}
                  className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.04] text-gray-400 hover:text-gray-200 transition-colors"
                  title={secretVisible ? 'Hide secret' : 'Show secret'}
                >
                  {secretVisible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
                <button
                  onClick={async () => { await navigator.clipboard.writeText(createdSecret); setCopied(true); setTimeout(() => setCopied(false), 2000) }}
                  className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.04] text-gray-400 hover:text-emerald-400 transition-colors"
                  title="Copy secret"
                >
                  {copied ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <WebhookVerificationDocs />
          </div>
        )}
      </Modal>

      {/* ─── Secret Reveal Modal (on rotate) ─────────────────────────── */}
      <Modal open={!!rotatedSecret} onClose={() => { setRotatedSecret(null); setSecretVisible(false); setCopied(false) }} title="Secret rotated" size="lg"
        footer={<Button size="sm" onClick={() => { setRotatedSecret(null); setSecretVisible(false); setCopied(false) }}>Done</Button>}>
        {rotatedSecret && (
          <div className="space-y-5">
            <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
              <p className="text-sm text-amber-300 font-medium">
                The webhook secret has been rotated.
              </p>
              <p className="mt-1 text-xs text-amber-400/70">
                <Shield className="mr-1 inline-block h-3 w-3" />
                Update your endpoint's signature verification with the new secret. The old secret will no longer work.
              </p>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-medium text-gray-400 uppercase tracking-wider">New Secret</label>
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <code className="block w-full overflow-x-auto rounded-xl border border-white/[0.08] bg-black/40 px-4 py-3 font-mono text-sm text-amber-300 break-all">
                    {secretVisible ? rotatedSecret : '•'.repeat(Math.min(rotatedSecret.length, 48))}
                  </code>
                </div>
                <button
                  onClick={() => setSecretVisible(!secretVisible)}
                  className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.04] text-gray-400 hover:text-gray-200 transition-colors"
                  title={secretVisible ? 'Hide secret' : 'Show secret'}
                >
                  {secretVisible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
                <button
                  onClick={async () => { await navigator.clipboard.writeText(rotatedSecret); setCopied(true); setTimeout(() => setCopied(false), 2000) }}
                  className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.04] text-gray-400 hover:text-emerald-400 transition-colors"
                  title="Copy secret"
                >
                  {copied ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <WebhookVerificationDocs />
          </div>
        )}
      </Modal>

      {/* ─── Verification Docs Section ─────────────────────────────── */}
      <motion.div variants={fadeInUp}>
        <button
          onClick={() => setShowVerificationDocs(!showVerificationDocs)}
          className="flex w-full items-center justify-between rounded-xl border border-white/[0.06] bg-white/[0.02] px-5 py-3.5 text-left transition-colors hover:bg-white/[0.04]"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/10">
              <Shield className="h-4 w-4 text-blue-400" />
            </div>
            <div>
              <span className="text-sm font-medium text-gray-200">How to verify webhook signatures</span>
              <p className="text-xs text-gray-500">Learn how to validate incoming webhook payloads</p>
            </div>
          </div>
          {showVerificationDocs ? <ChevronDown className="h-4 w-4 text-gray-500" /> : <ChevronRight className="h-4 w-4 text-gray-500" />}
        </button>
        {showVerificationDocs && (
          <div className="mt-2 rounded-xl border border-white/[0.06] bg-white/[0.02] p-5">
            <WebhookVerificationDocs />
          </div>
        )}
      </motion.div>

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => deleteMutation.mutate()}
        title="Delete webhook"
        description={`Are you sure you want to delete the webhook for ${deleteTarget?.url}?`}
        loading={deleteMutation.isPending}
      />

      {/* ─── Test Result Modal ──────────────────────────────────────── */}
      <Modal
        open={!!testResult}
        onClose={() => setTestResult(null)}
        title="Webhook test result"
        size="lg"
        footer={<Button size="sm" onClick={() => setTestResult(null)}>Done</Button>}
      >
        {testResult && (
          <div className="space-y-5">
            <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
              <p className="text-sm text-gray-300 mb-1">
                Sent test payload to <span className="font-mono text-gray-100">{testResult.url}</span>
              </p>
              <p className="text-xs text-gray-500">Event: <code className="rounded bg-white/[0.06] px-1.5 py-0.5 font-mono">test.ping</code></p>
            </div>

            <div className="flex items-center gap-3 rounded-xl border p-4" style={{
              borderColor: testResult.result.status_code >= 200 && testResult.result.status_code < 300
                ? 'rgba(52,211,153,0.2)'
                : 'rgba(248,113,113,0.2)',
              backgroundColor: testResult.result.status_code >= 200 && testResult.result.status_code < 300
                ? 'rgba(52,211,153,0.05)'
                : 'rgba(248,113,113,0.05)',
            }}>
              {testResult.result.status_code >= 200 && testResult.result.status_code < 300
                ? <CheckCircle className="h-5 w-5 shrink-0 text-emerald-400" />
                : <XCircle className="h-5 w-5 shrink-0 text-red-400" />
              }
              <div>
                <p className="text-sm font-medium" style={{
                  color: testResult.result.status_code >= 200 && testResult.result.status_code < 300 ? '#6ee7b7' : '#fca5a5',
                }}>
                  HTTP {testResult.result.status_code}
                  {testResult.result.status_code >= 200 && testResult.result.status_code < 300 ? ' — Success' : ' — Error'}
                </p>
                {testResult.result.error && (
                  <p className="mt-0.5 text-xs text-red-400/80">{testResult.result.error}</p>
                )}
              </div>
            </div>

            {testResult.result.response_body && (
              <div>
                <label className="mb-1.5 block text-xs font-medium text-gray-400 uppercase tracking-wider">Response Body</label>
                <pre className="max-h-48 overflow-y-auto rounded-xl border border-white/[0.08] bg-black/40 p-4 font-mono text-xs text-gray-300 whitespace-pre-wrap break-all">
                  {testResult.result.response_body}
                </pre>
              </div>
            )}
          </div>
        )}
      </Modal>

      <ConfirmDialog open={!!rotateTarget} onClose={() => setRotateTarget(null)} onConfirm={() => { rotateMutation.mutate(rotateTarget!.id); setRotateTarget(null) }} title="Rotate webhook secret" description={`Are you sure you want to rotate the secret for ${rotateTarget?.url}? The current secret will stop working immediately.`} loading={rotateMutation.isPending} confirmLabel="Rotate" />

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

function DeliveryLogTable({ deliveries, loading }: { deliveries: WebhookDelivery[]; loading?: boolean }) {
  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 px-2 py-4 text-xs text-gray-500">
        <Loader2 className="h-3 w-3 animate-spin" />
        Loading delivery logs...
      </div>
    )
  }

  if (deliveries.length === 0) {
    return (
      <div className="px-2 py-4 text-center text-xs text-gray-500">
        No delivery logs yet. Deliveries will appear here when webhooks are triggered.
      </div>
    )
  }

  return (
    <div className="mt-2 space-y-1.5 px-1">
      {deliveries.slice(0, 10).map((d) => (
        <div
          key={d.id}
          className="flex items-center gap-2 rounded-lg border border-white/[0.04] bg-white/[0.02] px-3 py-2 text-xs"
        >
          <div className="shrink-0">
            {d.completed && d.last_status === 'delivered' ? (
              <CheckCircle className="h-3.5 w-3.5 text-emerald-400" />
            ) : d.last_status === 'dead_letter' ? (
              <XCircle className="h-3.5 w-3.5 text-red-400" />
            ) : d.last_status.startsWith('failed') ? (
              <XCircle className="h-3.5 w-3.5 text-red-400" />
            ) : (
              <Clock className="h-3.5 w-3.5 text-amber-400" />
            )}
          </div>
          <div className="min-w-0 flex-1 space-y-0.5">
            <div className="flex items-center gap-2">
              <span className={cn(
                'font-medium',
                d.last_status === 'delivered' ? 'text-emerald-300' :
                d.last_status === 'dead_letter' ? 'text-red-300' :
                d.last_status.startsWith('failed') ? 'text-red-300' : 'text-amber-300'
              )}>
                {d.last_status}
              </span>
              {d.status_code > 0 && (
                <span className="text-gray-500">HTTP {d.status_code}</span>
              )}
              <span className="text-gray-600">·</span>
              <span className="text-gray-500">{d.event}</span>
            </div>
            <div className="flex items-center gap-2 text-gray-500">
              <span className="font-mono">{d.message_id.slice(0, 8)}…</span>
              <span>·</span>
              <span>{new Date(d.last_attempt_at || d.created_at).toLocaleString()}</span>
              {d.attempt_count > 1 && (
                <>
                  <span>·</span>
                  <span>{d.attempt_count} attempts</span>
                </>
              )}
            </div>
          </div>
        </div>
      ))}
      {deliveries.length > 10 && (
        <p className="text-center text-xs text-gray-500 pt-1">+{deliveries.length - 10} more</p>
      )}
    </div>
  )
}


