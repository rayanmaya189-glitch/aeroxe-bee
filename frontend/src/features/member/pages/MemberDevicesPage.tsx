import { useState } from 'react'
import { motion } from 'framer-motion'
import { PageTransition } from '@/components/ui/PageTransition'
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
import { Pencil, Unplug } from 'lucide-react'

const containerVariants = { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.06 } } }
const itemVariants = { hidden: { opacity: 0, y: 12 }, visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] } } }

export function MemberDevicesPage() {
  const queryClient = useQueryClient()
  const [renameTarget, setRenameTarget] = useState<Device | null>(null)
  const [renameName, setRenameName] = useState('')
  const [disconnectTarget, setDisconnectTarget] = useState<Device | null>(null)

  const { data: devices = [], isLoading, error } = useQuery({
    queryKey: ['member-devices'],
    queryFn: async () => { const res = await api.get<ApiResponse<Device[]>>('/member/devices'); return res.data.data || [] },
  })

  const renameMutation = useMutation({
    mutationFn: async () => { if (!renameTarget) return; await api.put(`/member/devices/${renameTarget.id}`, { name: renameName }) },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['member-devices'] }); setRenameTarget(null); setRenameName('') },
  })

  const disconnectMutation = useMutation({
    mutationFn: async () => { if (!disconnectTarget) return; await api.delete(`/member/devices/${disconnectTarget.id}`) },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['member-devices'] }); setDisconnectTarget(null) },
  })

  const onlineCount = devices.filter((d) => d.status === 'ONLINE').length
  if (isLoading) return <PageTransition><PageSkeleton /></PageTransition>
  if (error) return <PageTransition><div className="rounded-lg border border-red-500/20 bg-red-500/5 p-4 text-sm text-red-400">Failed to load devices</div></PageTransition>
  if (devices.length === 0) return <PageTransition><div className="space-y-6"><h1 className="text-2xl font-bold tracking-tight text-gray-100">Devices</h1><EmptyState title="No devices registered" description="Download the Android app to register your first device." /></div></PageTransition>

  return (
    <PageTransition>
    <motion.div initial="hidden" animate="visible" variants={containerVariants} className="space-y-6">
      <motion.div variants={itemVariants}>
        <h1 className="text-2xl font-bold tracking-tight text-gray-100">Devices</h1>
        <p className="mt-1 text-sm text-gray-400">{devices.length} devices · {onlineCount} online</p>
      </motion.div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {devices.map((device) => (
          <motion.div key={device.id} variants={itemVariants}>
            <Card hover>
              <div className="flex items-start justify-between">
                <div className="min-w-0 flex-1">
                  <h3 className="truncate text-sm font-semibold text-gray-100">{device.physical_device_id}</h3>
                  <p className="text-xs text-gray-400">{device.carrier || 'Unknown carrier'}</p>
                </div>
                <Badge variant={device.status === 'ONLINE' ? 'success' : 'default'} dot size="sm">{device.status.toLowerCase()}</Badge>
              </div>
              <div className="mt-4 space-y-2 text-xs">
                {[['SIM slot', device.sim_slot], ['Reliability', `${(device.reliability_score * 100).toFixed(0)}%`], ['24h success', `${(device.success_rate_24h * 100).toFixed(0)}%`], ['Last seen', device.last_seen ? new Date(device.last_seen).toLocaleDateString() : 'Never']].map(([l, v]) => (
                  <div key={l} className="flex justify-between text-gray-400"><span>{l}</span><span className="font-medium text-gray-300">{v}</span></div>
                ))}
              </div>
              <div className="mt-4 flex gap-2 border-t border-white/[0.06] pt-4">
                <Button variant="ghost" size="xs" icon={<Pencil className="h-3 w-3" />} onClick={() => { setRenameTarget(device); setRenameName(device.physical_device_id) }}>Rename</Button>
                <Button variant="ghost" size="xs" icon={<Unplug className="h-3 w-3" />} className="text-red-400" onClick={() => setDisconnectTarget(device)}>Disconnect</Button>
              </div>
            </Card>
          </motion.div>
        ))}
      </div>

      <Modal open={!!renameTarget} onClose={() => { setRenameTarget(null); setRenameName('') }} title="Rename device"
        footer={<><Button variant="ghost" size="sm" onClick={() => { setRenameTarget(null); setRenameName('') }} disabled={renameMutation.isPending}>Cancel</Button><Button size="sm" onClick={() => renameMutation.mutate()} loading={renameMutation.isPending}>Save</Button></>}>
        <Input label="Device name" value={renameName} onChange={(e) => setRenameName(e.target.value)} required />
      </Modal>

      <ConfirmDialog open={!!disconnectTarget} onClose={() => setDisconnectTarget(null)} onConfirm={() => disconnectMutation.mutate()}
        title="Disconnect device" description={`Are you sure you want to disconnect ${disconnectTarget?.physical_device_id}?`} confirmLabel="Disconnect" loading={disconnectMutation.isPending} />
    </motion.div>
    </PageTransition>
  )
}
