import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { QRCodeSVG } from 'qrcode.react'
import { X, RefreshCw, Smartphone, Clock, AlertCircle, CheckCircle2 } from 'lucide-react'
import api from '@/services/api'
import type { ApiResponse } from '@/types/api'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'

interface QRCodeData {
  token: string
  expires_at: string
  qr_data: string
}

interface AddDeviceQRModalProps {
  open: boolean
  onClose: () => void
}

export function AddDeviceQRModal({ open, onClose }: AddDeviceQRModalProps) {
  const [qrData, setQrData] = useState<QRCodeData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [timeLeft, setTimeLeft] = useState(0)
  const [status, setStatus] = useState<'idle' | 'waiting' | 'expired' | 'error'>('idle')

  const fetchQRCode = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await api.post<ApiResponse<QRCodeData>>('/member/devices/qr-code')
      if (res.data.success && res.data.data) {
        setQrData(res.data.data)
        setStatus('waiting')
        // Calculate time left
        const expiresAt = new Date(res.data.data.expires_at).getTime()
        setTimeLeft(Math.max(0, Math.floor((expiresAt - Date.now()) / 1000)))
      } else {
        setError(res.data.error || 'Failed to generate QR code')
        setStatus('error')
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to generate QR code'
      setError(message)
      setStatus('error')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (open) {
      fetchQRCode()
    } else {
      setQrData(null)
      setStatus('idle')
      setTimeLeft(0)
    }
  }, [open, fetchQRCode])

  // Countdown timer
  useEffect(() => {
    if (status !== 'waiting' || timeLeft <= 0) return

    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          setStatus('expired')
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(interval)
  }, [status, timeLeft])

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    return `${m}:${s.toString().padStart(2, '0')}`
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="w-full max-w-md rounded-2xl border border-white/[0.08] bg-[#0a0a0f] shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-white/[0.06] px-6 py-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-green-600 shadow-lg shadow-emerald-500/25">
                  <Smartphone className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">Add New Device</h2>
                  <p className="text-xs text-gray-400">Scan QR code with the Android app</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-white/[0.06] hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Content */}
            <div className="px-6 py-6">
              {/* QR Code Display */}
              <Card glow="bg-emerald-500/10" className="flex flex-col items-center">
                {loading && (
                  <div className="flex flex-col items-center gap-3 py-12">
                    <div className="h-12 w-12 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
                    <p className="text-sm text-gray-400">Generating QR code...</p>
                  </div>
                )}

                {error && (
                  <div className="flex flex-col items-center gap-4 py-8">
                    <AlertCircle className="h-12 w-12 text-red-400" />
                    <p className="text-sm text-red-400">{error}</p>
                    <Button onClick={fetchQRCode} loading={loading} size="sm">
                      Try Again
                    </Button>
                  </div>
                )}

                {qrData && status === 'waiting' && (
                  <div className="flex flex-col items-center gap-4 py-4">
                    <div className="rounded-2xl bg-white p-4 shadow-lg">
                      <QRCodeSVG
                        value={qrData.qr_data}
                        size={200}
                        level="M"
                        includeMargin={false}
                        bgColor="#ffffff"
                        fgColor="#000000"
                      />
                    </div>

                    {/* Timer */}
                    <div className="flex items-center gap-2 rounded-full bg-white/[0.06] px-4 py-1.5">
                      <Clock className="h-3.5 w-3.5 text-emerald-400" />
                      <span
                        className={`text-sm font-mono font-medium ${
                          timeLeft <= 30 ? 'text-amber-400' : 'text-emerald-400'
                        }`}
                      >
                        {formatTime(timeLeft)}
                      </span>
                    </div>
                  </div>
                )}

                {status === 'expired' && (
                  <div className="flex flex-col items-center gap-4 py-8">
                    <Clock className="h-12 w-12 text-amber-400" />
                    <p className="text-sm text-amber-400">QR code expired</p>
                    <Button onClick={fetchQRCode} loading={loading} size="sm">
                      <RefreshCw className="mr-2 h-3.5 w-3.5" />
                      Generate New Code
                    </Button>
                  </div>
                )}
              </Card>

              {/* Instructions */}
              <div className="mt-6 space-y-3">
                <h3 className="text-sm font-semibold text-gray-200">How to pair:</h3>
                <ol className="space-y-2 text-sm text-gray-400">
                  {[
                    'Open the AeroXe Bee Android app',
                    'Tap "Scan QR Code" on the login screen',
                    'Point your camera at the QR code above',
                    'The device will be paired automatically',
                  ].map((step, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-[10px] font-bold text-emerald-400">
                        {i + 1}
                      </span>
                      <span>{step}</span>
                    </li>
                  ))}
                </ol>
              </div>

              {/* Refresh button */}
              {status === 'waiting' && (
                <div className="mt-6 flex justify-center">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={fetchQRCode}
                    loading={loading}
                    className="text-gray-400"
                  >
                    <RefreshCw className="mr-2 h-3.5 w-3.5" />
                    Refresh Code
                  </Button>
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
