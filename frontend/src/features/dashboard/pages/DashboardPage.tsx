import { useQuery } from '@tanstack/react-query'
import { getDashboardStats } from '@/services/dashboard'
import { Card, CardHeader, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { PageSkeleton } from '@/components/ui/Skeleton'
import { formatNumber } from '@/utils/format'

interface StatCardProps {
  title: string
  value: string | number
  change?: string
  trend?: 'up' | 'down'
  icon: React.ReactNode
  color: string
}

function StatCard({ title, value, change, trend, icon, color }: StatCardProps) {
  return (
    <Card hover className="relative overflow-hidden">
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{title}</p>
          <p className="text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-100">{value}</p>
          {change && (
            <div className="flex items-center gap-1">
              <span className={`text-xs font-medium ${trend === 'up' ? 'text-success-600' : 'text-danger-600'}`}>
                {trend === 'up' ? '↑' : '↓'} {change}
              </span>
              <span className="text-xs text-gray-400">vs last month</span>
            </div>
          )}
        </div>
        <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${color}`}>
          {icon}
        </div>
      </div>
    </Card>
  )
}

export function DashboardPage() {
  const { data: stats, isLoading, error } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: getDashboardStats,
  })

  if (isLoading) return <PageSkeleton />

  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-100">Dashboard</h1>
        </div>
        <div className="rounded-lg border border-danger-200 bg-danger-50 p-4 text-sm text-danger-700 dark:border-danger-800/50 dark:bg-danger-900/20 dark:text-danger-300">
          Failed to load dashboard data. Please try again.
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-100">Dashboard</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Overview of your platform activity and performance
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total accounts"
          value={formatNumber(stats?.total_accounts ?? 0)}
          icon={<svg className="h-5 w-5 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" /></svg>}
          color="bg-primary-50 dark:bg-primary-900/20"
        />
        <StatCard
          title="Active devices"
          value={formatNumber(stats?.active_devices ?? 0)}
          icon={<svg className="h-5 w-5 text-success-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M10.5 1.5H8.25A2.25 2.25 0 006 3.75v16.5a2.25 2.25 0 002.25 2.25h7.5A2.25 2.25 0 0018 20.25V3.75a2.25 2.25 0 00-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3" /></svg>}
          color="bg-success-50 dark:bg-success-900/20"
        />
        <StatCard
          title="Total sent"
          value={formatNumber(stats?.total_sent ?? 0)}
          icon={<svg className="h-5 w-5 text-info-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" /></svg>}
          color="bg-info-50 dark:bg-info-900/20"
        />
        <StatCard
          title="Failed"
          value={formatNumber(stats?.total_failed ?? 0)}
          icon={<svg className="h-5 w-5 text-danger-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" /></svg>}
          color="bg-danger-50 dark:bg-danger-900/20"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="mb-4">
            <CardTitle>Message volume</CardTitle>
            <Badge variant="primary" dot>Last 30 days</Badge>
          </CardHeader>
          <div className="flex h-64 items-center justify-center rounded-lg border border-dashed border-gray-200 dark:border-gray-800">
            <p className="text-sm text-gray-400">Chart integration coming soon</p>
          </div>
        </Card>

        <Card>
          <CardHeader className="mb-4">
            <CardTitle>Platform health</CardTitle>
          </CardHeader>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500 dark:text-gray-400">Delivery rate</span>
              <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                {stats?.total_sent ? `${((stats.total_delivered / stats.total_sent) * 100).toFixed(1)}%` : '—'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500 dark:text-gray-400">Avg confidence</span>
              <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                {stats?.avg_confidence?.toFixed(2) ?? '—'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500 dark:text-gray-400">Active circuits</span>
              <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                {stats?.active_circuits ?? 0}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500 dark:text-gray-400">Pending fraud</span>
              <Badge variant={stats?.pending_fraud ? 'warning' : 'success'} size="sm">
                {stats?.pending_fraud ?? 0}
              </Badge>
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
}
