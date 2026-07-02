import { useState, useEffect, useCallback } from 'react'
import api from '@/services/api'
import type { ApiResponse } from '@/types/api'

interface Webhook {
  id: string
  account_id: string
  url: string
  events: string[]
  active: boolean
  last_rotated_at: string | null
  created_at: string
}

export function MemberWebhooksPage() {
  const [webhooks, setWebhooks] = useState<Webhook[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [editing, setEditing] = useState<Webhook | null>(null)
  const [url, setUrl] = useState('')
  const [events, setEvents] = useState('message.delivered')
  const [active, setActive] = useState(true)
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    try {
      setLoading(true)
      setError('')
      const res = await api.get<ApiResponse<Webhook[]>>('/member/webhooks')
      if (res.data.success && res.data.data) {
        setWebhooks(res.data.data)
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load webhooks')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      const res = await api.post<ApiResponse<Webhook>>('/member/webhooks', {
        url,
        events: events.split(',').map((s) => s.trim()).filter(Boolean),
      })
      if (res.data.success) {
        setShowCreate(false)
        setUrl('')
        setEvents('message.delivered')
        load()
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create webhook')
    } finally {
      setSaving(false)
    }
  }

  async function handleUpdate(e: React.FormEvent) {
    e.preventDefault()
    if (!editing) return
    setSaving(true)
    setError('')
    try {
      const res = await api.put(`/member/webhooks/${editing.id}`, {
        url,
        events: events.split(',').map((s) => s.trim()).filter(Boolean),
        active,
      })
      if (res.data.success) {
        setEditing(null)
        setUrl('')
        setEvents('message.delivered')
        setActive(true)
        load()
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to update webhook')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this webhook?')) return
    try {
      await api.delete(`/member/webhooks/${id}`)
      load()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to delete webhook')
    }
  }

  async function handleRotateSecret(id: string) {
    if (!confirm('Rotate webhook secret? Existing integrations using the old secret will stop working.')) return
    try {
      const res = await api.post<ApiResponse<{ secret: string }>>(`/member/webhooks/${id}/rotate-secret`)
      if (res.data.success && res.data.data) {
        alert(`New secret: ${res.data.data.secret}\n\nCopy this now. You won't see it again.`)
        load()
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to rotate secret')
    }
  }

  function openEdit(wh: Webhook) {
    setEditing(wh)
    setUrl(wh.url)
    setEvents(wh.events.join(', '))
    setActive(wh.active)
  }

  function closeForm() {
    setShowCreate(false)
    setEditing(null)
    setUrl('')
    setEvents('message.delivered')
    setActive(true)
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">My Webhooks</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Receive real-time delivery notifications via HTTP callbacks
          </p>
        </div>
        <button
          onClick={() => { closeForm(); setShowCreate(true) }}
          className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700"
        >
          Add Webhook
        </button>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center p-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-600 border-t-transparent" />
        </div>
      ) : webhooks.length === 0 ? (
        <div className="rounded-2xl border border-gray-200 p-12 text-center dark:border-gray-700">
          <p className="text-gray-500 dark:text-gray-400">
            No webhooks configured. Add a webhook URL to receive delivery event callbacks.
          </p>
        </div>
      ) : (
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
              {webhooks.map((wh) => (
                <tr key={wh.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                  <td className="max-w-[200px] truncate px-4 py-3 font-mono text-xs text-gray-900 dark:text-white">
                    {wh.url}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {wh.events.map((evt) => (
                        <span
                          key={evt}
                          className="inline-block rounded-full bg-gray-100 px-2 py-0.5 text-xs dark:bg-gray-700 dark:text-gray-300"
                        >
                          {evt}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {wh.active ? (
                      <span className="text-green-600 dark:text-green-400">✓</span>
                    ) : (
                      <span className="text-red-600 dark:text-red-400">✗</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-500 dark:text-gray-400">
                    {new Date(wh.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button
                        onClick={() => openEdit(wh)}
                        className="rounded px-2 py-1 text-xs font-medium text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-900/20"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleRotateSecret(wh.id)}
                        className="rounded px-2 py-1 text-xs font-medium text-yellow-600 hover:bg-yellow-50 dark:text-yellow-400 dark:hover:bg-yellow-900/20"
                      >
                        Rotate Key
                      </button>
                      <button
                        onClick={() => handleDelete(wh.id)}
                        className="rounded px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create/Edit Modal */}
      {(showCreate || editing) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={closeForm}>
          <div
            className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl dark:bg-gray-800"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="mb-4 text-lg font-bold text-gray-900 dark:text-white">
              {editing ? 'Edit Webhook' : 'Create Webhook'}
            </h2>
            <form onSubmit={editing ? handleUpdate : handleCreate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Webhook URL</label>
                <input
                  type="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  required
                  placeholder="https://example.com/webhook"
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Events (comma separated)
                </label>
                <input
                  type="text"
                  value={events}
                  onChange={(e) => setEvents(e.target.value)}
                  required
                  placeholder="message.delivered, message.failed"
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                />
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  Available events: message.delivered, message.failed, message.sent
                </p>
              </div>
              {editing && (
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="active"
                    checked={active}
                    onChange={(e) => setActive(e.target.checked)}
                    className="rounded border-gray-300 dark:border-gray-600"
                  />
                  <label htmlFor="active" className="text-sm text-gray-700 dark:text-gray-300">
                    Active
                  </label>
                </div>
              )}
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={closeForm}
                  className="rounded-lg border border-gray-300 px-4 py-2 text-sm hover:bg-gray-50 dark:border-gray-600 dark:hover:bg-gray-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-lg bg-primary-600 px-4 py-2 text-sm text-white hover:bg-primary-700 disabled:opacity-50"
                >
                  {saving ? 'Saving...' : editing ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
