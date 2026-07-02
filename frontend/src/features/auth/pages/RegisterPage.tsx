import { useState, useEffect, useCallback } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'

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
    <div className="flex min-h-screen items-center justify-center bg-primary-50 dark:bg-[#0a0e1a]">
      <div className="glass-card relative w-full max-w-md space-y-8 rounded-2xl p-8">
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-600 shadow-lg shadow-primary-600/25">
            <svg className="h-7 w-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-surface-900 dark:text-white"><span className="text-primary-600">AeroXe</span> Bee</h1>
          <p className="mt-2 text-sm text-surface-500 dark:text-surface-400">Create your member account</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="rounded-xl border border-danger/20 bg-danger/5 p-3 text-sm text-danger">{error}</div>
          )}
          <div>
            <label className="block text-sm font-medium text-surface-700 dark:text-surface-300">Full Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1.5 block w-full rounded-xl border border-surface-300 bg-surface-50 px-4 py-3 text-surface-900 shadow-sm transition-colors placeholder:text-surface-400 focus:border-primary-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary-500/20 dark:border-[#1a2038] dark:bg-[#0d1220] dark:text-white dark:focus:border-primary-400/40 dark:focus:bg-[#111828] dark:focus:ring-primary-400/20"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-surface-700 dark:text-surface-300">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1.5 block w-full rounded-xl border border-surface-300 bg-surface-50 px-4 py-3 text-surface-900 shadow-sm transition-colors placeholder:text-surface-400 focus:border-primary-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary-500/20 dark:border-[#1a2038] dark:bg-[#0d1220] dark:text-white dark:focus:border-primary-400/40 dark:focus:bg-[#111828] dark:focus:ring-primary-400/20"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-surface-700 dark:text-surface-300">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={8}
              className="mt-1.5 block w-full rounded-xl border border-surface-300 bg-surface-50 px-4 py-3 text-surface-900 shadow-sm transition-colors placeholder:text-surface-400 focus:border-primary-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary-500/20 dark:border-[#1a2038] dark:bg-[#0d1220] dark:text-white dark:focus:border-primary-400/40 dark:focus:bg-[#111828] dark:focus:ring-primary-400/20"
              required
            />
            <p className="mt-1 text-xs text-surface-400">Minimum 8 characters</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-surface-700 dark:text-surface-300">Confirm Password</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              minLength={8}
              className="mt-1.5 block w-full rounded-xl border border-surface-300 bg-surface-50 px-4 py-3 text-surface-900 shadow-sm transition-colors placeholder:text-surface-400 focus:border-primary-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary-500/20 dark:border-[#1a2038] dark:bg-[#0d1220] dark:text-white dark:focus:border-primary-400/40 dark:focus:bg-[#111828] dark:focus:ring-primary-400/20"
              required
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-primary-600 px-4 py-3 text-white font-medium shadow-sm transition-all hover:bg-primary-700 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-50"
          >
            {loading ? 'Creating account...' : 'Create Account'}
          </button>
        </form>
        <p className="text-center text-sm text-surface-500 dark:text-surface-400">
          Already have an account?{' '}
          <Link to="/login" className="font-medium text-primary-600 hover:text-primary-500">Sign in</Link>
        </p>
      </div>
    </div>
  )
}
