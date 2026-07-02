import { useQuery } from '@tanstack/react-query'
import { Card, CardTitle } from '@/components/ui/Card'
import { Skeleton } from '@/components/ui/Skeleton'
import { getDailyChartData } from '@/services/dashboard'
import { formatNumber } from '@/utils/format'
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer, Legend,
} from 'recharts'

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899']

export function AnalyticsPage() {
  const { data: chartData, isLoading } = useQuery({
    queryKey: ['dashboard-charts'],
    queryFn: getDailyChartData,
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-surface-900 dark:text-white">Analytics</h1>
        <p className="text-sm text-surface-500 dark:text-surface-400">Detailed platform metrics and trends</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardTitle>Messages Over Time</CardTitle>
          {isLoading ? (
            <Skeleton className="mt-4 h-72 w-full" variant="rectangular" />
          ) : chartData?.messages ? (
            <div className="mt-4 h-72">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData.messages}>
                  <defs>
                    <linearGradient id="analyticsMsg" x1="0" y1="0" x2="0" y2="1">
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
                  <Area type="monotone" dataKey="value" stroke="#3b82f6" fill="url(#analyticsMsg)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="flex h-72 items-center justify-center text-sm text-surface-400">No message data available</div>
          )}
        </Card>

        <Card>
          <CardTitle>User Registrations</CardTitle>
          {isLoading ? (
            <Skeleton className="mt-4 h-72 w-full" variant="rectangular" />
          ) : chartData?.users ? (
            <div className="mt-4 h-72">
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
                  <Bar dataKey="value" fill="#10b981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="flex h-72 items-center justify-center text-sm text-surface-400">No user data available</div>
          )}
        </Card>

        <Card>
          <CardTitle>Revenue Distribution</CardTitle>
          {isLoading ? (
            <Skeleton className="mt-4 h-72 w-full" variant="rectangular" />
          ) : chartData?.revenue ? (
            <div className="mt-4 h-72">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartData.revenue}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={4}
                    dataKey="value"
                    nameKey="label"
                  >
                    {chartData.revenue.map((_, idx) => (
                      <Cell key={`cell-${idx}`} fill={COLORS[idx % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      borderRadius: '12px',
                      border: '1px solid #e2e8f0',
                      background: 'rgba(255,255,255,0.9)',
                      backdropFilter: 'blur(8px)',
                    }}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="flex h-72 items-center justify-center text-sm text-surface-400">No revenue data available</div>
          )}
        </Card>

        <Card>
          <CardTitle>Summary</CardTitle>
          <div className="mt-4 space-y-4">
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center justify-between">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-16" />
                </div>
              ))
            ) : chartData ? (
              <>
                {[
                  { label: 'Total Messages', value: chartData.messages?.reduce((s, d) => s + d.value, 0) ?? 0 },
                  { label: 'Total Users', value: chartData.users?.reduce((s, d) => s + d.value, 0) ?? 0 },
                  { label: 'Total Revenue', value: chartData.revenue?.reduce((s, d) => s + d.value, 0) ?? 0 },
                  { label: 'Avg Messages/Day', value: chartData.messages?.length ? Math.round(chartData.messages.reduce((s, d) => s + d.value, 0) / chartData.messages.length) : 0 },
                  { label: 'Data Points', value: chartData.messages?.length ?? 0 },
                ].map((item) => (
                  <div key={item.label} className="flex items-center justify-between border-b border-surface-100 pb-3 last:border-0 dark:border-surface-700">
                    <span className="text-sm text-surface-600 dark:text-surface-400">{item.label}</span>
                    <span className="text-sm font-semibold text-surface-900 dark:text-surface-100">{formatNumber(item.value)}</span>
                  </div>
                ))}
              </>
            ) : (
              <div className="text-sm text-surface-400">No data available</div>
            )}
          </div>
        </Card>
      </div>
    </div>
  )
}
