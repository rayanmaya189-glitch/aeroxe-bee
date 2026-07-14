import { useState, useCallback, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { PageTransition } from '@/components/ui/PageTransition'
import { useMutation, useQuery } from '@tanstack/react-query'
import { sendMemberOtp, verifyMemberOtp, sendSMS } from '@/services/dashboard'
import { getOnlineDevices } from '@/services/api'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { staggerContainer, fadeInUp } from '@/components/animations/variants'
import {
  Send, Phone, KeyRound, CheckCircle, AlertCircle,
  Smartphone, RefreshCw, Shield, Clock,
} from 'lucide-react'

type OtpStep = 'send' | 'verify'

export function OtpPage() {
  const [step, setStep] = useState<OtpStep>('send')
  const [recipient, setRecipient] = useState('')
  const [selectedDeviceId, setSelectedDeviceId] = useState('')
  const [otpCode, setOtpCode] = useState('')
  const [verifyCode, setVerifyCode] = useState('')
  const [expiresIn, setExpiresIn] = useState(0)
  const [isVerified, setIsVerified] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const { data: devices = [] } = useQuery({
    queryKey: ['member-devices-online'],
    queryFn: getOnlineDevices,
    staleTime: 30_000,
  })

  useEffect(() => {
    if (step === 'verify' && expiresIn > 0) {
      timerRef.current = setInterval(() => {
        setExpiresIn((prev) => {
          if (prev <= 1) {
            if (timerRef.current) clearInterval(timerRef.current)
            return 0
          }
          return prev - 1
        })
      }, 1000)
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [step, expiresIn])

  const sendMutation = useMutation({
    mutationFn: async () => {
      const otpResult = await sendMemberOtp(recipient)
      if (selectedDeviceId) {
        const msg = `Your verification code is: ${otpResult.code}`
        await sendSMS({
          device_id: selectedDeviceId,
          recipient,
          message: msg,
          message_type: 'otp',
        })
      }
      return otpResult
    },
    onSuccess: (data) => {
      setOtpCode(data.code)
      setExpiresIn(data.expires_in)
      setError(null)
      setStep('verify')
    },
    onError: (err: Error) => {
      setError(err.message)
    },
  })

  const verifyMutation = useMutation({
    mutationFn: () => verifyMemberOtp(recipient, verifyCode),
    onSuccess: () => {
      setIsVerified(true)
      setError(null)
    },
    onError: (err: Error) => {
      setError(err.message)
    },
  })

  const handleSendAgain = useCallback(() => {
    setStep('send')
    setOtpCode('')
    setVerifyCode('')
    setIsVerified(false)
    setError(null)
    setExpiresIn(0)
  }, [])

  return (
    <PageTransition>
      <motion.div initial="hidden" animate="visible" variants={staggerContainer} className="space-y-8">
        {/* Hero */}
        <motion.div variants={fadeInUp}>
          <div className="relative overflow-hidden rounded-2xl border border-white/[0.06] bg-white/[0.02] p-8">
            <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-emerald-600/10 blur-[80px]" />
            <div className="pointer-events-none absolute -left-8 bottom-0 h-32 w-32 rounded-full bg-teal-600/10 blur-[60px]" />
            <div className="relative flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 shadow-lg shadow-emerald-500/25">
                <Shield className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-extrabold tracking-tight text-white lg:text-4xl">
                  <span className="bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent">
                    OTP Tool
                  </span>
                </h1>
                <p className="mt-1 text-sm text-gray-400">
                  Generate and verify one-time passcodes
                </p>
              </div>
            </div>
          </div>
        </motion.div>

        {step === 'send' && (
          <motion.div variants={fadeInUp} className="space-y-6 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6 max-w-xl">
            <div>
              <label className="mb-1.5 flex items-center gap-2 text-sm font-medium text-gray-300">
                <Phone className="h-4 w-4" />
                Recipient Phone
              </label>
              <input
                value={recipient}
                onChange={(e) => { setRecipient(e.target.value); setError(null) }}
                placeholder="+1234567890"
                className="block w-full rounded-xl border border-white/[0.08] bg-white/[0.05] px-3.5 py-2.5 text-sm text-gray-100 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-4 focus:ring-emerald-500/10 placeholder:text-gray-500"
                required
              />
            </div>

            {/* Device selector */}
            <div>
              <label className="mb-1.5 flex items-center gap-2 text-sm font-medium text-gray-300">
                <Smartphone className="h-4 w-4" />
                Device <span className="text-xs text-gray-500">(optional — sends OTP via SMS)</span>
              </label>
              {devices.length === 0 ? (
                <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-3 text-sm text-amber-400">
                  No online devices. OTP code will be displayed for manual use.
                </div>
              ) : (
                <select
                  value={selectedDeviceId}
                  onChange={(e) => setSelectedDeviceId(e.target.value)}
                  className="block w-full rounded-xl border border-white/[0.08] bg-white/[0.05] px-3.5 py-2.5 text-sm text-gray-100 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-4 focus:ring-emerald-500/10"
                >
                  <option value="">Display code only (no SMS)</option>
                  {devices.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name} · {d.carrier} · SIM {d.sim_slot}{d.phone_number ? ` · ${d.phone_number}` : ''}
                    </option>
                  ))}
                </select>
              )}
              {selectedDeviceId && (() => {
                const device = devices.find((d) => d.id === selectedDeviceId)
                return device ? (
                  <div className="mt-2 flex items-center gap-2">
                    <Badge variant="success" dot size="sm">Online</Badge>
                    <span className="text-xs text-gray-500">{device.carrier} · SIM {device.sim_slot}</span>
                  </div>
                ) : null
              })()}
            </div>

            {error && (
              <div className="flex items-start gap-3 rounded-xl border border-red-500/20 bg-red-500/5 p-4">
                <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-400" />
                <div className="text-sm text-gray-300">{error}</div>
              </div>
            )}

            <Button
              size="sm"
              icon={<Send className="h-4 w-4" />}
              onClick={() => {
                setError(null)
                sendMutation.mutate()
              }}
              loading={sendMutation.isPending}
              disabled={!recipient.trim()}
            >
              Generate{selectedDeviceId ? ' & Send' : ''} OTP
            </Button>
          </motion.div>
        )}

        {step === 'verify' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6 max-w-xl"
          >
            {/* OTP Sent status */}
            <div className="flex flex-col items-center gap-3 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500/20 to-teal-600/20">
                {isVerified ? (
                  <CheckCircle className="h-8 w-8 text-emerald-400" />
                ) : (
                  <Shield className="h-8 w-8 text-emerald-400" />
                )}
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">
                  {isVerified ? 'Verified!' : 'OTP Generated'}
                </h2>
                <p className="mt-1 text-sm text-gray-400">
                  Code sent to {recipient}
                </p>
              </div>
            </div>

            {/* Code display (if no device selected) */}
            {!selectedDeviceId && otpCode && !isVerified && (
              <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4 text-center">
                <p className="text-xs text-gray-400 mb-2">Generated OTP Code</p>
                <p className="text-3xl font-bold tracking-[0.25em] text-emerald-400 select-all">
                  {otpCode}
                </p>
                <p className="mt-2 text-xs text-gray-500">
                  Copy this code and send it to the recipient
                </p>
              </div>
            )}

            {/* Countdown timer */}
            {!isVerified && expiresIn > 0 && (
              <div className="flex items-center justify-center gap-2 text-sm">
                <Clock className="h-4 w-4 text-amber-400" />
                <span className={expiresIn <= 30 ? 'text-amber-400 font-medium' : 'text-gray-400'}>
                  Expires in {Math.floor(expiresIn / 60)}:{(expiresIn % 60).toString().padStart(2, '0')}
                </span>
              </div>
            )}

            {/* Verify code input */}
            {!isVerified && (
              <>
                <div>
                  <label className="mb-1.5 flex items-center gap-2 text-sm font-medium text-gray-300">
                    <KeyRound className="h-4 w-4" />
                    Verification Code
                  </label>
                  <input
                    value={verifyCode}
                    onChange={(e) => { setVerifyCode(e.target.value); setError(null) }}
                    placeholder="Enter the code received"
                    maxLength={6}
                    className="block w-full rounded-xl border border-white/[0.08] bg-white/[0.05] px-3.5 py-2.5 text-sm text-gray-100 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-4 focus:ring-emerald-500/10 placeholder:text-gray-500 text-center text-2xl tracking-[0.25em]"
                  />
                </div>

                {error && (
                  <div className="flex items-start gap-3 rounded-xl border border-red-500/20 bg-red-500/5 p-4">
                    <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-400" />
                    <div className="text-sm text-gray-300">{error}</div>
                  </div>
                )}

                <div className="flex items-center gap-4">
                  <Button
                    size="sm"
                    icon={<KeyRound className="h-4 w-4" />}
                    onClick={() => verifyMutation.mutate()}
                    loading={verifyMutation.isPending}
                    disabled={!verifyCode.trim()}
                  >
                    Verify Code
                  </Button>
                  <button
                    onClick={handleSendAgain}
                    className="flex items-center gap-2 text-sm text-gray-400 hover:text-gray-200 transition-colors"
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                    Send Again
                  </button>
                </div>
              </>
            )}

            {/* Verified state */}
            {isVerified && (
              <div className="flex flex-col items-center gap-4 pt-2">
                <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4 text-sm text-emerald-400 w-full text-center">
                  Code verified successfully
                </div>
                <button
                  onClick={handleSendAgain}
                  className="flex items-center gap-2 text-sm text-gray-400 hover:text-gray-200 transition-colors"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  Generate New Code
                </button>
              </div>
            )}
          </motion.div>
        )}
      </motion.div>
    </PageTransition>
  )
}
