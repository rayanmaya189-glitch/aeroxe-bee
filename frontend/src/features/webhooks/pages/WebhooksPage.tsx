import { useState, useEffect } from 'react'
import { getWebhooks, createWebhook, deleteWebhook, rotateWebhookSecret } from '@/services/dashboard'
import type { Webhook } from '@/types/models'

export function WebhooksPage() {
  const [webhooks, setWebhooks] = useState<Webhook[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [newUrl, setNewUrl] = useState('')
  const [newEvents, setNewEvents] = useState('message.delivered')

  useEffect(() => { load() }, [])

  async function load() {
    try {
      setLoading(true)
      setWebhooks(await getWebhooks())
    } catch (err: unknown) { setError(err instanceof Error ? err.message : 'Failed') }
    finally { setLoading(false) }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    try {
      await createWebhook({ url: newUrl, events: newEvents.split(',').map((s) => s.trim()) })
      setShowCreate(false); setNewUrl(''); setNewEvents('message.delivered'); load()
    } catch (err: unknown) { setError(err instanceof Error ? err.message : 'Failed') }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete webhook?')) return
    try { await deleteWebhook(id); load() } catch { setError('Failed') }
  }

  async function handleRotate(id: string) {
    try { await rotateWebhookSecret(id); load() } catch { setError('Failed') }
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Webhooks</h1>
        <button onClick={() => setShowCreate(true)} className="rounded-lg bg-primary-600 px-4 py-2 text-sm text-white hover:bg-primary-700">Add Webhook</button>
      </div>

      {error && <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600 dark:bg-red-900/20">{error}</div>}

      <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50 text-xs uppercase text-gray-500 dark:bg-gray-800 dark:text-gray-400">
            <tr>
              <th className="px-4 py-3">URL</th>
              <th className="px-4 py-3">Events</th>
              <th className="px-4 py-3">Active</th>
              <th className="px-4 py-3">Created</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {loading ? <tr><td colSpan={5} className="px-4 py-8 text-center">Loading...</td></tr> :
              webhooks.length === 0 ? <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-500">No webhooks</td></tr> :
              webhooks.map((wh) => (
                <tr key={wh.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                  <td className="px-4 py-3 font-mono text-xs text-gray-900 dark:text-white break-all">{wh.url}</td>
                  <td className="px-4 py-3">{wh.events.map((e) => <span key={e} className="mr-1 inline-block rounded-full bg-gray-100 px-2 py-0.5 text-xs dark:bg-gray-700">{e}</span>)}</td>
                  <td className="px-4 py-3">{wh.active ? <span className="text-green-600">✓</span> : <span className="text-red-600">✗</span>}</td>
                  <td className="px-4 py-3 text-gray-500">{new Date(wh.created_at).toLocaleDateString()}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      <button onClick={() => handleRotate(wh.id)} className="rounded p-1 text-yellow-600 hover:bg-yellow-50 dark:text-yellow-400">Rotate Key</button>
                      <button onClick={() => handleDelete(wh.id)} className="rounded p-1 text-red-600 hover:bg-red-50 dark:text-red-400">Delete</button>
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
            <h2 className="mb-4 text-lg font-bold">Create Webhook</h2>
            <form onSubmit={handleCreate} className="space-y-4">
              <input type="url" placeholder="Webhook URL" value={newUrl} onChange={(e) => setNewUrl(e.target.value)} required
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white" />
              <input type="text" placeholder="Events (comma separated)" value={newEvents} onChange={(e) => setNewEvents(e.target.value)} required
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
