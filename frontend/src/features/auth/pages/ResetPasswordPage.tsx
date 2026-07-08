import { useState, useCallback, useMemo } from 'react'
import { Link, useParams, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { OnboardingBackground } from '@/components/ui/OnboardingBackground'
import { Zap, Lock, ArrowLeft, CheckCircle2 } from 'lucide-react'
import { containerVariants, itemVariants } from '@/landing/animations/onboardingVariants'

export function ResetPasswordPage() {
  const { token = '' } = useParams<{ token: string }>()
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const navigate = useNavigate()

  const passwordChecks = useMemo(() => {
    const checks = {
      length: newPassword.length >= 8,
      uppercase: /[A-Z]/.test(newPassword),
      lowercase: /[a-z]/.test(newPassword),
      number: /\d/.test(newPassword),
    }
    return checks
  }, [newPassword])

  const allChecksPass = Object.values(passwordChecks).every(Boolean)
  const passwordsMatch = newPassword === confirmPassword && newPassword.length > 0

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!allChecksPass) {
      setError('Password must be at least 8 characters with uppercase, lowercase, and a number.')
      return
    }
    if (!passwordsMatch) {
      setError('Passwords do not match.')
      return
    }

    setLoading(true)
    try {
      const { resetPassword } = await import('@/services/auth')
      await resetPassword(token, newPassword)
      setSuccess(true)
      setTimeout(() => navigate('/login', { replace: true }), 3000)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to reset password')
    } finally {
      setLoading(false)
    }
  }, [token, newPassword, allChecksPass, passwordsMatch, navigate])

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
          <div className="mb-6 flex flex-col items-center">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 shadow-lg shadow-blue-500/25">
              <Zap className="h-7 w-7 text-white" strokeWidth={2.5} />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-white">
              Reset password
            </h1>
            <p className="mt-2 text-center text-sm text-gray-400">
              Choose a new password for your account.
            </p>
          </div>

          <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-6 shadow-2xl shadow-black/20 backdrop-blur-xl">
            {success ? (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center"
              >
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-green-500/10 ring-1 ring-green-500/20">
                  <CheckCircle2 className="h-8 w-8 text-green-400" />
                </div>
                <h2 className="text-lg font-semibold text-white">Password reset</h2>
                <p className="mt-2 text-sm text-gray-400">
                  Your password has been reset successfully. Redirecting to login…
                </p>
                <Link to="/login">
                  <Button variant="ghost" className="mt-6 w-full">
                    Go to sign in
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
                  label="New password"
                  type="password"
                  placeholder="Enter new password"
                  icon={<Lock className="h-4 w-4" />}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  autoFocus
                />
                {newPassword.length > 0 && (
                  <div className="space-y-1.5 rounded-lg border border-white/[0.06] bg-white/[0.02] p-3">
                    {[
                      { label: 'At least 8 characters', ok: passwordChecks.length },
                      { label: 'Uppercase letter', ok: passwordChecks.uppercase },
                      { label: 'Lowercase letter', ok: passwordChecks.lowercase },
                      { label: 'Number', ok: passwordChecks.number },
                    ].map((c) => (
                      <div key={c.label} className="flex items-center gap-2 text-xs">
                        <span className={c.ok ? 'text-green-400' : 'text-gray-500'}>
                          {c.ok ? '✓' : '○'}
                        </span>
                        <span className={c.ok ? 'text-gray-300' : 'text-gray-500'}>
                          {c.label}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
                <Input
                  label="Confirm new password"
                  type="password"
                  placeholder="Re-enter new password"
                  icon={<Lock className="h-4 w-4" />}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
                {confirmPassword.length > 0 && !passwordsMatch && (
                  <p className="text-xs text-red-400">Passwords do not match</p>
                )}
                <Button
                  type="submit"
                  className="w-full"
                  loading={loading}
                  disabled={!allChecksPass || !passwordsMatch}
                >
                  Reset password
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
