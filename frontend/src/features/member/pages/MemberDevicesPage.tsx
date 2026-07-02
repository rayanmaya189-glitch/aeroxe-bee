import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/services/api'
import type { ApiResponse } from '@/types/api'
import type { Device } from '@/types/models'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { EmptyState } from '@/components/ui/EmptyState'
import { PageSkeleton } from '@/components/ui/Skeleton'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'

export function MemberDevicesPage() {
  const queryClient = useQueryClient()
  const [renameTarget, setRenameTarget] = useState<Device | null>(null)
  const [renameName, setRenameName] = useState('')
  const [disconnectTarget, setDisconnectTarget] = useState<Device | null>(null)

  const { data: devices = [], isLoading, error } = useQuery({
    queryKey: ['member-devices'],
    queryFn: async () => {
      const res = await api.get<ApiResponse<Device[]>>('/member/devices')
      return res.data.data || []
    },
  })

  const renameMutation = useMutation({
    mutationFn: async () => {
      if (!renameTarget) return
      await api.put(`/member/devices/${renameTarget.id}`, { name: renameName })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['member-devices'] })
      setRenameTarget(null)
      setRenameName('')
    },
  })

  const disconnectMutation = useMutation({
    mutationFn: async () => {
      if (!disconnectTarget) return
      await api.delete(`/member/devices/${disconnectTarget.id}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['member-devices'] })
      setDisconnectTarget(null)
    },
  })

  const onlineCount = devices.filter((d) => d.status === 'ONLINE').length

  if (isLoading) return <PageSkeleton />

  if (error) {
    return (
      <div className="rounded-lg border border-danger-200 bg-danger-50 p-4 text-sm text-danger-700 dark:border-danger-800/50 dark:bg-danger-900/20 dark:text-danger-300">
        Failed to load devices
      </div>
    )
  }

  if (devices.length === 0) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-100">Devices</h1>
        <EmptyState
          title="No devices registered"
          description="Download the Android app to register your first device."
        />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-100">Devices</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          {devices.length} devices · {onlineCount} online
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {devices.map((device) => (
          <Card key={device.id} hover>
            <div className="flex items-start justify-between">
              <div className="min-w-0 flex-1">
                <h3 className="truncate text-sm font-semibold text-gray-900 dark:text-gray-100">
                  {device.physical_device_id}
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">{device.carrier || 'Unknown carrier'}</p>
              </div>
              <Badge
                variant={device.status === 'ONLINE' ? 'success' : 'default'}
                dot
                size="sm"
              >
                {device.status.toLowerCase()}
              </Badge>
            </div>

            <div className="mt-4 space-y-2 text-xs">
              <div className="flex justify-between text-gray-500 dark:text-gray-400">
                <span>SIM slot</span>
                <span className="font-medium text-gray-700 dark:text-gray-300">{device.sim_slot}</span>
              </div>
              <div className="flex justify-between text-gray-500 dark:text-gray-400">
                <span>Reliability</span>
                <span className="font-medium text-gray-700 dark:text-gray-300">{(device.reliability_score * 100).toFixed(0)}%</span>
              </div>
              <div className="flex justify-between text-gray-500 dark:text-gray-400">
                <span>24h success</span>
                <span className="font-medium text-gray-700 dark:text-gray-300">{(device.success_rate_24h * 100).toFixed(0)}%</span>
              </div>
              <div className="flex justify-between text-gray-500 dark:text-gray-400">
                <span>Last seen</span>
                <span className="font-medium text-gray-700 dark:text-gray-300">
                  {device.last_seen ? new Date(device.last_seen).toLocaleDateString() : 'Never'}
                </span>
              </div>
            </div>

            <div className="mt-4 flex gap-2 border-t border-gray-100 pt-4 dark:border-gray-800">
              <Button variant="ghost" size="xs" onClick={() => { setRenameTarget(device); setRenameName(device.physical_device_id) }}>
                Rename
              </Button>
              <Button variant="ghost" size="xs" className="text-danger-600" onClick={() => setDisconnectTarget(device)}>
                Disconnect
              </Button>
            </div>
          </Card>
        ))}
      </div>

      <Modal
        open={!!renameTarget}
        onClose={() => { setRenameTarget(null); setRenameName('') }}
        title="Rename device"
        footer={
          <>
            <Button variant="ghost" size="sm" onClick={() => { setRenameTarget(null); setRenameName('') }} disabled={renameMutation.isPending}>Cancel</Button>
            <Button size="sm" onClick={() => renameMutation.mutate()} loading={renameMutation.isPending}>Save</Button>
          </>
        }
      >
        <Input
          label="Device name"
          value={renameName}
          onChange={(e) => setRenameName(e.target.value)}
          required
        />
      </Modal>

      <ConfirmDialog
        open={!!disconnectTarget}
        onClose={() => setDisconnectTarget(null)}
        onConfirm={() => disconnectMutation.mutate()}
        title="Disconnect device"
        description={`Are you sure you want to disconnect ${disconnectTarget?.physical_device_id}? This device will no longer be able to send messages.`}
        confirmLabel="Disconnect"
        loading={disconnectMutation.isPending}
      />
    </div>
  )
}
