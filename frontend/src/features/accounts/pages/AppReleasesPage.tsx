import { useState, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import { PageTransition } from '@/components/ui/PageTransition'
import api from '@/services/api'
import type { ApiResponse, PaginatedResponse } from '@/types/api'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { EmptyState } from '@/components/ui/EmptyState'
import { PageSkeleton } from '@/components/ui/Skeleton'
import { staggerContainer, fadeInUp, itemVariants } from '@/components/animations/variants'
import { AppWindow, Upload, CheckCircle, XCircle, Clock, Send, Rocket, Trash2 } from 'lucide-react'

interface AppRelease {
  id: string
  version_code: number
  version_name: string
  release_type: 'force' | 'normal'
  title: string
  release_notes: string
  min_required_version: number
  apk_url: string
  apk_filename: string
  apk_size_bytes: number
  status: 'draft' | 'pending_approval' | 'approved' | 'released' | 'rejected'
  submitted_by_name: string
  approved_by_name: string
  rejection_reason: string
  released_at: string | null
  created_at: string
}

const statusConfig: Record<string, { label: string; variant: 'success' | 'warning' | 'danger' | 'info' | 'default'; icon: React.ReactNode }> = {
  draft: { label: 'Draft', variant: 'default', icon: <Clock className="h-3 w-3" /> },
  pending_approval: { label: 'Pending Approval', variant: 'warning', icon: <Clock className="h-3 w-3" /> },
  approved: { label: 'Approved', variant: 'info', icon: <CheckCircle className="h-3 w-3" /> },
  released: { label: 'Released', variant: 'success', icon: <Rocket className="h-3 w-3" /> },
  rejected: { label: 'Rejected', variant: 'danger', icon: <XCircle className="h-3 w-3" /> },
}

export function AppReleasesPage() {
  const [releases, setReleases] = useState<AppRelease[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [showUpload, setShowUpload] = useState(false)
  const [uploadReleaseId, setUploadReleaseId] = useState('')

  // Form state
  const [form, setForm] = useState({
    version_code: '',
    version_name: '',
    release_type: 'normal',
    title: '',
    release_notes: '',
    min_required_version: '1',
    apk_url: '',
  })

  const load = useCallback(async () => {
    try {
      setLoading(true)
      setError('')
      const res = await api.get<ApiResponse<PaginatedResponse<AppRelease>>>('/admin/releases')
      setReleases(res.data.data?.data || [])
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load releases')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  async function handleCreate() {
    try {
      await api.post('/admin/releases', {
        version_code: parseInt(form.version_code),
        version_name: form.version_name,
        release_type: form.release_type,
        title: form.title,
        release_notes: form.release_notes,
        min_required_version: parseInt(form.min_required_version) || 1,
        apk_url: form.apk_url,
      })
      setShowCreate(false)
      setForm({ version_code: '', version_name: '', release_type: 'normal', title: '', release_notes: '', min_required_version: '1', apk_url: '' })
      load()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create release')
    }
  }

  async function handleSubmit(id: string) {
    try { await api.post(`/admin/releases/${id}/submit`); load() } catch (err: unknown) { setError(err instanceof Error ? err.message : 'Failed') }
  }

  async function handleApprove(id: string) {
    try { await api.post(`/admin/releases/${id}/approve`); load() } catch (err: unknown) { setError(err instanceof Error ? err.message : 'Failed') }
  }

  async function handleReject(id: string) {
    const reason = prompt('Rejection reason:')
    if (reason === null) return
    try { await api.post(`/admin/releases/${id}/reject`, { reason }); load() } catch (err: unknown) { setError(err instanceof Error ? err.message : 'Failed') }
  }

  async function handlePublish(id: string) {
    if (!confirm('Publish this release? This will make it the active version for all users.')) return
    try { await api.post(`/admin/releases/${id}/release`); load() } catch (err: unknown) { setError(err instanceof Error ? err.message : 'Failed') }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this release?')) return
    try { await api.delete(`/admin/releases/${id}`); load() } catch (err: unknown) { setError(err instanceof Error ? err.message : 'Failed') }
  }

  function formatBytes(bytes: number) {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
  }

  if (loading) return <PageTransition><PageSkeleton /></PageTransition>

  return (
    <PageTransition>
      <motion.div initial="hidden" animate="visible" variants={staggerContainer} className="space-y-6">
        {/* Hero header */}
        <motion.div variants={fadeInUp}>
          <div className="relative overflow-hidden rounded-2xl border border-white/[0.06] bg-white/[0.02] p-8">
            <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-orange-600/10 blur-[80px]" />
            <div className="pointer-events-none absolute -left-8 bottom-0 h-32 w-32 rounded-full bg-red-600/10 blur-[60px]" />
            <div className="relative flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-orange-500 to-red-600 shadow-lg shadow-orange-500/25">
                  <AppWindow className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h1 className="text-3xl font-extrabold tracking-tight text-white lg:text-4xl">
                    <span className="bg-gradient-to-r from-orange-400 to-red-400 bg-clip-text text-transparent">App Releases</span>
                  </h1>
                  <p className="mt-1 text-sm text-gray-400">Manage Android app versions and force updates</p>
                </div>
              </div>
              <Button onClick={() => setShowCreate(true)} icon={<Rocket className="h-4 w-4" />}>
                New Release
              </Button>
            </div>
          </div>
        </motion.div>

        {error && (
          <motion.div variants={itemVariants} className="rounded-2xl border border-red-500/20 bg-red-500/5 p-3 text-sm text-red-400">
            {error}
            <button onClick={() => setError('')} className="ml-2 font-medium underline">Dismiss</button>
          </motion.div>
        )}

        {releases.length === 0 ? (
          <EmptyState
            title="No releases yet"
            description="Create your first app release to start distributing updates."
            action={<Button onClick={() => setShowCreate(true)} icon={<Rocket className="h-4 w-4" />}>Create Release</Button>}
          />
        ) : (
          <div className="space-y-4">
            {releases.map((release) => (
              <motion.div key={release.id} variants={itemVariants}>
                <Card>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <h3 className="text-lg font-bold text-white">{release.title || `v${release.version_name}`}</h3>
                        <Badge variant={statusConfig[release.status]?.variant || 'default'} dot size="sm">
                          {statusConfig[release.status]?.label || release.status}
                        </Badge>
                        <Badge variant={release.release_type === 'force' ? 'danger' : 'default'} size="sm">
                          {release.release_type === 'force' ? 'Force Update' : 'Normal'}
                        </Badge>
                      </div>
                      <div className="mt-2 flex items-center gap-4 text-xs text-gray-400">
                        <span>v{release.version_name} (code: {release.version_code})</span>
                        <span>Min: v{release.min_required_version}</span>
                        {release.apk_size_bytes > 0 && <span>{formatBytes(release.apk_size_bytes)}</span>}
                        <span>By: {release.submitted_by_name}</span>
                        <span>{new Date(release.created_at).toLocaleDateString()}</span>
                      </div>
                      {release.release_notes && (
                        <p className="mt-2 text-sm text-gray-400 whitespace-pre-wrap">{release.release_notes}</p>
                      )}
                      {release.rejection_reason && (
                        <p className="mt-2 text-sm text-red-400">Rejected: {release.rejection_reason}</p>
                      )}
                      {release.released_at && (
                        <p className="mt-1 text-xs text-green-400">Released: {new Date(release.released_at).toLocaleString()}</p>
                      )}
                    </div>
                    <div className="flex gap-2">
                      {release.status === 'draft' && (
                        <>
                          <Button size="xs" variant="ghost" onClick={() => { setUploadReleaseId(release.id); setShowUpload(true) }} icon={<Upload className="h-3 w-3" />}>Upload APK</Button>
                          <Button size="xs" onClick={() => handleSubmit(release.id)} icon={<Send className="h-3 w-3" />}>Submit</Button>
                          <Button size="xs" variant="ghost" className="text-red-400" onClick={() => handleDelete(release.id)} icon={<Trash2 className="h-3 w-3" />}>Delete</Button>
                        </>
                      )}
                      {release.status === 'pending_approval' && (
                        <>
                          <Button size="xs" onClick={() => handleApprove(release.id)} icon={<CheckCircle className="h-3 w-3" />}>Approve</Button>
                          <Button size="xs" variant="ghost" className="text-red-400" onClick={() => handleReject(release.id)} icon={<XCircle className="h-3 w-3" />}>Reject</Button>
                        </>
                      )}
                      {release.status === 'approved' && (
                        <Button size="xs" onClick={() => handlePublish(release.id)} icon={<Rocket className="h-3 w-3" />}>Publish</Button>
                      )}
                    </div>
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>
        )}

        {/* Create Release Modal */}
        <Modal open={showCreate} onClose={() => setShowCreate(false)} title="New App Release"
          footer={<><Button variant="ghost" size="sm" onClick={() => setShowCreate(false)}>Cancel</Button><Button size="sm" onClick={handleCreate}>Create</Button></>}>
          <div className="space-y-4">
            <Input label="Version Code" type="number" value={form.version_code} onChange={(e) => setForm({ ...form, version_code: e.target.value })} placeholder="1" required />
            <Input label="Version Name" value={form.version_name} onChange={(e) => setForm({ ...form, version_name: e.target.value })} placeholder="1.0.0" required />
            <Input label="Min Required Version" type="number" value={form.min_required_version} onChange={(e) => setForm({ ...form, min_required_version: e.target.value })} placeholder="1" />
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-300">Release Type</label>
              <select value={form.release_type} onChange={(e) => setForm({ ...form, release_type: e.target.value })} className="w-full rounded-xl border border-white/[0.08] bg-white/[0.05] px-3 py-2.5 text-sm text-gray-300">
                <option value="normal">Normal Update</option>
                <option value="force">Force Update</option>
              </select>
            </div>
            <Input label="Title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Version 1.1.0" />
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-300">Release Notes</label>
              <textarea value={form.release_notes} onChange={(e) => setForm({ ...form, release_notes: e.target.value })} rows={4} className="w-full rounded-xl border border-white/[0.08] bg-white/[0.05] px-3 py-2.5 text-sm text-gray-300 placeholder-gray-500 focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-500/10" placeholder="What's new in this release..." />
            </div>
            <Input label="APK Download URL (optional)" value={form.apk_url} onChange={(e) => setForm({ ...form, apk_url: e.target.value })} placeholder="https://example.com/app-v1.0.0.apk" />
          </div>
        </Modal>

        {/* Upload APK Modal */}
        <Modal open={showUpload} onClose={() => setShowUpload(false)} title="Upload APK">
          <APKUpload releaseId={uploadReleaseId} onDone={() => { setShowUpload(false); load() }} />
        </Modal>
      </motion.div>
    </PageTransition>
  )
}

function APKUpload({ releaseId, onDone }: { releaseId: string; onDone: () => void }) {
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')

  async function handleUpload(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = e.currentTarget
    const fileInput = form.elements.namedItem('apk') as HTMLInputElement
    const file = fileInput.files?.[0]
    if (!file) return

    setUploading(true)
    setError('')
    try {
      const formData = new FormData()
      formData.append('apk', file)

      const res = await api.post(`/admin/releases/${releaseId}/upload`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })

      if (res.data.success) {
        onDone()
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  return (
    <form onSubmit={handleUpload} className="space-y-4">
      <input type="file" name="apk" accept=".apk" required className="block w-full text-sm text-gray-300 file:mr-4 file:rounded-xl file:border-0 file:bg-blue-500/20 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-blue-400 hover:file:bg-blue-500/30" />
      {error && <p className="text-sm text-red-400">{error}</p>}
      <Button type="submit" loading={uploading}>Upload APK</Button>
    </form>
  )
}
