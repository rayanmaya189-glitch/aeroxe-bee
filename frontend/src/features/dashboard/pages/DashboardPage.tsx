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
          <div className="h-8 w-48 animate-pulse rounded-lg glass-stat" />
          <div className="h-4 w-64 animate-pulse rounded glass-stat opacity-60" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-28 animate-pulse rounded-2xl glass-stat" />
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
          <StatCard title="Total Accounts" value={String(stats.total_accounts ?? 0)} color="honey" />
          <StatCard title="Active Devices" value={String(stats.active_devices ?? 0)} color="green" />
          <StatCard title="Total Sent" value={String(stats.total_sent ?? 0)} color="amber" />
          <StatCard title="Total Delivered" value={String(stats.total_delivered ?? 0)} color="green" />
          <StatCard title="Failed" value={String(stats.total_failed ?? 0)} color="red" />
          <StatCard title="Avg Confidence" value={`${Number(stats.avg_confidence ?? 0).toFixed(2)}`} color="amber" />
          <StatCard title="Active Circuits" value={String(stats.active_circuits ?? 0)} color="honey" />
          <StatCard title="Pending Fraud" value={String(stats.pending_fraud ?? 0)} color="red" />
        </div>
      )}
    </div>
  )
}

const iconMap: Record<string, { iconBg: string; iconColor: string; svg: string }> = {
  honey: {
    iconBg: 'bg-primary-400/20 dark:bg-primary-400/25',
    iconColor: 'text-primary-700 dark:text-primary-400',
    svg: 'M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z',
  },
  amber: {
    iconBg: 'bg-primary-400/20 dark:bg-primary-400/25',
    iconColor: 'text-primary-700 dark:text-primary-400',
    svg: 'M22.5 12c0-1.232-.046-2.453-.138-3.662a4.006 4.006 0 00-3.7-3.7 48.678 48.678 0 00-7.324 0 4.006 4.006 0 00-3.7 3.7c-.017.22-.032.441-.046.662M22.5 12l-3-3m3 3l-3 3m3-3H9m1.5-12a2.25 2.25 0 00-2.25 2.25v18a2.25 2.25 0 002.25 2.25h12A2.25 2.25 0 0021 19.5V5.25A2.25 2.25 0 0018.75 3H15',
  },
  green: {
    iconBg: 'bg-success/15 dark:bg-success/20',
    iconColor: 'text-success',
    svg: 'M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
  },
  red: {
    iconBg: 'bg-danger/15 dark:bg-danger/20',
    iconColor: 'text-danger',
    svg: 'M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z',
  },
}

function StatCard({ title, value, color }: { title: string; value: string; color: string }) {
  const c = iconMap[color] ?? iconMap.honey
  return (
    <div className="glass-stat group rounded-2xl p-5 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-surface-600 dark:text-surface-400">{title}</p>
          <p className="mt-2 text-3xl font-bold text-surface-900 dark:text-white">{value}</p>
        </div>
        <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${c.iconBg} transition-transform duration-300 group-hover:scale-110`}>
          <svg className={`h-5 w-5 ${c.iconColor}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d={c.svg} />
          </svg>
        </div>
      </div>
    </div>
  )
}
