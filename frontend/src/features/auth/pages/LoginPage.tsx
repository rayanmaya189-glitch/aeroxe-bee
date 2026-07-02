import { useState, useEffect, useCallback } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'

export function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()
  const { login: storeLogin, isAuthenticated } = useAuthStore()

  useEffect(() => {
    if (isAuthenticated) navigate('/dashboard', { replace: true })
  }, [isAuthenticated, navigate])

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const { login } = await import('@/services/auth')
      const data = await login({ email, password })
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
  }, [email, password, storeLogin, navigate])

  return (
    <div className="flex min-h-screen items-center justify-center bg-primary-50 dark:bg-[#0a0e1a]">
      <div className="glass-card relative w-full max-w-md space-y-8 rounded-2xl p-8">
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-600 shadow-lg shadow-primary-600/25">
            <svg className="h-7 w-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-surface-900 dark:text-white"><span className="text-primary-600">AeroXe</span> Bee</h1>
          <p className="mt-2 text-sm text-surface-500 dark:text-surface-400">Admin portal sign in</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-5">
          {error && (
            <div className="rounded-xl border border-danger/20 bg-danger/5 p-3 text-sm text-danger">{error}</div>
          )}
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
              className="mt-1.5 block w-full rounded-xl border border-surface-300 bg-surface-50 px-4 py-3 text-surface-900 shadow-sm transition-colors placeholder:text-surface-400 focus:border-primary-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary-500/20 dark:border-[#1a2038] dark:bg-[#0d1220] dark:text-white dark:focus:border-primary-400/40 dark:focus:bg-[#111828] dark:focus:ring-primary-400/20"
              required
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-primary-600 px-4 py-3 text-white font-medium shadow-sm transition-all hover:bg-primary-700 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-50"
          >
            {loading ? 'Signing in...' : 'Sign in'}
          </button>
        </form>
        <p className="text-center text-sm text-surface-500 dark:text-surface-400">
          Don't have an account?{' '}
          <Link to="/register" className="font-medium text-primary-600 hover:text-primary-500">Sign up</Link>
        </p>
      </div>
    </div>
  )
}
