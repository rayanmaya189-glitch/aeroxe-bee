import { useState, useEffect, useCallback } from 'react'
import { useAuthStore } from '@/store/authStore'
import { getUsers, createUser, updateUser, deleteUser, bulkDeleteUsers } from '@/services/dashboard'
import type { User } from '@/types/models'

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
      <div className="space-y-6 p-6">
        <div className="h-8 w-48 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-32 animate-pulse rounded-2xl bg-gray-200 dark:bg-gray-700" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Welcome back, {user?.name ?? 'Admin'}
        </p>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 p-4 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">
          {error}
        </div>
      )}

      {stats && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard title="Total Accounts" value={String(stats.total_accounts ?? 0)} color="blue" />
          <StatCard title="Active Devices" value={String(stats.active_devices ?? 0)} color="green" />
          <StatCard title="Total Sent" value={String(stats.total_sent ?? 0)} color="purple" />
          <StatCard title="Total Delivered" value={String(stats.total_delivered ?? 0)} color="emerald" />
          <StatCard title="Failed" value={String(stats.total_failed ?? 0)} color="red" />
          <StatCard title="Avg Confidence" value={`${Number(stats.avg_confidence ?? 0).toFixed(2)}`} color="yellow" />
          <StatCard title="Active Circuits" value={String(stats.active_circuits ?? 0)} color="orange" />
          <StatCard title="Pending Fraud" value={String(stats.pending_fraud ?? 0)} color="red" />
        </div>
      )}
    </div>
  )
}

function StatCard({ title, value, color }: { title: string; value: string; color: string }) {
  const colorClasses: Record<string, string> = {
    blue: 'border-blue-500 bg-blue-50 dark:bg-blue-900/20',
    green: 'border-green-500 bg-green-50 dark:bg-green-900/20',
    purple: 'border-purple-500 bg-purple-50 dark:bg-purple-900/20',
    emerald: 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20',
    red: 'border-red-500 bg-red-50 dark:bg-red-900/20',
    yellow: 'border-yellow-500 bg-yellow-50 dark:bg-yellow-900/20',
    orange: 'border-orange-500 bg-orange-50 dark:bg-orange-900/20',
  }
  return (
    <div className={`rounded-2xl border-l-4 p-5 shadow-sm ${colorClasses[color] ?? colorClasses.blue}`}>
      <p className="text-sm font-medium text-gray-600 dark:text-gray-400">{title}</p>
      <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">{value}</p>
    </div>
  )
}
