import { useState, useEffect, useCallback } from 'react'
import api from '@/services/api'
import type { ApiResponse } from '@/types/api'

interface Device {
  id: string
  name: string
  model: string
  os_version: string
  status: string
  last_seen: string
  sim_slot: number
  carrier: string
  signal_strength: number
}

export function MemberDevicesPage() {
  const [devices, setDevices] = useState<Device[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // Rename state
  const [renameTarget, setRenameTarget] = useState<Device | null>(null)
  const [renameName, setRenameName] = useState('')
  const [savingRename, setSavingRename] = useState(false)

  // Disconnect confirmation
  const [disconnectTarget, setDisconnectTarget] = useState<Device | null>(null)
  const [savingDisconnect, setSavingDisconnect] = useState(false)

  const load = useCallback(async () => {
    try {
      setLoading(true)
      setError('')
      const res = await api.get<ApiResponse<Device[]>>('/member/devices')
      if (res.data.success && res.data.data) setDevices(res.data.data)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load devices')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  async function handleRename(e: React.FormEvent) {
    e.preventDefault()
    if (!renameTarget) return
    setSavingRename(true)
    setError('')
    try {
      const res = await api.put<ApiResponse<Device>>(`/member/devices/${renameTarget.id}`, { name: renameName })
      if (res.data.success) {
        setRenameTarget(null)
        setRenameName('')
        load()
      } else {
        setError(res.data.error || 'Failed to rename device')
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to rename device')
    } finally {
      setSavingRename(false)
    }
  }

  async function handleDisconnect() {
    if (!disconnectTarget) return
    setSavingDisconnect(true)
    setError('')
    try {
      const res = await api.delete(`/member/devices/${disconnectTarget.id}`)
      if (res.data.success) {
        setDisconnectTarget(null)
        load()
      } else {
        setError(res.data.error || 'Failed to disconnect device')
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to disconnect device')
    } finally {
      setSavingDisconnect(false)
    }
  }

  function openRename(device: Device) {
    setRenameTarget(device)
    setRenameName(device.name)
  }

  if (loading) return <div className="flex items-center justify-center p-12"><div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-600 border-t-transparent" /></div>

  const onlineCount = devices.filter(d => d.status === 'online').length

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">My Devices</h1>
        <p className="text-sm text-gray-600 dark:text-gray-400">{devices.length} devices &bull; {onlineCount} online</p>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">
          {error}
        </div>
      )}

      {devices.length === 0 ? (
        <div className="rounded-2xl border border-gray-200 p-12 text-center dark:border-gray-700">
          <p className="text-gray-500 dark:text-gray-400">No devices registered yet. Download the Android app to get started.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {devices.map((device) => (
            <div key={device.id} className="group relative rounded-2xl border border-gray-200 p-5 shadow-sm transition hover:shadow-md dark:border-gray-700">
              <div className="flex items-start justify-between">
                <div className="min-w-0 flex-1">
                  <h3 className="truncate font-semibold text-gray-900 dark:text-white">{device.name}</h3>
                  <p className="text-sm text-gray-500">{device.model || 'Unknown model'}</p>
                </div>
                <span className={`ml-2 inline-flex shrink-0 items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                  device.status === 'online'
                    ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                    : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
                }`}>
                  {device.status}
                </span>
              </div>
              <div className="mt-4 space-y-2 text-sm text-gray-600 dark:text-gray-400">
                <div className="flex justify-between">
                  <span>OS Version</span>
                  <span>{device.os_version || 'Unknown'}</span>
                </div>
                <div className="flex justify-between">
                  <span>SIM Slot</span>
                  <span>{device.sim_slot}</span>
                </div>
                <div className="flex justify-between">
                  <span>Carrier</span>
                  <span>{device.carrier || 'Unknown'}</span>
                </div>
                <div className="flex justify-between">
                  <span>Signal</span>
                  <span>{device.signal_strength}%</span>
                </div>
                <div className="flex justify-between">
                  <span>Last Seen</span>
                  <span className="text-xs">{new Date(device.last_seen).toLocaleString()}</span>
                </div>
              </div>
              <div className="mt-4 flex gap-2 opacity-60 transition-opacity hover:opacity-100 group-hover:opacity-100">
                <button
                  onClick={() => openRename(device)}
                  className="flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-medium text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-900/20"
                >
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                  </svg>
                  Rename
                </button>
                <button
                  onClick={() => setDisconnectTarget(device)}
                  className="flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
                >
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M22 10.5l-10-5.25L2 10.5 M22 10.5v6.75M22 10.5l-10 5.25M2 10.5v6.75M2 10.5l10 5.25M2 17.25l10 5.25 10-5.25" />
                  </svg>
                  Disconnect
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Rename Modal */}
      {renameTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => { setRenameTarget(null); setRenameName('') }}>
          <div
            className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl dark:bg-gray-800"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="mb-4 text-lg font-bold text-gray-900 dark:text-white">Rename Device</h2>
            <form onSubmit={handleRename} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Device Name</label>
                <input
                  type="text"
                  value={renameName}
                  onChange={(e) => setRenameName(e.target.value)}
                  required
                  placeholder="Enter a name for this device"
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                />
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => { setRenameTarget(null); setRenameName('') }}
                  className="rounded-lg border border-gray-300 px-4 py-2 text-sm hover:bg-gray-50 dark:border-gray-600 dark:hover:bg-gray-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingRename}
                  className="rounded-lg bg-primary-600 px-4 py-2 text-sm text-white hover:bg-primary-700 disabled:opacity-50"
                >
                  {savingRename ? 'Saving...' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Disconnect Confirmation Modal */}
      {disconnectTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setDisconnectTarget(null)}>
          <div
            className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl dark:bg-gray-800"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
                <svg className="h-5 w-5 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                </svg>
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-900 dark:text-white">Disconnect Device</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">This action cannot be undone</p>
              </div>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Are you sure you want to disconnect <strong className="text-gray-900 dark:text-white">{disconnectTarget.name}</strong>?
              This device will no longer be able to send SMS messages through your account.
            </p>
            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setDisconnectTarget(null)}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm hover:bg-gray-50 dark:border-gray-600 dark:hover:bg-gray-700"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDisconnect}
                disabled={savingDisconnect}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm text-white hover:bg-red-700 disabled:opacity-50"
              >
                {savingDisconnect ? 'Disconnecting...' : 'Yes, Disconnect'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
