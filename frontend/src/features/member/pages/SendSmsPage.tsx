import { useState } from 'react'
import { motion } from 'framer-motion'
import { PageTransition } from '@/components/ui/PageTransition'
import { useMutation, useQuery } from '@tanstack/react-query'
import { sendSMS } from '@/services/dashboard'
import { getOnlineDevices } from '@/services/api'
import type { OnlineDevice } from '@/services/api'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'
import { staggerContainer, fadeInUp } from '@/components/animations/variants'
import { Send, Phone, MessageSquare, CheckCircle, AlertCircle, Smartphone } from 'lucide-react'

export function SendSmsPage() {
  const [recipient, setRecipient] = useState('')
  const [selectedDeviceId, setSelectedDeviceId] = useState('')
  const [message, setMessage] = useState('')
  const [messageType, setMessageType] = useState('transactional')
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null)

  const { data: devices = [] } = useQuery({
    queryKey: ['member-devices-online'],
    queryFn: getOnlineDevices,
    staleTime: 30_000,
  })

  const sendMutation = useMutation({
    mutationFn: () =>
      sendSMS({
        device_id: selectedDeviceId,
        recipient,
        message,
        message_type: messageType,
      }),
    onSuccess: (data) => {
      setResult({ success: true, message: `Message queued (${data.message_id.slice(0, 8)}…)` })
      setRecipient('')
      setMessage('')
      setMessageType('transactional')
    },
    onError: (err: Error) => {
      setResult({ success: false, message: err.message })
    },
  })

  const selectedDevice = devices.find((d) => d.id === selectedDeviceId)

  return (
    <PageTransition>
    <motion.div initial="hidden" animate="visible" variants={staggerContainer} className="space-y-8">
      {/* Hero */}
      <motion.div variants={fadeInUp}>
        <div className="relative overflow-hidden rounded-2xl border border-white/[0.06] bg-white/[0.02] p-8">
          <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-blue-600/10 blur-[80px]" />
          <div className="pointer-events-none absolute -left-8 bottom-0 h-32 w-32 rounded-full bg-cyan-600/10 blur-[60px]" />
          <div className="relative flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-600 shadow-lg shadow-blue-500/25">
              <Send className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-extrabold tracking-tight text-white lg:text-4xl">
                <span className="bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
                  Send SMS
                </span>
              </h1>
              <p className="mt-1 text-sm text-gray-400">
                Send a test message through your online devices
              </p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Form */}
      <motion.div variants={fadeInUp} className="space-y-6 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6 max-w-xl">
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
              className="block w-full rounded-xl border border-white/[0.08] bg-white/[0.05] px-3.5 py-2.5 text-sm text-gray-100 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-500/10"
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

        <Input
          label="Recipient"
          value={recipient}
          onChange={(e) => setRecipient(e.target.value)}
          placeholder="+1234567890"
          icon={<Phone className="h-4 w-4" />}
          required
        />

        {/* Message */}
        <div>
          <label className="mb-1.5 flex items-center justify-between text-sm font-medium text-gray-300">
            <span className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              Message
            </span>
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
            className="block w-full rounded-xl border border-white/[0.08] bg-white/[0.05] px-3.5 py-2.5 text-sm text-gray-100 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-500/10 placeholder:text-gray-500"
            required
          />
        </div>

        {/* Message type */}
        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-300">Message type</label>
          <select
            value={messageType}
            onChange={(e) => setMessageType(e.target.value)}
            className="block w-full rounded-xl border border-white/[0.08] bg-white/[0.05] px-3.5 py-2.5 text-sm text-gray-100 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-500/10"
          >
            <option value="transactional">Transactional</option>
            <option value="marketing">Marketing</option>
            <option value="otp">OTP</option>
          </select>
        </div>

        {/* Submit */}
        <div className="flex items-center gap-4 pt-2">
          <Button
            size="sm"
            icon={<Send className="h-4 w-4" />}
            onClick={() => {
              setResult(null)
              sendMutation.mutate()
            }}
            loading={sendMutation.isPending}
            disabled={!selectedDeviceId || !recipient.trim() || !message.trim()}
          >
            Send{selectedDevice ? ` via ${selectedDevice.name}` : ''}
          </Button>
        </div>
      </motion.div>

      {/* Result */}
      {result && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className={`flex items-start gap-3 rounded-xl border p-4 max-w-xl ${
            result.success
              ? 'border-emerald-500/20 bg-emerald-500/5'
              : 'border-red-500/20 bg-red-500/5'
          }`}
        >
          {result.success
            ? <CheckCircle className="mt-0.5 h-5 w-5 shrink-0 text-emerald-400" />
            : <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-400" />
          }
          <div className="text-sm text-gray-300">{result.message}</div>
        </motion.div>
      )}
    </motion.div>
    </PageTransition>
  )
}
