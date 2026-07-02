import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { Card, CardTitle } from '@/components/ui/Card'
import { Skeleton } from '@/components/ui/Skeleton'
import { Badge } from '@/components/ui/Badge'
import { getDashboardStats, getDailyChartData, getActivityFeed } from '@/services/dashboard'
import { formatNumber, formatPercent, timeAgo } from '@/utils/format'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts'

function KPICard({
  title,
  value,
  change,
  icon,
  loading,
}: {
  title: string
  value: string
  change?: string
  icon: React.ReactNode
  loading?: boolean
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border bg-white p-6 shadow-sm transition-all hover:shadow-md dark:bg-surface-800 dark:border-surface-700"
    >
      {loading ? (
        <div className="space-y-3">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-3 w-20" />
        </div>
      ) : (
        <>
          <div className="mb-4 flex items-center justify-between">
            <p className="text-sm font-medium text-surface-500 dark:text-surface-400">{title}</p>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-50 text-primary-600 dark:bg-primary-500/10 dark:text-primary-400">
              {icon}
            </div>
          </div>
          <p className="text-2xl font-bold text-surface-900 dark:text-white">{value}</p>
          {change && (
            <p className="mt-1 text-xs text-surface-400 dark:text-surface-500">{change}</p>
          )}
        </>
      )}
    </motion.div>
  )
}

export function DashboardPage() {
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: getDashboardStats,
  })

  const { data: chartData, isLoading: chartLoading } = useQuery({
    queryKey: ['dashboard-charts'],
    queryFn: getDailyChartData,
  })

  const { data: activity, isLoading: activityLoading } = useQuery({
    queryKey: ['dashboard-activity'],
    queryFn: getActivityFeed,
  })

  const icons = {
    users: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
      </svg>
    ),
    messages: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" />
      </svg>
    ),
    delivery: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    devices: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 1.5H8.25A2.25 2.25 0 006 3.75v16.5a2.25 2.25 0 002.25 2.25h7.5A2.25 2.25 0 0018 20.25V3.75a2.25 2.25 0 00-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 18.75h3" />
      </svg>
    ),
    revenue: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-surface-900 dark:text-white">Dashboard</h1>
        <p className="text-sm text-surface-500 dark:text-surface-400">Overview of your SMS platform</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        <KPICard
          title="Total Users"
          value={stats ? formatNumber(stats.totalUsers) : '—'}
          change={stats ? `${stats.growthRate > 0 ? '+' : ''}${(stats.growthRate * 100).toFixed(1)}% this month` : undefined}
          icon={icons.users}
          loading={statsLoading}
        />
        <KPICard
          title="Messages Today"
          value={stats ? formatNumber(stats.messagesToday) : '—'}
          change={stats ? `${formatPercent(stats.deliveryRate)} delivery rate` : undefined}
          icon={icons.messages}
          loading={statsLoading}
        />
        <KPICard
          title="Delivered"
          value={stats ? formatNumber(stats.messagesDelivered) : '—'}
          change={stats ? `${formatNumber(stats.messagesFailed)} failed` : undefined}
          icon={icons.delivery}
          loading={statsLoading}
        />
        <KPICard
          title="Active Devices"
          value={stats ? formatNumber(stats.activeDevices) : '—'}
          icon={icons.devices}
          loading={statsLoading}
        />
        <KPICard
          title="Revenue"
          value={stats ? `$${formatNumber(stats.revenue)}` : '—'}
          icon={icons.revenue}
          loading={statsLoading}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardTitle>Messages (7 days)</CardTitle>
          {chartLoading ? (
            <Skeleton className="h-64 w-full" />
          ) : chartData?.messages ? (
            <div className="mt-4 h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData.messages}>
                  <defs>
                    <linearGradient id="msgGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="date" tick={{ fontSize: 12 }} stroke="#94a3b8" tickLine={false} />
                  <YAxis tick={{ fontSize: 12 }} stroke="#94a3b8" tickLine={false} axisLine={false} />
                  <Tooltip
                    contentStyle={{
                      borderRadius: '12px',
                      border: '1px solid #e2e8f0',
                      background: 'rgba(255,255,255,0.9)',
                      backdropFilter: 'blur(8px)',
                    }}
                  />
                  <Area type="monotone" dataKey="value" stroke="#3b82f6" fill="url(#msgGradient)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : null}
        </Card>

        <Card>
          <CardTitle>User Registrations (7 days)</CardTitle>
          {chartLoading ? (
            <Skeleton className="h-64 w-full" />
          ) : chartData?.users ? (
            <div className="mt-4 h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData.users}>
                  <XAxis dataKey="date" tick={{ fontSize: 12 }} stroke="#94a3b8" tickLine={false} />
                  <YAxis tick={{ fontSize: 12 }} stroke="#94a3b8" tickLine={false} axisLine={false} />
                  <Tooltip
                    contentStyle={{
                      borderRadius: '12px',
                      border: '1px solid #e2e8f0',
                      background: 'rgba(255,255,255,0.9)',
                      backdropFilter: 'blur(8px)',
                    }}
                  />
                  <Bar dataKey="value" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : null}
        </Card>
      </div>

      <Card>
        <CardTitle>Recent Activity</CardTitle>
        {activityLoading ? (
          <div className="space-y-4 mt-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex gap-3">
                <Skeleton className="h-8 w-8 rounded-full" />
                <div className="flex-1">
                  <Skeleton className="h-4 w-48 mb-1" />
                  <Skeleton className="h-3 w-32" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="mt-4 space-y-1">
            {activity?.map((item) => (
              <div
                key={item.id}
                className="flex items-start gap-3 rounded-xl p-3 transition-colors hover:bg-surface-50 dark:hover:bg-surface-700/50"
              >
                <div className={`
                  flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold
                  ${item.type === 'message' ? 'bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400' : ''}
                  ${item.type === 'user' ? 'bg-green-50 text-green-600 dark:bg-green-500/10 dark:text-green-400' : ''}
                  ${item.type === 'alert' ? 'bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400' : ''}
                  ${item.type === 'system' ? 'bg-purple-50 text-purple-600 dark:bg-purple-500/10 dark:text-purple-400' : ''}
                `}>
                  {item.action.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-surface-900 dark:text-surface-100">{item.description}</p>
                  <p className="text-xs text-surface-400 dark:text-surface-500">
                    {item.user && `${item.user} · `}{timeAgo(item.timestamp)}
                  </p>
                </div>
                <Badge variant={item.type === 'alert' ? 'warning' : item.type === 'system' ? 'info' : 'default'} size="sm">
                  {item.type}
                </Badge>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}
