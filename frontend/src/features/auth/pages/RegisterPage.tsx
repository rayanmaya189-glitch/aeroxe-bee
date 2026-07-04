import { useState, useEffect, useCallback } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useAuthStore } from '@/store/authStore'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { OnboardingBackground } from '@/components/ui/OnboardingBackground'
import { Zap, Mail, Lock, User, MessageSquare, Smartphone, Shield, ArrowRight, Check } from 'lucide-react'

const features = [
  { icon: MessageSquare, label: 'Smart routing strategies', color: 'text-blue-400' },
  { icon: Smartphone, label: 'Device fleet management', color: 'text-emerald-400' },
  { icon: Shield, label: 'End-to-end encryption', color: 'text-purple-400' },
]

const stats = [
  { value: '95%+', label: 'Delivery rate' },
  { value: '150ms', label: 'API latency' },
  { value: '99.9%', label: 'Uptime' },
]

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.2 },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' as const } },
}

export function RegisterPage() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()
  const { login: storeLogin, isAuthenticated } = useAuthStore()

  useEffect(() => {
    if (isAuthenticated) navigate('/member', { replace: true })
  }, [isAuthenticated, navigate])

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters')
      return
    }

    setLoading(true)
    try {
      const { register } = await import('@/services/auth')
      const data = await register({ name, email, password })
      storeLogin(data.token, data.refreshToken, {
        id: data.user.id,
        email: data.user.email,
        name: data.user.name,
        role: data.user.role,
      })
      navigate('/member', { replace: true })
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Registration failed')
    } finally {
      setLoading(false)
    }
  }, [name, email, password, confirmPassword, storeLogin, navigate])

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#030712] px-4 py-12">
      <OnboardingBackground />

      <motion.div
        initial="hidden"
        animate="visible"
        variants={containerVariants}
        className="relative z-10 flex w-full max-w-5xl flex-col items-center gap-12 lg:flex-row lg:items-start lg:gap-16"
      >
        {/* Left: Hero content */}
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
            Start sending{' '}
            <span className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
              smarter SMS
            </span>
          </h1>
          <p className="mt-4 max-w-md text-lg text-gray-400 lg:mx-0">
            Join thousands of businesses using intelligent routing, real-time analytics, and device fleet management to deliver messages at scale.
          </p>

          {/* Stats */}
          <div className="mt-8 flex items-center justify-center gap-8 lg:justify-start">
            {stats.map((stat, i) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 + i * 0.1, duration: 0.4 }}
                className="text-center"
              >
                <div className="text-xl font-bold text-white">{stat.value}</div>
                <div className="text-xs text-gray-500">{stat.label}</div>
              </motion.div>
            ))}
          </div>

          {/* Feature highlights */}
          <div className="mt-8 space-y-3">
            {features.map((feature, i) => (
              <motion.div
                key={feature.label}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.5 + i * 0.1, duration: 0.4 }}
                className="flex items-center gap-3"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/[0.06]">
                  <feature.icon className={`h-4 w-4 ${feature.color}`} />
                </div>
                <span className="text-sm text-gray-300">{feature.label}</span>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Right: Registration form */}
        <motion.div variants={itemVariants} className="w-full max-w-sm">
          <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-6 shadow-2xl shadow-black/20 backdrop-blur-xl">
            <h2 className="mb-1 text-lg font-semibold text-white">Create your account</h2>
            <p className="mb-6 text-sm text-gray-400">Free to start. No credit card required.</p>

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
                label="Full name"
                type="text"
                placeholder="Jane Smith"
                icon={<User className="h-4 w-4" />}
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
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
                placeholder="Min 8 characters"
                icon={<Lock className="h-4 w-4" />}
                hint="Must include uppercase, lowercase, and a number"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                minLength={8}
                required
              />
              <Input
                label="Confirm password"
                type="password"
                placeholder="Re-enter password"
                icon={<Lock className="h-4 w-4" />}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                minLength={8}
                required
              />
              <Button type="submit" className="w-full" loading={loading}>
                <span className="flex items-center gap-2">
                  Create account
                  <ArrowRight className="h-4 w-4" />
                </span>
              </Button>
            </form>

            <div className="mt-4 flex items-center gap-2 text-xs text-gray-500">
              <Check className="h-3 w-3 text-green-400" />
              <span>Free tier includes 1,000 SMS/month</span>
            </div>
          </div>

          <p className="mt-6 text-center text-sm text-gray-500">
            Already have an account?{' '}
            <Link to="/login" className="font-medium text-blue-400 hover:text-blue-300 transition-colors">
              Sign in
            </Link>
          </p>
        </motion.div>
      </motion.div>
    </div>
  )
}
