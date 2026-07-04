import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { PageTransition } from '@/components/ui/PageTransition'
import { getBIDashboard } from '@/services/dashboard'
import type { BIDashboard } from '@/types/models'
import { Card, CardHeader, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { PageSkeleton } from '@/components/ui/Skeleton'
import { EmptyState } from '@/components/ui/EmptyState'
import { formatNumber } from '@/utils/format'
import { staggerContainer, fadeInUp, itemVariants } from '@/components/animations/variants'
import {
  BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts'
import {
  TrendingUp, Users, Smartphone, Send, DollarSign,
  Route, Clock, Target,
} from 'lucide-react'

const CHART_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899']

function ChartTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number; name: string; color: string }>; label?: string }) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-xl border border-white/[0.08] bg-[#0f1525]/95 px-4 py-3 shadow-2xl shadow-black/50 backdrop-blur-xl">
      {label && <p className="mb-2 text-xs font-medium text-gray-400">{label}</p>}
      {payload.map((entry, i) => (
        <div key={i} className="flex items-center gap-2 text-sm">
          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: entry.color }} />
          <span className="text-gray-400">{entry.name}</span>
          <span className="ml-auto font-semibold text-gray-100">{formatNumber(entry.value)}</span>
        </div>
      ))}
    </div>
  )
}

function formatHour(h: number) { return `${h.toString().padStart(2, '0')}:00` }
function formatShortDate(d: string) { return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) }

export function BIDashboardPage() {
  const { data: bi, isLoading, error } = useQuery({ queryKey: ['admin-bi'], queryFn: getBIDashboard })

  if (isLoading) return <PageTransition><PageSkeleton /></PageTransition>

  if (error) {
    return (
      <PageTransition>
        <div className="space-y-6">
          <h1 className="text-2xl font-bold tracking-tight text-gray-100">BI Dashboard</h1>
          <div className="rounded-2xl border border-red-500/20 bg-red-500/5 p-4 text-sm text-red-400">Failed to load BI data.</div>
        </div>
      </PageTransition>
    )
  }

  const data = bi as BIDashboard
  const deliveryRate = data.total_messages > 0 ? (data.total_delivered / data.total_messages * 100) : 0
  const typeData = (data.type_breakdown ?? []).map((t) => ({ name: t.type, value: t.count }))
  const hourlyData = (data.hourly_distribution ?? []).map((h) => ({ hour: formatHour(h.hour), messages: h.count }))
  const growthData = (data.account_growth ?? []).map((g) => ({ date: formatShortDate(g.date), accounts: g.count }))
  const revenueData = (data.revenue_by_plan ?? []).map((r) => ({ name: r.plan_name, revenue: r.revenue, subscribers: r.count }))

  return (
    <PageTransition>
    <motion.div initial="hidden" animate="visible" variants={staggerContainer} className="space-y-8">
      {/* Hero header */}
      <motion.div variants={fadeInUp}>
        <div className="relative overflow-hidden rounded-2xl border border-white/[0.06] bg-white/[0.02] p-8">
          <div className="pointer-events-none absolute -right-20 -top-20 h-60 w-60 rounded-full bg-purple-600/10 blur-[80px]" />
          <div className="pointer-events-none absolute -left-10 bottom-0 h-40 w-40 rounded-full bg-blue-600/10 blur-[60px]" />
          <div className="relative flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-500 to-blue-600 shadow-lg shadow-purple-500/25">
              <Target className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-extrabold tracking-tight text-white lg:text-4xl">
                <span className="bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">BI Dashboard</span>
              </h1>
              <p className="mt-1 text-sm text-gray-400">Business intelligence & platform analytics</p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Primary stat cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { title: 'Total accounts', value: formatNumber(data.total_accounts), sub: `${data.active_accounts} active`, icon: <Users className="h-5 w-5 text-blue-400" />, gradient: 'bg-blue-500/10' },
          { title: 'Total devices', value: formatNumber(data.total_devices), sub: `${data.online_devices} online`, icon: <Smartphone className="h-5 w-5 text-emerald-400" />, gradient: 'bg-emerald-500/10' },
          { title: 'Total messages', value: formatNumber(data.total_messages), sub: `${deliveryRate.toFixed(1)}% delivered`, icon: <Send className="h-5 w-5 text-cyan-400" />, gradient: 'bg-cyan-500/10' },
          { title: 'Monthly revenue', value: `$${formatNumber(data.total_revenue)}`, sub: 'Active subscriptions', icon: <DollarSign className="h-5 w-5 text-amber-400" />, gradient: 'bg-amber-500/10' },
        ].map((stat, i) => (
          <motion.div key={stat.title} custom={i} variants={itemVariants}>
            <Card hover glow={`${stat.gradient.replace('/10', '/20')}`}>
              <div className="flex items-start justify-between">
                <div className="space-y-1.5">
                  <p className="text-sm font-medium text-gray-400">{stat.title}</p>
                  <p className="text-2xl font-bold tracking-tight text-gray-100">{stat.value}</p>
                  <p className="text-xs text-gray-500">{stat.sub}</p>
                </div>
                <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${stat.gradient} ring-1 ring-white/[0.06]`}>{stat.icon}</div>
              </div>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Charts row 1: Account growth + Message type distribution */}
      <div className="grid gap-4 lg:grid-cols-3">
        <motion.div variants={fadeInUp} className="lg:col-span-2">
          <Card className="h-full">
            <CardHeader className="mb-4"><CardTitle>Account growth (30 days)</CardTitle></CardHeader>
            {growthData.length > 0 ? (
              <div className="h-64"><ResponsiveContainer width="100%" height="100%">
                <BarChart data={growthData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#6b7280' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#6b7280' }} axisLine={false} tickLine={false} width={40} />
                  <Tooltip content={<ChartTooltip />} />
                  <Bar dataKey="accounts" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer></div>
            ) : <EmptyState title="No data" description="No account growth data yet." />}
          </Card>
        </motion.div>
        <motion.div variants={fadeInUp}>
          <Card className="h-full">
            <CardHeader className="mb-4"><CardTitle>Message types (30d)</CardTitle></CardHeader>
            {typeData.length > 0 ? (
              <div className="h-64"><ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={typeData} cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={3} dataKey="value">
                    {typeData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                  </Pie>
                  <Tooltip content={<ChartTooltip />} />
                  <Legend iconType="circle" iconSize={8} formatter={(v: string) => <span className="text-xs text-gray-400 capitalize">{v}</span>} />
                </PieChart>
              </ResponsiveContainer></div>
            ) : <EmptyState title="No data" description="No message type data yet." />}
          </Card>
        </motion.div>
      </div>

      {/* Charts row 2: Hourly distribution + Routing breakdown */}
      <div className="grid gap-4 lg:grid-cols-2">
        <motion.div variants={fadeInUp}>
          <Card className="h-full">
            <CardHeader className="mb-4"><CardTitle><Clock className="mr-2 inline h-4 w-4" />Hourly distribution (7d)</CardTitle></CardHeader>
            {hourlyData.length > 0 ? (
              <div className="h-64"><ResponsiveContainer width="100%" height="100%">
                <BarChart data={hourlyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                  <XAxis dataKey="hour" tick={{ fontSize: 10, fill: '#6b7280' }} axisLine={false} tickLine={false} interval={2} />
                  <YAxis tick={{ fontSize: 11, fill: '#6b7280' }} axisLine={false} tickLine={false} width={40} />
                  <Tooltip content={<ChartTooltip />} />
                  <Bar dataKey="messages" fill="#8b5cf6" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer></div>
            ) : <EmptyState title="No data" description="No hourly data yet." />}
          </Card>
        </motion.div>
        <motion.div variants={fadeInUp}>
          <Card className="h-full">
            <CardHeader className="mb-4"><CardTitle><Route className="mr-2 inline h-4 w-4" />Routing strategies</CardTitle></CardHeader>
            {(data.routing_breakdown ?? []).length > 0 ? (
              <div className="space-y-3 pt-2">
                {(data.routing_breakdown ?? []).map((r, i) => {
                  const total = data.routing_breakdown.reduce((s, x) => s + x.count, 0)
                  const pct = total > 0 ? (r.count / total * 100) : 0
                  return (
                    <div key={r.strategy}>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-xs font-medium text-gray-300 capitalize">{r.strategy.replace(/_/g, ' ')}</span>
                        <span className="text-xs text-gray-500">{formatNumber(r.count)} ({pct.toFixed(1)}%)</span>
                      </div>
                      <div className="h-2 rounded-full bg-white/[0.06]">
                        <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 1, delay: i * 0.1, ease: [0.22, 1, 0.36, 1] }}
                          className="h-full rounded-full" style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : <EmptyState title="No data" description="No routing data yet." />}
          </Card>
        </motion.div>
      </div>

      {/* Charts row 3: Top accounts + Revenue by plan */}
      <div className="grid gap-4 lg:grid-cols-2">
        <motion.div variants={fadeInUp}>
          <Card>
            <CardHeader className="mb-4"><CardTitle><TrendingUp className="mr-2 inline h-4 w-4" />Top accounts by volume</CardTitle></CardHeader>
            {(data.top_accounts ?? []).length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="border-b border-white/[0.06]">
                    {['Account', 'Sent', 'Delivered', 'Failed'].map((h) => <th key={h} className="pb-3 text-left text-xs font-medium uppercase text-gray-500">{h}</th>)}
                  </tr></thead>
                  <tbody className="divide-y divide-white/[0.04]">
                    {data.top_accounts.map((a) => (
                      <tr key={a.account_id} className="hover:bg-white/[0.03] transition-colors">
                        <td className="py-3 font-medium text-gray-100">{a.account_name || a.account_id.slice(0, 8)}</td>
                        <td className="py-3 text-gray-400">{formatNumber(a.total_sent)}</td>
                        <td className="py-3 text-emerald-400">{formatNumber(a.delivered)}</td>
                        <td className="py-3 text-red-400">{formatNumber(a.failed)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : <EmptyState title="No data" description="No account data yet." />}
          </Card>
        </motion.div>
        <motion.div variants={fadeInUp}>
          <Card className="h-full">
            <CardHeader className="mb-4"><CardTitle>Revenue by plan</CardTitle></CardHeader>
            {revenueData.length > 0 ? (
              <div className="h-64"><ResponsiveContainer width="100%" height="100%">
                <BarChart data={revenueData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 11, fill: '#6b7280' }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${v}`} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: '#6b7280' }} axisLine={false} tickLine={false} width={90} />
                  <Tooltip content={<ChartTooltip />} />
                  <Bar dataKey="revenue" fill="#10b981" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer></div>
            ) : <EmptyState title="No data" description="No revenue data yet." />}
          </Card>
        </motion.div>
      </div>

      {/* Device fleet status */}
      <motion.div variants={fadeInUp}>
        <Card>
          <CardHeader className="mb-4"><CardTitle><Smartphone className="mr-2 inline h-4 w-4" />Device fleet status</CardTitle></CardHeader>
          <div className="flex flex-wrap gap-3">
            {(data.device_fleet ?? []).map((f, i) => (
              <div key={f.status} className="flex items-center gap-3 rounded-xl border border-white/[0.06] bg-white/[0.03] px-5 py-3">
                <div className="h-3 w-3 rounded-full" style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }} />
                <span className="text-sm font-medium text-gray-300">{f.status}</span>
                <Badge variant={f.status === 'ONLINE' ? 'success' : f.status === 'OFFLINE' ? 'danger' : 'warning'} size="sm">{f.count}</Badge>
              </div>
            ))}
            {(!data.device_fleet || data.device_fleet.length === 0) && <EmptyState title="No devices" description="No device data yet." />}
          </div>
        </Card>
      </motion.div>
    </motion.div>
    </PageTransition>
  )
}
