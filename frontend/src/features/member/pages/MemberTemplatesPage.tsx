import { useState } from 'react'
import { motion } from 'framer-motion'
import { PageTransition } from '@/components/ui/PageTransition'
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
import { Plus } from 'lucide-react'

const containerVariants = { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.06 } } }
const itemVariants = { hidden: { opacity: 0, y: 12 }, visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] } } }

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
    queryFn: async () => { const res = await api.get<ApiResponse<Template[]>>('/member/templates'); return res.data.data || [] },
  })

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (editing) { await api.put(`/member/templates/${editing.id}`, { name, body, variables: [] }) }
      else { await api.post('/member/templates', { name, body, variables: [] }) }
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['member-templates'] }); closeForm() },
    onError: (err: Error) => setError(err.message),
  })

  const deleteMutation = useMutation({
    mutationFn: async () => { if (!deleteTarget) return; await api.delete(`/member/templates/${deleteTarget.id}`) },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['member-templates'] }); setDeleteTarget(null) },
  })

  function openForm(template?: Template) { setEditing(template || null); setName(template?.name || ''); setBody(template?.body || ''); setError(''); setShowForm(true) }
  function closeForm() { setShowForm(false); setEditing(null); setName(''); setBody(''); setError('') }

  if (isLoading) return <PageTransition><PageSkeleton /></PageTransition>

  return (
    <PageTransition>
    <motion.div initial="hidden" animate="visible" variants={containerVariants} className="space-y-6">
      <motion.div variants={itemVariants} className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold tracking-tight text-gray-100">Templates</h1><p className="mt-1 text-sm text-gray-400">Manage your message templates</p></div>
        <Button size="sm" icon={<Plus className="h-4 w-4" />} onClick={() => openForm()}>New template</Button>
      </motion.div>

      <motion.div variants={itemVariants} className="rounded-lg border border-cyan-500/20 bg-cyan-500/5 p-3 text-sm text-cyan-400">
        Templates require admin approval after creation. You can edit or delete templates while they are pending.
      </motion.div>

      {templates.length === 0 ? (
        <EmptyState title="No templates yet" description="Create a template to reuse message content." action={<Button size="sm" onClick={() => openForm()}>Create template</Button>} />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {templates.map((t) => (
            <motion.div key={t.id} variants={itemVariants}>
              <Card hover>
                <div className="flex items-start justify-between">
                  <h3 className="text-sm font-semibold text-gray-100">{t.name}</h3>
                  <Badge variant={t.approval_status === 'approved' ? 'success' : t.approval_status === 'rejected' ? 'danger' : 'warning'} dot size="sm">{t.approval_status}</Badge>
                </div>
                <p className="mt-2 line-clamp-3 text-xs text-gray-400">{t.body}</p>
                <div className="mt-4 flex gap-2 border-t border-white/[0.06] pt-4">
                  <Button variant="ghost" size="xs" onClick={() => openForm(t)}>Edit</Button>
                  <Button variant="ghost" size="xs" className="text-red-400" onClick={() => setDeleteTarget(t)}>Delete</Button>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      <Modal open={showForm} onClose={closeForm} title={editing ? 'Edit template' : 'New template'}
        footer={<><Button variant="ghost" size="sm" onClick={closeForm} disabled={saveMutation.isPending}>Cancel</Button><Button size="sm" onClick={() => saveMutation.mutate()} loading={saveMutation.isPending}>{editing ? 'Update' : 'Create'}</Button></>}>
        <div className="space-y-4">
          {error && <div className="rounded-lg border border-red-500/20 bg-red-500/5 p-3 text-sm text-red-400">{error}</div>}
          <Input label="Template name" value={name} onChange={(e) => setName(e.target.value)} required />
          <div><label className="mb-1.5 block text-sm font-medium text-gray-300">Body</label>
            <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={5} className="block w-full rounded-lg border border-white/[0.08] bg-white/[0.05] px-3.5 py-2.5 text-sm text-gray-100 focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-500/10 placeholder:text-gray-500" required /></div>
        </div>
      </Modal>

      <ConfirmDialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)} onConfirm={() => deleteMutation.mutate()} title="Delete template" description={`Are you sure you want to delete "${deleteTarget?.name}"?`} loading={deleteMutation.isPending} />
    </motion.div>
    </PageTransition>
  )
}
