import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { login as loginApi } from '@/services/auth'
import { useAuthStore } from '@/store/authStore'

export function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()
  const login = useAuthStore((s) => s.login)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const res = await loginApi({ email, password })
      const refreshToken = (res as unknown as Record<string, unknown>).refreshToken as string | undefined
      login(res.token, refreshToken, res.user)
      navigate('/dashboard')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-primary-50 via-white to-surface-100 p-4 dark:from-surface-950 dark:via-surface-900 dark:to-surface-950">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <div className="rounded-2xl border bg-white/80 p-8 shadow-xl backdrop-blur-xl dark:bg-surface-800/80 dark:border-surface-700">
          <div className="mb-8 text-center">
            <h1 className="text-3xl font-bold text-surface-900 dark:text-white">
              <span className="text-primary-600">AeroXe</span> Bee
            </h1>
            <p className="mt-2 text-sm text-surface-500 dark:text-surface-400">Admin Dashboard</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="rounded-xl bg-danger/10 p-3 text-sm text-danger"
              >
                {error}
              </motion.div>
            )}

            <Input
              id="email"
              type="email"
              label="Email"
              placeholder="admin@aeroxe.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />

            <Input
              id="password"
              type="password"
              label="Password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />

            <Button type="submit" loading={loading} className="w-full" size="lg">
              Sign in
            </Button>
          </form>
        </div>
      </motion.div>
    </div>
  )
}
