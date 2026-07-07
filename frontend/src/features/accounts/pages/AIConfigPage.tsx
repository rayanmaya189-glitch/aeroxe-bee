import { useState } from 'react'
import { motion } from 'framer-motion'
import { PageTransition } from '@/components/ui/PageTransition'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getAIConfigs, createAIConfig, updateAIConfig, deleteAIConfig, getAIChangeRequests, approveAIChangeRequest, rejectAIChangeRequest } from '@/services/dashboard'
import type { AIConfig, AIConfigChangeRequest } from '@/services/dashboard'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { EmptyState } from '@/components/ui/EmptyState'
import { PageSkeleton } from '@/components/ui/Skeleton'
import { staggerContainer, fadeInUp, itemVariants } from '@/components/animations/variants'
import { Brain, Plus, Trash2, Power, PowerOff, CheckCircle, XCircle, Clock } from 'lucide-react'
import { useToast } from '@/components/ui/Toast'

export function AIConfigPage() {
  const queryClient = useQueryClient()
  const { addToast } = useToast()
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<AIConfig | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<AIConfig | null>(null)
  const [provider, setProvider] = useState('ollama')
  const [label, setLabel] = useState('')
  const [endpointUrl, setEndpointUrl] = useState('')
  const [apiKey, setApiKey] = useState('')
  const [model, setModel] = useState('')
  const [isActive, setIsActive] = useState(false)
  const [error, setError] = useState('')

  const { data: configs = [], isLoading: configsLoading } = useQuery({
    queryKey: ['ai-configs'],
    queryFn: getAIConfigs,
    staleTime: 30_000,
  })

  const { data: changeRequests = [] } = useQuery({
    queryKey: ['ai-change-requests'],
    queryFn: getAIChangeRequests,
    staleTime: 15_000,
  })

  const pendingRequests = changeRequests.filter((r) => r.status === 'pending')

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (editing) {
        return updateAIConfig(editing.id, { provider, label, endpoint_url: endpointUrl, api_key: apiKey, model, is_active: isActive })
      }
      return createAIConfig({ provider, label, endpoint_url: endpointUrl, api_key: apiKey, model, is_active: isActive })
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['ai-configs'] })
      queryClient.invalidateQueries({ queryKey: ['ai-change-requests'] })
      closeForm()
      if (res && 'request_id' in res) {
        addToast('Change request submitted for admin approval', 'info')
      } else {
        addToast(`AI config ${editing ? 'updated' : 'created'}`, 'success')
      }
    },
    onError: (err: Error) => {
      addToast(err.message, 'error')
      setError(err.message)
    },
  })

  const deleteMutation = useMutation({
    mutationFn: () => deleteAIConfig(deleteTarget!.id),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['ai-configs'] })
      queryClient.invalidateQueries({ queryKey: ['ai-change-requests'] })
      setDeleteTarget(null)
      if (res && 'request_id' in (res as object)) {
        addToast('Delete change request submitted for admin approval', 'info')
      } else {
        addToast('AI config deleted', 'success')
      }
    },
    onError: (err: Error) => { addToast(err.message, 'error') },
  })

  const approveMutation = useMutation({
    mutationFn: (id: string) => approveAIChangeRequest(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['ai-change-requests'] }); queryClient.invalidateQueries({ queryKey: ['ai-configs'] }); addToast('Change request approved', 'success') },
    onError: (err: Error) => { addToast(err.message, 'error') },
  })

  const rejectMutation = useMutation({
    mutationFn: (id: string) => rejectAIChangeRequest(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['ai-change-requests'] }); addToast('Change request rejected', 'success') },
    onError: (err: Error) => { addToast(err.message, 'error') },
  })

  function openForm(config?: AIConfig) {
    setEditing(config || null)
    setProvider(config?.provider || 'ollama')
    setLabel(config?.label || '')
    setEndpointUrl(config?.endpoint_url || '')
    setApiKey('')
    setModel(config?.model || '')
    setIsActive(config?.is_active || false)
    setError('')
    setShowForm(true)
  }

  function closeForm() {
    setShowForm(false)
    setEditing(null)
    setProvider('ollama')
    setLabel('')
    setEndpointUrl('')
    setApiKey('')
    setModel('')
    setIsActive(false)
    setError('')
  }

  if (configsLoading) return <PageTransition><PageSkeleton /></PageTransition>

  return (
    <PageTransition>
    <motion.div initial="hidden" animate="visible" variants={staggerContainer} className="space-y-6">
      {/* Hero */}
      <motion.div variants={fadeInUp}>
        <div className="relative overflow-hidden rounded-2xl border border-white/[0.06] bg-white/[0.02] p-8">
          <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-purple-600/10 blur-[80px]" />
          <div className="pointer-events-none absolute -left-8 bottom-0 h-32 w-32 rounded-full bg-violet-600/10 blur-[60px]" />
          <div className="relative flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-500 to-violet-600 shadow-lg shadow-purple-500/25">
                <Brain className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-extrabold tracking-tight text-white lg:text-4xl">
                  <span className="bg-gradient-to-r from-purple-400 to-violet-400 bg-clip-text text-transparent">AI Config</span>
                </h1>
                <p className="mt-1 text-sm text-gray-400">Configure AI providers for smart template generation</p>
              </div>
            </div>
            <Button size="sm" icon={<Plus className="h-4 w-4" />} onClick={() => openForm()}>Add provider</Button>
          </div>
        </div>
      </motion.div>

      {/* Pending change requests */}
      {pendingRequests.length > 0 && (
        <motion.div variants={itemVariants}>
          <Card>
            <div className="flex items-center gap-2 mb-4">
              <Clock className="h-5 w-5 text-amber-400" />
              <h2 className="text-lg font-bold text-white">Pending Change Requests</h2>
              <Badge variant="warning" size="sm">{pendingRequests.length}</Badge>
            </div>
            <div className="space-y-3">
              {pendingRequests.map((req) => (
                <div key={req.id} className="flex items-center justify-between rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <Badge variant="default" size="sm">{req.action}</Badge>
                      <span className="text-sm font-medium text-gray-200">{req.config_type}</span>
                    </div>
                    <p className="mt-1 text-xs text-gray-500">
                      Requested {new Date(req.created_at).toLocaleString()}
                    </p>
                    {req.payload && (
                      <pre className="mt-2 max-h-24 overflow-auto rounded bg-black/20 p-2 text-[10px] text-gray-400">
                        {JSON.stringify(req.payload, null, 2)}
                      </pre>
                    )}
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <Button size="xs" className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" icon={<CheckCircle className="h-3 w-3" />} onClick={() => approveMutation.mutate(req.id)} loading={approveMutation.isPending}>
                      Approve
                    </Button>
                    <Button size="xs" className="bg-red-500/10 text-red-400 border border-red-500/20" icon={<XCircle className="h-3 w-3" />} onClick={() => rejectMutation.mutate(req.id)} loading={rejectMutation.isPending}>
                      Reject
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </motion.div>
      )}

      {/* Provider cards */}
      {configs.length === 0 ? (
        <EmptyState
          title="No AI providers configured"
          description="Add an AI provider to enable smart template generation. Supports Ollama and OpenAI-compatible APIs."
          action={<Button size="sm" onClick={() => openForm()}>Add provider</Button>}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {configs.map((config) => (
            <motion.div key={config.id} variants={itemVariants}>
              <Card hover>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${
                      config.is_active
                        ? 'bg-gradient-to-br from-emerald-500 to-green-600 shadow-lg shadow-emerald-500/25'
                        : 'bg-white/[0.05]'
                    }`}>
                      <Brain className={`h-5 w-5 ${config.is_active ? 'text-white' : 'text-gray-400'}`} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-semibold text-gray-100">{config.label}</h3>
                        <Badge variant="default" size="sm">{config.provider}</Badge>
                        {config.is_active && <Badge variant="success" dot size="sm">Active</Badge>}
                      </div>
                      <p className="mt-0.5 text-xs font-mono text-gray-500">{config.model}</p>
                    </div>
                  </div>
                </div>
                <div className="mt-3 space-y-1">
                  <p className="text-xs text-gray-500 truncate">
                    <span className="text-gray-400">Endpoint:</span> {config.endpoint_url}
                  </p>
                  {config.api_key && <p className="text-xs text-gray-500">API key: {'•'.repeat(24)}</p>}
                </div>
                <div className="mt-4 flex gap-2 border-t border-white/[0.06] pt-4">
                  <Button variant="ghost" size="xs" onClick={() => openForm(config)}>Edit</Button>
                  <Button variant="ghost" size="xs" className="text-red-400" onClick={() => setDeleteTarget(config)}>Delete</Button>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      {/* Change request history */}
      {changeRequests.length > 0 && (
        <motion.div variants={itemVariants}>
          <Card>
            <h2 className="text-lg font-bold text-white mb-4">Change History</h2>
            <div className="space-y-2">
              {changeRequests.map((req) => (
                <div key={req.id} className="flex items-center justify-between rounded-xl border border-white/[0.04] bg-white/[0.02] p-3">
                  <div className="flex items-center gap-3">
                    <Badge variant={req.status === 'approved' ? 'success' : req.status === 'rejected' ? 'danger' : 'warning'} size="sm">
                      {req.status}
                    </Badge>
                    <span className="text-xs font-medium text-gray-300">{req.action} · {req.config_type}</span>
                    <span className="text-xs text-gray-500">{new Date(req.created_at).toLocaleDateString()}</span>
                  </div>
                  {req.review_notes && <span className="text-xs text-gray-500">{req.review_notes}</span>}
                </div>
              ))}
            </div>
          </Card>
        </motion.div>
      )}

      {/* Add/Edit modal */}
      <Modal
        open={showForm}
        onClose={closeForm}
        title={editing ? 'Edit AI provider' : 'Add AI provider'}
        footer={
          <><Button variant="ghost" size="sm" onClick={closeForm} disabled={saveMutation.isPending}>Cancel</Button>
          <Button size="sm" onClick={() => saveMutation.mutate()} loading={saveMutation.isPending}>{editing ? 'Update' : 'Add'}</Button></>
        }
      >
        <div className="space-y-4">
          {error && <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-3 text-sm text-red-400">{error}</div>}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-300">Provider</label>
            <select value={provider} onChange={(e) => setProvider(e.target.value)} className="block w-full rounded-xl border border-white/[0.08] bg-white/[0.05] px-3.5 py-2.5 text-sm text-gray-100 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-500/10" required>
              <option value="ollama">Ollama (local)</option>
              <option value="openai">OpenAI-compatible</option>
            </select>
          </div>
          <Input label="Label" value={label} onChange={(e) => setLabel(e.target.value)} placeholder="e.g. Local Ollama, GPT-4o Mini" required />
          <Input label="Endpoint URL" value={endpointUrl} onChange={(e) => setEndpointUrl(e.target.value)}
            placeholder={provider === 'ollama' ? 'http://localhost:11434' : 'https://api.openai.com/v1'}
            required />
          <Input label={editing ? 'API Key (leave blank to keep existing)' : 'API Key'} type="password" value={apiKey}
            onChange={(e) => setApiKey(e.target.value)} placeholder={provider === 'ollama' ? '(not needed for local Ollama)' : 'sk-...'} />
          <Input label="Model" value={model} onChange={(e) => setModel(e.target.value)}
            placeholder={provider === 'ollama' ? 'llama3' : 'gpt-4o-mini'}
            required />
          <div className="flex items-center gap-3">
            <input type="checkbox" id="isActive" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} className="rounded border-white/[0.08] bg-white/[0.05]" />
            <label htmlFor="isActive" className="text-sm text-gray-300">Set as active provider</label>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => deleteMutation.mutate()}
        title="Delete AI provider"
        description={`Are you sure you want to delete "${deleteTarget?.label}"?`}
        loading={deleteMutation.isPending}
      />
    </motion.div>
    </PageTransition>
  )
}
