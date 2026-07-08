import { useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { OnboardingBackground } from '@/components/ui/OnboardingBackground'
import { Zap, Mail, ArrowLeft, CheckCircle2 } from 'lucide-react'
import { containerVariants, itemVariants } from '@/landing/animations/onboardingVariants'

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const { forgotPassword } = await import('@/services/auth')
      await forgotPassword(email)
      setSent(true)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to send reset email')
    } finally {
      setLoading(false)
    }
  }, [email])

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#030712] px-4 py-12">
      <OnboardingBackground />

      <motion.div
        initial="hidden"
        animate="visible"
        variants={containerVariants}
        className="relative z-10 flex w-full max-w-md flex-col items-center"
      >
        <motion.div variants={itemVariants} className="w-full">
          {/* Logo */}
          <div className="mb-6 flex flex-col items-center">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 shadow-lg shadow-blue-500/25">
              <Zap className="h-7 w-7 text-white" strokeWidth={2.5} />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-white">
              Forgot password
            </h1>
            <p className="mt-2 text-center text-sm text-gray-400">
              Enter your email and we'll send you a link to reset your password.
            </p>
          </div>

          <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-6 shadow-2xl shadow-black/20 backdrop-blur-xl">
            {sent ? (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center"
              >
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-green-500/10 ring-1 ring-green-500/20">
                  <CheckCircle2 className="h-8 w-8 text-green-400" />
                </div>
                <h2 className="text-lg font-semibold text-white">Check your inbox</h2>
                <p className="mt-2 text-sm text-gray-400">
                  If an account exists for <span className="text-gray-300">{email}</span>,
                  you will receive a password reset link shortly. The link expires in 1 hour.
                </p>
                <Link to="/login">
                  <Button variant="ghost" className="mt-6 w-full">
                    <span className="flex items-center justify-center gap-2">
                      <ArrowLeft className="h-4 w-4" />
                      Back to sign in
                    </span>
                  </Button>
                </Link>
              </motion.div>
            ) : (
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
                  autoFocus
                />
                <Button type="submit" className="w-full" loading={loading}>
                  Send reset link
                </Button>
                <Link
                  to="/login"
                  className="flex w-full items-center justify-center gap-2 rounded-lg py-2 text-sm text-gray-400 transition-colors hover:text-gray-200"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  Back to sign in
                </Link>
              </form>
            )}
          </div>
        </motion.div>
      </motion.div>
    </div>
  )
}
