import { useState, useEffect } from 'react'
import { getTemplates, createTemplate, deleteTemplate, approveTemplate, rejectTemplate } from '@/services/dashboard'
import type { Template } from '@/types/models'

export function TemplatesPage() {
  const [templates, setTemplates] = useState<Template[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [name, setName] = useState('')
  const [body, setBody] = useState('')

  useEffect(() => { load() }, [])

  async function load() {
    try { setLoading(true); setTemplates(await getTemplates()) }
    catch (err: unknown) { setError(err instanceof Error ? err.message : 'Failed') }
    finally { setLoading(false) }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    try { await createTemplate({ name, body, variables: [] }); setShowCreate(false); setName(''); setBody(''); load() }
    catch (err: unknown) { setError(err instanceof Error ? err.message : 'Failed') }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete template?')) return
    try { await deleteTemplate(id); load() } catch { setError('Failed') }
  }

  async function handleApprove(id: string) {
    try { await approveTemplate(id); load() } catch { setError('Failed') }
  }

  async function handleReject(id: string) {
    try { await rejectTemplate(id); load() } catch { setError('Failed') }
  }

  const statusColor = (s: string) => s === 'approved' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
    s === 'rejected' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
    'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Templates</h1>
        <button onClick={() => setShowCreate(true)} className="rounded-lg bg-primary-600 px-4 py-2 text-sm text-white hover:bg-primary-700">Add Template</button>
      </div>
      {error && <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600 dark:bg-red-900/20">{error}</div>}
      <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50 text-xs uppercase text-gray-500 dark:bg-gray-800 dark:text-gray-400">
            <tr><th className="px-4 py-3">Name</th><th className="px-4 py-3">Body</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Created</th><th className="px-4 py-3">Actions</th></tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {loading ? <tr><td colSpan={5} className="px-4 py-8 text-center">Loading...</td></tr> :
              templates.length === 0 ? <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-500">No templates</td></tr> :
              templates.map((t) => (
                <tr key={t.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                  <td className="px-4 py-3 font-medium">{t.name}</td>
                  <td className="px-4 py-3 text-xs text-gray-600 dark:text-gray-400 max-w-xs truncate">{t.body}</td>
                  <td className="px-4 py-3"><span className={`rounded-full px-2 py-1 text-xs font-medium ${statusColor(t.approval_status)}`}>{t.approval_status}</span></td>
                  <td className="px-4 py-3 text-gray-500">{new Date(t.created_at).toLocaleDateString()}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      {t.approval_status === 'pending' && <>
                        <button onClick={() => handleApprove(t.id)} className="rounded p-1 text-green-600 hover:bg-green-50">Approve</button>
                        <button onClick={() => handleReject(t.id)} className="rounded p-1 text-red-600 hover:bg-red-50">Reject</button>
                      </>}
                      <button onClick={() => handleDelete(t.id)} className="rounded p-1 text-red-600 hover:bg-red-50">Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setShowCreate(false)}>
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl dark:bg-gray-800" onClick={(e) => e.stopPropagation()}>
            <h2 className="mb-4 text-lg font-bold">Create Template</h2>
            <form onSubmit={handleCreate} className="space-y-4">
              <input type="text" placeholder="Template name" value={name} onChange={(e) => setName(e.target.value)} required
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white" />
              <textarea placeholder="Template body" value={body} onChange={(e) => setBody(e.target.value)} required rows={4}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white" />
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setShowCreate(false)} className="rounded-lg border px-4 py-2 text-sm">Cancel</button>
                <button type="submit" className="rounded-lg bg-primary-600 px-4 py-2 text-sm text-white">Create</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
