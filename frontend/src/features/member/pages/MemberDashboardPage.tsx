import { useQuery } from '@tanstack/react-query'
import api from '@/services/api'
import type { ApiResponse } from '@/types/api'
import type { MemberDashboard } from '@/types/models'
import { Card, CardHeader, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { PageSkeleton } from '@/components/ui/Skeleton'
import { formatNumber } from '@/utils/format'

interface StatCardProps {
  title: string
  value: string | number
  subtitle?: string
  icon: React.ReactNode
  color: string
}

function StatCard({ title, value, subtitle, icon, color }: StatCardProps) {
  return (
    <Card hover>
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{title}</p>
          <p className="text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-100">{value}</p>
          {subtitle && <p className="text-xs text-gray-400">{subtitle}</p>}
        </div>
        <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${color}`}>
          {icon}
        </div>
      </div>
    </Card>
  )
}

export function MemberDashboardPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['member-dashboard'],
    queryFn: async () => {
      const res = await api.get<ApiResponse<MemberDashboard>>('/member/dashboard')
      return res.data.data!
    },
  })

  if (isLoading) return <PageSkeleton />

  if (error) {
    return (
      <div className="rounded-lg border border-danger-200 bg-danger-50 p-4 text-sm text-danger-700 dark:border-danger-800/50 dark:bg-danger-900/20 dark:text-danger-300">
        Failed to load dashboard data
      </div>
    )
  }

  if (!data) return null

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-100">Dashboard</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Welcome back, {data.account.name}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total sent"
          value={formatNumber(data.messages.total_sent)}
          icon={<svg className="h-5 w-5 text-info-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" /></svg>}
          color="bg-info-50 dark:bg-info-900/20"
        />
        <StatCard
          title="Delivered"
          value={formatNumber(data.messages.total_delivered)}
          icon={<svg className="h-5 w-5 text-success-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>}
          color="bg-success-50 dark:bg-success-900/20"
        />
        <StatCard
          title="Failed"
          value={formatNumber(data.messages.total_failed)}
          icon={<svg className="h-5 w-5 text-danger-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126z" /></svg>}
          color="bg-danger-50 dark:bg-danger-900/20"
        />
        <StatCard
          title="Delivery rate"
          value={`${data.messages.delivery_rate.toFixed(1)}%`}
          icon={<svg className="h-5 w-5 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941" /></svg>}
          color="bg-primary-50 dark:bg-primary-900/20"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="mb-3">
            <CardTitle>Devices</CardTitle>
          </CardHeader>
          <p className="text-3xl font-bold text-gray-900 dark:text-gray-100">{data.devices.total}</p>
          <Badge variant="success" size="sm" className="mt-2">{data.devices.online} online</Badge>
        </Card>
        <Card>
          <CardHeader className="mb-3">
            <CardTitle>Daily usage</CardTitle>
          </CardHeader>
          <p className="text-3xl font-bold text-gray-900 dark:text-gray-100">{formatNumber(data.usage.daily)}</p>
          {data.subscription && (
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">of {formatNumber(data.subscription.quota_daily)} quota</p>
          )}
        </Card>
        <Card>
          <CardHeader className="mb-3">
            <CardTitle>Monthly usage</CardTitle>
          </CardHeader>
          <p className="text-3xl font-bold text-gray-900 dark:text-gray-100">{formatNumber(data.usage.monthly)}</p>
          {data.subscription && (
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">of {formatNumber(data.subscription.quota_monthly)} quota</p>
          )}
        </Card>
      </div>

      {data.subscription && (
        <Card>
          <CardHeader className="mb-4">
            <CardTitle>Subscription</CardTitle>
          </CardHeader>
          <div className="grid gap-6 sm:grid-cols-4">
            <div>
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Plan</p>
              <p className="mt-1 text-sm font-semibold capitalize text-gray-900 dark:text-gray-100">{data.subscription.plan_type}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Status</p>
              <p className="mt-1"><Badge variant={data.account.status === 'active' ? 'success' : 'warning'} size="sm">{data.account.status}</Badge></p>
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Renewal</p>
              <p className="mt-1 text-sm font-semibold text-gray-900 dark:text-gray-100">{new Date(data.subscription.renewal_date).toLocaleDateString()}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Account</p>
              <p className="mt-1 text-sm font-semibold text-gray-900 dark:text-gray-100">{data.account.email}</p>
            </div>
          </div>
        </Card>
      )}
    </div>
  )
}
