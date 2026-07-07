import { useState } from 'react'
import { motion } from 'framer-motion'
import { PageTransition } from '@/components/ui/PageTransition'
import { useMutation, useQuery } from '@tanstack/react-query'
import { bulkSendSMS, scheduleSendSMS } from '@/services/dashboard'
import { getOnlineDevices } from '@/services/api'
import type { OnlineDevice } from '@/services/api'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'
import { staggerContainer, fadeInUp } from '@/components/animations/variants'
import { Send, CalendarClock, Users, CheckCircle, AlertCircle, Smartphone } from 'lucide-react'

type SendMode = 'now' | 'schedule'

export function BulkSmsPage() {
  const [mode, setMode] = useState<SendMode>('now')
  const [selectedDeviceId, setSelectedDeviceId] = useState('')
  const [recipients, setRecipients] = useState('')
  const [message, setMessage] = useState('')
  const [scheduledAt, setScheduledAt] = useState('')
  const [messageType, setMessageType] = useState('transactional')
  const [result, setResult] = useState<{ success: boolean; summary: string } | null>(null)

  const { data: devices = [] } = useQuery({
    queryKey: ['member-devices-online'],
    queryFn: getOnlineDevices,
    staleTime: 30_000,
  })

  const bulkMutation = useMutation({
    mutationFn: () => {
      const recipientList = recipients
        .split(/[\n,]+/)
        .map((r) => r.trim())
        .filter(Boolean)
      return bulkSendSMS({
        device_id: selectedDeviceId,
        recipients: recipientList,
        message,
        message_type: messageType,
      })
    },
    onSuccess: (data) => {
      const successCount = data.results.filter((r) => r.status === 'queued').length
      const failCount = data.results.filter((r) => r.status === 'failed').length
      setResult({
        success: failCount === 0,
        summary: `${successCount} sent, ${failCount} failed out of ${data.total} recipients`,
      })
    },
    onError: (err: Error) => {
      setResult({ success: false, summary: err.message })
    },
  })

  const scheduleMutation = useMutation({
    mutationFn: () =>
      scheduleSendSMS({
        device_id: selectedDeviceId,
        recipient: recipients.split(/[\n,]+/).map((r) => r.trim()).filter(Boolean)[0] || '',
        message,
        scheduled_at: new Date(scheduledAt).toISOString(),
        message_type: messageType,
      }),
    onSuccess: (data) => {
      setResult({
        success: true,
        summary: `Message scheduled for ${new Date(data.scheduled_at).toLocaleString()}`,
      })
    },
    onError: (err: Error) => {
      setResult({ success: false, summary: err.message })
    },
  })

  const recipientList = recipients.split(/[\n,]+/).map((r) => r.trim()).filter(Boolean)
  const isLoading = bulkMutation.isPending || scheduleMutation.isPending
  const selectedDevice = devices.find((d) => d.id === selectedDeviceId)

  return (
    <PageTransition>
    <motion.div initial="hidden" animate="visible" variants={staggerContainer} className="space-y-8">
      {/* Hero */}
      <motion.div variants={fadeInUp}>
        <div className="relative overflow-hidden rounded-2xl border border-white/[0.06] bg-white/[0.02] p-8">
          <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-violet-600/10 blur-[80px]" />
          <div className="pointer-events-none absolute -left-8 bottom-0 h-32 w-32 rounded-full bg-fuchsia-600/10 blur-[60px]" />
          <div className="relative flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-fuchsia-600 shadow-lg shadow-violet-500/25">
              <Send className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-extrabold tracking-tight text-white lg:text-4xl">
                <span className="bg-gradient-to-r from-violet-400 to-fuchsia-400 bg-clip-text text-transparent">
                  Bulk SMS
                </span>
              </h1>
              <p className="mt-1 text-sm text-gray-400">
                Send messages to multiple recipients or schedule for later delivery
              </p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Mode toggle */}
      <motion.div variants={fadeInUp} className="flex gap-1 rounded-xl border border-white/[0.06] bg-white/[0.03] p-1 w-fit">
        {[
          { key: 'now' as SendMode, label: 'Send now', icon: <Send className="h-4 w-4" /> },
          { key: 'schedule' as SendMode, label: 'Schedule', icon: <CalendarClock className="h-4 w-4" /> },
        ].map((m) => (
          <button
            key={m.key}
            onClick={() => { setMode(m.key); setResult(null) }}
            className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all duration-200 ${
              mode === m.key
                ? 'bg-gradient-to-r from-white/[0.08] to-white/[0.05] text-gray-100 shadow-sm ring-1 ring-white/[0.06]'
                : 'text-gray-400 hover:text-gray-200 hover:bg-white/[0.04]'
            }`}
          >
            {m.icon}
            {m.label}
          </button>
        ))}
      </motion.div>

      {/* Form */}
      <motion.div variants={fadeInUp} className="space-y-6 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6">
        {/* Device selector */}
        <div>
          <label className="mb-1.5 flex items-center gap-2 text-sm font-medium text-gray-300">
            <Smartphone className="h-4 w-4" />
            Device
          </label>
          {devices.length === 0 ? (
            <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-3 text-sm text-amber-400">
              No online devices available. Make sure your device is connected and online.
            </div>
          ) : (
            <select
              value={selectedDeviceId}
              onChange={(e) => setSelectedDeviceId(e.target.value)}
              className="block w-full rounded-xl border border-white/[0.08] bg-white/[0.05] px-3.5 py-2.5 text-sm text-gray-100 shadow-sm focus:border-violet-500 focus:outline-none focus:ring-4 focus:ring-violet-500/10"
              required
            >
              <option value="">Select a device...</option>
              {devices.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name} {d.phone_number ? `(${d.phone_number})` : ''} · {d.carrier}
                </option>
              ))}
            </select>
          )}
          {selectedDevice && (
            <div className="mt-2 flex items-center gap-2">
              <Badge variant="success" dot size="sm">Online</Badge>
              <span className="text-xs text-gray-500">{selectedDevice.carrier} · SIM {selectedDevice.sim_slot}</span>
            </div>
          )}
        </div>

        {/* Recipients */}
        <div>
          <label className="mb-1.5 flex items-center gap-2 text-sm font-medium text-gray-300">
            <Users className="h-4 w-4" />
            Recipients {mode === 'now' && <span className="text-xs text-gray-500">({recipientList.length} entered)</span>}
          </label>
          <textarea
            value={recipients}
            onChange={(e) => setRecipients(e.target.value)}
            rows={5}
            placeholder="Enter phone numbers, one per line or comma-separated&#10;e.g. +1234567890, +9876543210"
            className="block w-full rounded-xl border border-white/[0.08] bg-white/[0.05] px-3.5 py-2.5 text-sm text-gray-100 shadow-sm focus:border-violet-500 focus:outline-none focus:ring-4 focus:ring-violet-500/10 placeholder:text-gray-500"
          />
          {mode === 'now' && recipientList.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {recipientList.slice(0, 20).map((r, i) => (
                <Badge key={i} variant="default" size="sm">{r}</Badge>
              ))}
              {recipientList.length > 20 && (
                <Badge variant="default" size="sm">+{recipientList.length - 20} more</Badge>
              )}
            </div>
          )}
          {mode === 'schedule' && (
            <p className="mt-1.5 text-xs text-gray-500">Enter a single recipient for scheduled messages</p>
          )}
        </div>

        {/* Message */}
        <div>
          <label className="mb-1.5 flex items-center justify-between text-sm font-medium text-gray-300">
            <span>Message</span>
            <span className={`text-xs ${message.length > 160 ? 'text-red-400' : 'text-gray-500'}`}>
              {message.length}/160
            </span>
          </label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={4}
            maxLength={160}
            placeholder="Type your SMS message here..."
            className="block w-full rounded-xl border border-white/[0.08] bg-white/[0.05] px-3.5 py-2.5 text-sm text-gray-100 shadow-sm focus:border-violet-500 focus:outline-none focus:ring-4 focus:ring-violet-500/10 placeholder:text-gray-500"
          />
        </div>

        {/* Message type */}
        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-300">Message type</label>
          <select
            value={messageType}
            onChange={(e) => setMessageType(e.target.value)}
            className="block w-full rounded-xl border border-white/[0.08] bg-white/[0.05] px-3.5 py-2.5 text-sm text-gray-100 shadow-sm focus:border-violet-500 focus:outline-none focus:ring-4 focus:ring-violet-500/10"
          >
            <option value="transactional">Transactional</option>
            <option value="marketing">Marketing</option>
            <option value="otp">OTP</option>
          </select>
        </div>

        {/* Schedule time */}
        {mode === 'schedule' && (
          <Input
            label="Schedule for"
            type="datetime-local"
            value={scheduledAt}
            onChange={(e) => setScheduledAt(e.target.value)}
          />
        )}

        {/* Submit */}
        <div className="flex items-center gap-4 pt-2">
          <Button
            size="sm"
            icon={mode === 'now' ? <Send className="h-4 w-4" /> : <CalendarClock className="h-4 w-4" />}
            onClick={() => {
              setResult(null)
              if (mode === 'now') bulkMutation.mutate()
              else scheduleMutation.mutate()
            }}
            loading={isLoading}
            disabled={
              !selectedDeviceId || !recipients.trim() || !message.trim() ||
              (mode === 'schedule' && !scheduledAt)
            }
          >
            {mode === 'now' ? `Send to ${recipientList.length} recipient${recipientList.length !== 1 ? 's' : ''}` : 'Schedule message'}
          </Button>
          {selectedDevice && (
            <span className="text-xs text-gray-500">via {selectedDevice.name}</span>
          )}
        </div>
      </motion.div>

      {/* Result */}
      {result && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className={`flex items-start gap-3 rounded-xl border p-4 ${
            result.success
              ? 'border-emerald-500/20 bg-emerald-500/5'
              : 'border-red-500/20 bg-red-500/5'
          }`}
        >
          {result.success
            ? <CheckCircle className="mt-0.5 h-5 w-5 shrink-0 text-emerald-400" />
            : <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-400" />
          }
          <div className="text-sm text-gray-300">{result.summary}</div>
        </motion.div>
      )}
    </motion.div>
    </PageTransition>
  )
}
