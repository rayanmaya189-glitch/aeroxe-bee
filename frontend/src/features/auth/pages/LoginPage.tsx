import { useState, useEffect, useCallback } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuthStore } from '@/store/authStore'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Zap, Mail, Lock, ShieldCheck, ArrowLeft } from 'lucide-react'

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
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#030712] px-4">
      {/* Background grid */}
      <div className="absolute inset-0" style={{
        backgroundImage: `linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px)`,
        backgroundSize: '64px 64px',
      }} />

      {/* Ambient glows */}
      <div className="absolute left-1/4 top-1/4 h-[400px] w-[400px] rounded-full bg-blue-600/10 blur-[128px]" />
      <div className="absolute bottom-1/4 right-1/4 h-[300px] w-[300px] rounded-full bg-purple-600/10 blur-[128px]" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="relative w-full max-w-sm"
      >
        <div className="mb-8 text-center">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.1, duration: 0.5 }}
            className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 shadow-lg shadow-blue-500/25"
          >
            {step === '2fa' ? (
              <ShieldCheck className="h-6 w-6 text-white" strokeWidth={2.5} />
            ) : (
              <Zap className="h-6 w-6 text-white" strokeWidth={2.5} />
            )}
          </motion.div>
          <h1 className="text-2xl font-bold tracking-tight text-white">
            {step === '2fa' ? 'Two-factor authentication' : 'Welcome back'}
          </h1>
          <p className="mt-2 text-sm text-gray-400">
            {step === '2fa'
              ? 'Enter the 6-digit code from your authenticator app'
              : 'Sign in to your account'
            }
          </p>
        </div>

        <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-6 shadow-2xl shadow-black/20 backdrop-blur-xl">
          <AnimatePresence mode="wait">
            {step === 'credentials' ? (
              <motion.form
                key="credentials"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
                onSubmit={handleSubmit}
                className="space-y-4"
              >
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
                  placeholder="••••••••"
                  icon={<Lock className="h-4 w-4" />}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <Button type="submit" className="w-full" loading={loading}>
                  Sign in
                </Button>
              </motion.form>
            ) : (
              <motion.form
                key="2fa"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.2 }}
                onSubmit={handle2FASubmit}
                className="space-y-4"
              >
                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="rounded-lg border border-red-500/20 bg-red-500/5 p-3 text-sm text-red-400"
                  >
                    {error}
                  </motion.div>
                )}
                <div className="text-center">
                  <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-500/20 to-orange-500/20 ring-1 ring-amber-500/20">
                    <ShieldCheck className="h-8 w-8 text-amber-400" />
                  </div>
                  <p className="text-xs text-gray-500">
                    Code sent to <span className="text-gray-400">{email}</span>
                  </p>
                </div>
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
              </motion.form>
            )}
          </AnimatePresence>
        </div>

        {step === 'credentials' && (
          <p className="mt-6 text-center text-sm text-gray-500">
            Don&apos;t have an account?{' '}
            <Link to="/register" className="font-medium text-blue-400 hover:text-blue-300 transition-colors">
              Sign up
            </Link>
          </p>
        )}
      </motion.div>
    </div>
  )
}
