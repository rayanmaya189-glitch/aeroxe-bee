import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { PageTransition } from '@/components/ui/PageTransition'
import { getDashboardStats } from '@/services/dashboard'
import { Card, CardHeader, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { PageSkeleton } from '@/components/ui/Skeleton'
import { formatNumber } from '@/utils/format'
import { staggerContainer, fadeInUp, itemVariants, progressFill } from '@/components/animations/variants'
import {
  Users, Smartphone, Send, AlertTriangle,
  TrendingUp, TrendingDown, Activity, Shield,
} from 'lucide-react'

interface StatCardProps {
  title: string
  value: string | number
  change?: string
  trend?: 'up' | 'down'
  icon: React.ReactNode
  gradient: string
  glowColor: string
  index: number
}

function StatCard({ title, value, change, trend, icon, gradient, glowColor, index }: StatCardProps) {
  return (
    <motion.div
      custom={index}
      variants={{
        hidden: { opacity: 0, y: 24 },
        visible: (i: number) => ({
          opacity: 1,
          y: 0,
          transition: { delay: i * 0.08, duration: 0.5, ease: [0.22, 1, 0.36, 1] },
        }),
      }}
    >
      <div className="group relative overflow-hidden rounded-2xl border border-white/[0.06] bg-white/[0.03] p-5 transition-all duration-300 hover:border-white/[0.12] hover:bg-white/[0.05]">
        {/* Ambient glow */}
        <div className={`pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full ${glowColor} opacity-0 blur-3xl transition-opacity duration-500 group-hover:opacity-100`} />

        <div className="relative flex items-start justify-between">
          <div className="space-y-1.5">
            <p className="text-sm font-medium text-gray-400">{title}</p>
            <p className="text-2xl font-bold tracking-tight text-gray-100">{value}</p>
            {change && (
              <div className="flex items-center gap-1">
                {trend === 'up' ? (
                  <TrendingUp className="h-3.5 w-3.5 text-emerald-400" />
                ) : (
                  <TrendingDown className="h-3.5 w-3.5 text-red-400" />
                )}
                <span className={`text-xs font-medium ${trend === 'up' ? 'text-emerald-400' : 'text-red-400'}`}>
                  {change}
                </span>
                <span className="text-xs text-gray-500">vs last month</span>
              </div>
            )}
          </div>
          <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${gradient} ring-1 ring-white/[0.06]`}>
            {icon}
          </div>
        </div>
      </div>
    </motion.div>
  )
}

export function DashboardPage() {
  const { data: stats, isLoading, error } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: getDashboardStats,
  })

  if (isLoading) return <PageTransition><PageSkeleton /></PageTransition>

  if (error) {
    return (
      <PageTransition>
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-gray-100">Dashboard</h1>
          </div>
          <div className="rounded-2xl border border-red-500/20 bg-red-500/5 p-4 text-sm text-red-400">
            Failed to load dashboard data. Please try again.
          </div>
        </div>
      </PageTransition>
    )
  }

  const deliveryRate = stats?.total_sent
    ? ((stats.total_delivered / stats.total_sent) * 100)
    : 0

  return (
    <PageTransition>
    <motion.div
      initial="hidden"
      animate="visible"
      variants={staggerContainer}
      className="space-y-8"
    >
      {/* Hero header */}
      <motion.div variants={fadeInUp}>
        <div className="relative overflow-hidden rounded-2xl border border-white/[0.06] bg-white/[0.02] p-8">
          <div className="pointer-events-none absolute -right-20 -top-20 h-60 w-60 rounded-full bg-blue-600/10 blur-[80px]" />
          <div className="pointer-events-none absolute -left-10 bottom-0 h-40 w-40 rounded-full bg-purple-600/10 blur-[60px]" />
          <div className="relative">
            <h1 className="text-3xl font-extrabold tracking-tight text-white lg:text-4xl">
              Platform{' '}
              <span className="bg-gradient-to-r from-blue-400 via-purple-400 to-cyan-400 bg-clip-text text-transparent">
                Dashboard
              </span>
            </h1>
            <p className="mt-2 text-base text-gray-400">
              Overview of your platform activity and performance
            </p>
          </div>
        </div>
      </motion.div>

      {/* Stat cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total accounts"
          value={formatNumber(stats?.total_accounts ?? 0)}
          icon={<Users className="h-5 w-5 text-blue-400" />}
          gradient="bg-blue-500/10"
          glowColor="bg-blue-500/20"
          index={0}
        />
        <StatCard
          title="Active devices"
          value={formatNumber(stats?.active_devices ?? 0)}
          icon={<Smartphone className="h-5 w-5 text-emerald-400" />}
          gradient="bg-emerald-500/10"
          glowColor="bg-emerald-500/20"
          index={1}
        />
        <StatCard
          title="Total sent"
          value={formatNumber(stats?.total_sent ?? 0)}
          icon={<Send className="h-5 w-5 text-cyan-400" />}
          gradient="bg-cyan-500/10"
          glowColor="bg-cyan-500/20"
          index={2}
        />
        <StatCard
          title="Failed"
          value={formatNumber(stats?.total_failed ?? 0)}
          icon={<AlertTriangle className="h-5 w-5 text-red-400" />}
          gradient="bg-red-500/10"
          glowColor="bg-red-500/20"
          index={3}
        />
      </div>

      <motion.div variants={itemVariants} className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="mb-4">
            <CardTitle>Message volume</CardTitle>
            <Badge variant="primary" dot>Last 30 days</Badge>
          </CardHeader>
          <div className="flex h-64 items-center justify-center rounded-xl border border-dashed border-white/[0.08] bg-white/[0.02]">
            <p className="text-sm text-gray-500">Chart integration coming soon</p>
          </div>
        </Card>

        <Card>
          <CardHeader className="mb-4">
            <CardTitle>Platform health</CardTitle>
          </CardHeader>
          <div className="space-y-5">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-400">Delivery rate</span>
                <span className="text-sm font-semibold text-gray-200">
                  {stats?.total_sent ? `${deliveryRate.toFixed(1)}%` : '—'}
                </span>
              </div>
              <div className="h-2 rounded-full bg-white/[0.06]">
                <motion.div
                  custom={deliveryRate}
                  variants={progressFill}
                  initial="hidden"
                  animate="visible"
                  className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-green-400"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-400">Avg confidence</span>
                <span className="text-sm font-semibold text-gray-200">
                  {stats?.avg_confidence?.toFixed(2) ?? '—'}
                </span>
              </div>
              <div className="h-2 rounded-full bg-white/[0.06]">
                <motion.div
                  custom={(stats?.avg_confidence ?? 0) * 100}
                  variants={progressFill}
                  initial="hidden"
                  animate="visible"
                  className="h-full rounded-full bg-gradient-to-r from-blue-500 to-cyan-400"
                />
              </div>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-400">Active circuits</span>
              <div className="flex items-center gap-2">
                <Activity className="h-3.5 w-3.5 text-gray-500" />
                <span className="text-sm font-semibold text-gray-200">
                  {stats?.active_circuits ?? 0}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-400">Pending fraud</span>
              <div className="flex items-center gap-2">
                <Shield className="h-3.5 w-3.5 text-gray-500" />
                <Badge variant={stats?.pending_fraud ? 'warning' : 'success'} size="sm">
                  {stats?.pending_fraud ?? 0}
                </Badge>
              </div>
            </div>
          </div>
        </Card>
      </motion.div>
    </motion.div>
    </PageTransition>
  )
}
