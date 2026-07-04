import { useState, useEffect, useCallback } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuthStore } from '@/store/authStore'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { OnboardingBackground } from '@/components/ui/OnboardingBackground'
import { Zap, Mail, Lock, ShieldCheck, ArrowLeft, ArrowRight, MessageSquare, BarChart3, Globe } from 'lucide-react'
import { containerVariants, itemVariants } from '@/landing/animations/onboardingVariants'

const quickStats = [
  { icon: MessageSquare, value: '1M+', label: 'Messages delivered' },
  { icon: BarChart3, value: '95%', label: 'Delivery rate' },
  { icon: Globe, value: '50+', label: 'Countries' },
]

export function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [twoFACode, setTwoFACode] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [step, setStep] = useState<'credentials' | '2fa'>('credentials')
  const navigate = useNavigate()
  const { login: storeLogin, start2FA, complete2FA, cancel2FA, isAuthenticated, pending2FA, pending2FAEmail, pending2FAToken } = useAuthStore()

  useEffect(() => {
    if (isAuthenticated) navigate('/dashboard', { replace: true })
  }, [isAuthenticated, navigate])

  useEffect(() => {
    if (pending2FA) {
      setStep('2fa')
      setEmail(pending2FAEmail)
    }
  }, [pending2FA, pending2FAEmail])

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const { login } = await import('@/services/auth')
      const data = await login({ email, password })
      if (data.requires_2fa || data.two_fa_pending) {
        start2FA(email, data.two_fa_token ?? data.token)
        setStep('2fa')
        setLoading(false)
        return
      }
      storeLogin(data.token, data.refreshToken, {
        id: data.user.id,
        email: data.user.email,
        name: data.user.name,
        role: data.user.role,
      })
      navigate(data.user.role === 'member' ? '/member' : '/dashboard', { replace: true })
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Login failed')
    } finally {
      setLoading(false)
    }
  }, [email, password, storeLogin, navigate, start2FA])

  const handle2FASubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const { verify2FALogin } = await import('@/services/auth')
      const data = await verify2FALogin(pending2FAToken, twoFACode)
      complete2FA(data.token, data.refreshToken, {
        id: data.user.id,
        email: data.user.email,
        name: data.user.name,
        role: data.user.role,
      })
      navigate(data.user.role === 'member' ? '/member' : '/dashboard', { replace: true })
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Invalid 2FA code')
    } finally {
      setLoading(false)
    }
  }, [pending2FAToken, twoFACode, complete2FA, navigate])

  const handleBack = () => {
    cancel2FA()
    setStep('credentials')
    setTwoFACode('')
    setError('')
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#030712] px-4 py-12">
      <OnboardingBackground />

      <motion.div
        initial="hidden"
        animate="visible"
        variants={containerVariants}
        className="relative z-10 flex w-full max-w-5xl flex-col items-center gap-12 lg:flex-row lg:items-start lg:gap-16"
      >
        {/* Left: Hero content (only on credentials step) */}
        {step === 'credentials' && (
          <motion.div variants={itemVariants} className="flex-1 text-center lg:text-left lg:pt-8">
            {/* Logo */}
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.1, duration: 0.5, type: 'spring', stiffness: 200 }}
              className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 shadow-lg shadow-blue-500/25 lg:mx-0"
            >
              <Zap className="h-7 w-7 text-white" strokeWidth={2.5} />
            </motion.div>

            <h1 className="text-4xl font-bold tracking-tight text-white sm:text-5xl">
              Welcome back to{' '}
              <span className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                AeroXe Bee
              </span>
            </h1>
            <p className="mt-4 max-w-md text-lg text-gray-400 lg:mx-0">
              Your SMS platform is ready. Sign in to manage devices, track deliveries, and monitor your fleet in real time.
            </p>

            {/* Quick stats */}
            <div className="mt-8 grid grid-cols-3 gap-4">
              {quickStats.map((stat, i) => (
                <motion.div
                  key={stat.label}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 + i * 0.1, duration: 0.4 }}
                  className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4"
                >
                  <stat.icon className="h-5 w-5 text-blue-400 mb-2" />
                  <div className="text-xl font-bold text-white">{stat.value}</div>
                  <div className="text-xs text-gray-500">{stat.label}</div>
                </motion.div>
              ))}
            </div>


          </motion.div>
        )}

        {/* Right: Login form / 2FA */}
        <motion.div variants={itemVariants} className="w-full max-w-sm">
          <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-6 shadow-2xl shadow-black/20 backdrop-blur-xl">
            <AnimatePresence mode="wait">
              {step === 'credentials' ? (
                <motion.div
                  key="credentials"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.25 }}
                >
                  <h2 className="mb-1 text-lg font-semibold text-white">Sign in to your account</h2>
                  <p className="mb-6 text-sm text-gray-400">Enter your credentials to access your dashboard.</p>

                  <form onSubmit={handleSubmit} className="space-y-4">
                    {error && (
                      <motion.div
                        initial={{ opacity: 0, y: -8 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="rounded-lg border border-red-500/20 bg-red-500/5 p-3 text-sm text-red-400"
                      >
                        {error}
                      </motion.div>
                    )}
                    <Input
                      label="Email"
                      type="email"
                      placeholder="you@company.com"
                      icon={<Mail className="h-4 w-4" />}
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                    <Input
                      label="Password"
                      type="password"
                      placeholder="Enter your password"
                      icon={<Lock className="h-4 w-4" />}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                    <Button type="submit" className="w-full" loading={loading}>
                      <span className="flex items-center gap-2">
                        Sign in
                        <ArrowRight className="h-4 w-4" />
                      </span>
                    </Button>
                  </form>
                </motion.div>
              ) : (
                <motion.div
                  key="2fa"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ duration: 0.25 }}
                >
                  <div className="text-center mb-6">
                    <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-500/20 to-orange-500/20 ring-1 ring-amber-500/20">
                      <ShieldCheck className="h-8 w-8 text-amber-400" />
                    </div>
                    <h2 className="text-lg font-semibold text-white">Two-factor authentication</h2>
                    <p className="mt-1 text-sm text-gray-400">
                      Enter the 6-digit code from your authenticator app
                    </p>
                    <p className="mt-2 text-xs text-gray-500">
                      Sent to <span className="text-gray-400">{email}</span>
                    </p>
                  </div>

                  <form onSubmit={handle2FASubmit} className="space-y-4">
                    {error && (
                      <motion.div
                        initial={{ opacity: 0, y: -8 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="rounded-lg border border-red-500/20 bg-red-500/5 p-3 text-sm text-red-400"
                      >
                        {error}
                      </motion.div>
                    )}
                    <Input
                      label="Verification code"
                      type="text"
                      placeholder="000000"
                      icon={<ShieldCheck className="h-4 w-4" />}
                      value={twoFACode}
                      onChange={(e) => setTwoFACode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      maxLength={6}
                      className="text-center text-lg tracking-[0.5em] font-mono"
                      required
                    />
                    <Button type="submit" className="w-full" loading={loading} disabled={twoFACode.length !== 6}>
                      Verify code
                    </Button>
                    <button
                      type="button"
                      onClick={handleBack}
                      className="flex w-full items-center justify-center gap-2 rounded-lg py-2 text-sm text-gray-400 transition-colors hover:text-gray-200"
                    >
                      <ArrowLeft className="h-3.5 w-3.5" />
                      Back to sign in
                    </button>
                  </form>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {step === 'credentials' && (
            <p className="mt-6 text-center text-sm text-gray-500">
              Don&apos;t have an account?{' '}
              <Link to="/register" className="font-medium text-blue-400 hover:text-blue-300 transition-colors">
                Get started free
              </Link>
            </p>
          )}
        </motion.div>
      </motion.div>
    </div>
  )
}
