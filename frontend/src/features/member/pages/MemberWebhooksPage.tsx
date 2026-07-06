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
import { Plus, Pencil, Key, Trash2, WebhookIcon, Eye, EyeOff, Check, Copy, ChevronDown, ChevronRight, Shield, Terminal, Code } from 'lucide-react'

export function MemberWebhooksPage() {
  const queryClient = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Webhook | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Webhook | null>(null)
  const [url, setUrl] = useState('')
  const [events, setEvents] = useState('')
  const [error, setError] = useState('')
  const [createdSecret, setCreatedSecret] = useState<string | null>(null)
  const [createdWebhookUrl, setCreatedWebhookUrl] = useState('')
  const [rotatedSecret, setRotatedSecret] = useState<string | null>(null)
  const [showVerificationDocs, setShowVerificationDocs] = useState(false)
  const [copied, setCopied] = useState(false)
  const [secretVisible, setSecretVisible] = useState(false)

  const { data: webhooks = [], isLoading } = useQuery({
    queryKey: ['member-webhooks'],
    queryFn: async () => { const res = await api.get<ApiResponse<PaginatedResponse<Webhook>>>('/member/webhooks'); return res.data.data?.data || [] },
  })

  const saveMutation = useMutation({
    mutationFn: async () => {
      const eventList = events.split(',').map((e) => e.trim()).filter(Boolean)
      if (editing) { await api.put(`/member/webhooks/${editing.id}`, { url, events: eventList }) }
      else {
        const res = await api.post<ApiResponse<{ id: string; url: string; events: string[]; active: boolean; secret: string }>>('/member/webhooks', { url, events: eventList })
        if (res.data.success && res.data.data?.secret) {
          setCreatedSecret(res.data.data.secret)
          setCreatedWebhookUrl(res.data.data.url)
        }
      }
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['member-webhooks'] }); closeForm() },
    onError: (err: Error) => setError(err.message),
  })

  const deleteMutation = useMutation({
    mutationFn: async () => { if (!deleteTarget) return; await api.delete(`/member/webhooks/${deleteTarget.id}`) },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['member-webhooks'] }); setDeleteTarget(null) },
  })

  const rotateSecretMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await api.post<ApiResponse<{ secret: string }>>(`/member/webhooks/${id}/rotate-secret`)
      if (res.data.success && res.data.data?.secret) {
        setRotatedSecret(res.data.data.secret)
      }
    },
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

      <ConfirmDialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)} onConfirm={() => deleteMutation.mutate()} title="Delete webhook" description={`Are you sure you want to delete the webhook for ${deleteTarget?.url}?`} loading={deleteMutation.isPending} />
    </motion.div>
    </PageTransition>
  )
}

function WebhookVerificationDocs() {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 border-b border-white/[0.06] pb-2">
        <Code className="h-4 w-4 text-blue-400" />
        <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">Signature Verification</span>
      </div>

      <p className="text-xs leading-relaxed text-gray-400">
        Every webhook request includes an <code className="rounded bg-white/[0.06] px-1.5 py-0.5 font-mono text-xs text-blue-300">X-Signature</code> header containing an HMAC-SHA256 signature of the raw request body. Use your webhook secret to verify the signature before processing the payload.
      </p>

      <div className="rounded-xl border border-white/[0.06] bg-black/30 p-4">
        <div className="mb-2 flex items-center gap-2">
          <Terminal className="h-3.5 w-3.5 text-emerald-400" />
          <span className="text-xs font-medium text-emerald-400">Node.js / TypeScript</span>
        </div>
        <pre className="overflow-x-auto text-xs leading-relaxed text-gray-300"><code>{`import { createHmac, timingSafeEqual } from 'crypto'

function verifyWebhookSignature(
  rawBody: Buffer,
  signature: string,
  secret: string
): boolean {
  const expected = createHmac('sha256', secret)
    .update(rawBody)
    .digest('hex')

  return timingSafeEqual(
    Buffer.from(expected),
    Buffer.from(signature)
  )
}`}</code></pre>
      </div>

      <div className="rounded-xl border border-white/[0.06] bg-black/30 p-4">
        <div className="mb-2 flex items-center gap-2">
          <Terminal className="h-3.5 w-3.5 text-emerald-400" />
          <span className="text-xs font-medium text-emerald-400">Python</span>
        </div>
        <pre className="overflow-x-auto text-xs leading-relaxed text-gray-300"><code>{`import hmac
import hashlib

def verify_webhook_signature(
    raw_body: bytes,
    signature: str,
    secret: str
) -> bool:
    expected = hmac.new(
        secret.encode(),
        raw_body,
        hashlib.sha256
    ).hexdigest()
    return hmac.compare_digest(expected, signature)`}</code></pre>
      </div>

      <div className="rounded-xl border border-white/[0.06] bg-black/30 p-4">
        <div className="mb-2 flex items-center gap-2">
          <Terminal className="h-3.5 w-3.5 text-emerald-400" />
          <span className="text-xs font-medium text-emerald-400">Go</span>
        </div>
        <pre className="overflow-x-auto text-xs leading-relaxed text-gray-300"><code>{`import (
  "crypto/hmac"
  "crypto/sha256"
  "encoding/hex"
)

func VerifySignature(
  payload []byte,
  secret string,
  signature string,
) bool {
  mac := hmac.New(sha256.New, []byte(secret))
  mac.Write(payload)
  expected := hex.EncodeToString(mac.Sum(nil))
  return hmac.Equal(
    []byte(expected),
    []byte(signature),
  )
}`}</code></pre>
      </div>

      <div className="mt-3 rounded-lg border border-amber-500/15 bg-amber-500/5 p-3">
        <p className="text-xs text-amber-400/80">
          <strong className="text-amber-300">Security tip:</strong> Always use a constant-time comparison function (like <code className="rounded bg-white/[0.06] px-1 font-mono text-xs text-amber-300">timingSafeEqual</code> or <code className="rounded bg-white/[0.06] px-1 font-mono text-xs text-amber-300">compare_digest</code>) when verifying signatures. This prevents timing attacks.
        </p>
      </div>
    </div>
  )
}
