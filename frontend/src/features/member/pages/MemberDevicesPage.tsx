import { useState, useEffect } from 'react'
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

  useEffect(() => {
    api.get<ApiResponse<Device[]>>('/member/devices')
      .then((res) => {
        if (res.data.success && res.data.data) setDevices(res.data.data)
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="flex items-center justify-center p-12"><div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-600 border-t-transparent" /></div>
  if (error) return <div className="p-6"><div className="rounded-lg bg-red-50 p-4 text-red-600 dark:bg-red-900/20 dark:text-red-400">{error}</div></div>

  const onlineCount = devices.filter(d => d.status === 'online').length

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">My Devices</h1>
        <p className="text-sm text-gray-600 dark:text-gray-400">{devices.length} devices • {onlineCount} online</p>
      </div>

      {devices.length === 0 ? (
        <div className="rounded-2xl border border-gray-200 p-12 text-center dark:border-gray-700">
          <p className="text-gray-500 dark:text-gray-400">No devices registered yet. Download the Android app to get started.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {devices.map((device) => (
            <div key={device.id} className="rounded-2xl border border-gray-200 p-5 shadow-sm transition hover:shadow-md dark:border-gray-700">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white">{device.name}</h3>
                  <p className="text-sm text-gray-500">{device.model}</p>
                </div>
                <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
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
                  <span>{device.os_version}</span>
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
                  <span>{new Date(device.last_seen).toLocaleString()}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
