import { useState, useEffect } from 'react'
import { useAuthStore } from '@/store/authStore'

export function DashboardPage() {
  const [stats, setStats] = useState<Record<string, unknown> | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const { user } = useAuthStore()

  useEffect(() => {
    loadStats()
  }, [])

  async function loadStats() {
    try {
      setLoading(true)
      const { getDashboardStats } = await import('@/services/dashboard')
      const data = await getDashboardStats()
      setStats(data as unknown as Record<string, unknown>)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load dashboard')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="space-y-2">
          <div className="h-8 w-48 animate-pulse rounded-lg bg-surface-200 dark:bg-surface-700" />
          <div className="h-4 w-64 animate-pulse rounded bg-surface-100 dark:bg-surface-800" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-28 animate-pulse rounded-2xl bg-surface-100 dark:bg-surface-800" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-surface-900 dark:text-white">Dashboard</h1>
        <p className="text-sm text-surface-500 dark:text-surface-400">
          Welcome back, {user?.name ?? 'Admin'}
        </p>
      </div>

      {error && (
        <div className="rounded-xl border border-danger/20 bg-danger/5 p-4 text-sm text-danger">
          {error}
        </div>
      )}

      {stats && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard title="Total Accounts" value={String(stats.total_accounts ?? 0)} icon="accounts" />
          <StatCard title="Active Devices" value={String(stats.active_devices ?? 0)} icon="devices" />
          <StatCard title="Total Sent" value={String(stats.total_sent ?? 0)} icon="sent" />
          <StatCard title="Total Delivered" value={String(stats.total_delivered ?? 0)} icon="delivered" />
          <StatCard title="Failed" value={String(stats.total_failed ?? 0)} icon="failed" />
          <StatCard title="Avg Confidence" value={`${Number(stats.avg_confidence ?? 0).toFixed(2)}`} icon="confidence" />
          <StatCard title="Active Circuits" value={String(stats.active_circuits ?? 0)} icon="circuits" />
          <StatCard title="Pending Fraud" value={String(stats.pending_fraud ?? 0)} icon="fraud" />
        </div>
      )}
    </div>
  )
}

const iconMap: Record<string, { bg: string; color: string; svg: string }> = {
  accounts: {
    bg: 'bg-primary-100 dark:bg-primary-500/15',
    color: 'text-primary-600 dark:text-primary-400',
    svg: 'M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z',
  },
  devices: {
    bg: 'bg-success/10 dark:bg-success/15',
    color: 'text-success dark:text-success',
    svg: 'M10.5 1.5H8.25A2.25 2.25 0 006 3.75v16.5a2.25 2.25 0 002.25 2.25h7.5A2.25 2.25 0 0018 20.25V3.75a2.25 2.25 0 00-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 18.75h3',
  },
  sent: {
    bg: 'bg-info/10 dark:bg-info/15',
    color: 'text-info dark:text-info',
    svg: 'M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5',
  },
  delivered: {
    bg: 'bg-success/10 dark:bg-success/15',
    color: 'text-success dark:text-success',
    svg: 'M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
  },
  failed: {
    bg: 'bg-danger/10 dark:bg-danger/15',
    color: 'text-danger dark:text-danger',
    svg: 'M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z',
  },
  confidence: {
    bg: 'bg-warning/10 dark:bg-warning/15',
    color: 'text-warning dark:text-warning',
    svg: 'M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z',
  },
  circuits: {
    bg: 'bg-warning/10 dark:bg-warning/15',
    color: 'text-warning dark:text-warning',
    svg: 'M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z',
  },
  fraud: {
    bg: 'bg-danger/10 dark:bg-danger/15',
    color: 'text-danger dark:text-danger',
    svg: 'M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z',
  },
}

function StatCard({ title, value, icon }: { title: string; value: string; icon: string }) {
  const config = iconMap[icon] ?? iconMap.accounts
  return (
    <div className="group rounded-2xl border border-surface-100 bg-white p-5 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md dark:border-surface-700 dark:bg-surface-800">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-surface-500 dark:text-surface-400">{title}</p>
          <p className="mt-2 text-3xl font-bold text-surface-900 dark:text-white">{value}</p>
        </div>
        <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${config.bg} transition-transform duration-300 group-hover:scale-110`}>
          <svg className={`h-5 w-5 ${config.color}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d={config.svg} />
          </svg>
        </div>
      </div>
    </div>
  )
}
