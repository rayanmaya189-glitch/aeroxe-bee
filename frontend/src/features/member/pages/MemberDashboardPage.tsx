import { motion } from 'framer-motion'
import { PageTransition } from '@/components/ui/PageTransition'
import { useQuery } from '@tanstack/react-query'
import api from '@/services/api'
import type { ApiResponse } from '@/types/api'
import type { MemberDashboard } from '@/types/models'
import { Card, CardHeader, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { PageSkeleton } from '@/components/ui/Skeleton'
import { formatNumber } from '@/utils/format'
import { staggerContainer, fadeInUp, itemVariants } from '@/components/animations/variants'
import { Send, CheckCircle, XCircle, TrendingUp, LayoutDashboard } from 'lucide-react'

interface StatCardProps { title: string; value: string | number; subtitle?: string; icon: React.ReactNode; gradient: string }
function StatCard({ title, value, subtitle, icon, gradient }: StatCardProps) {
  return (
    <Card hover>
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-sm font-medium text-gray-400">{title}</p>
          <p className="text-2xl font-bold tracking-tight text-gray-100">{value}</p>
          {subtitle && <p className="text-xs text-gray-500">{subtitle}</p>}
        </div>
        <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${gradient} ring-1 ring-white/[0.06]`}>{icon}</div>
      </div>
    </Card>
  )
}

export function MemberDashboardPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['member-dashboard'],
    queryFn: async () => { const res = await api.get<ApiResponse<MemberDashboard>>('/member/dashboard'); return res.data.data! },
  })

  if (isLoading) return <PageTransition><PageSkeleton /></PageTransition>
  if (error) return <PageTransition><div className="rounded-2xl border border-red-500/20 bg-red-500/5 p-4 text-sm text-red-400">Failed to load dashboard data</div></PageTransition>
  if (!data) return null

  return (
    <PageTransition>
    <motion.div initial="hidden" animate="visible" variants={staggerContainer} className="space-y-8">
      <motion.div variants={fadeInUp}>
        <div className="relative overflow-hidden rounded-2xl border border-white/[0.06] bg-white/[0.02] p-8">
          <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-blue-600/10 blur-[80px]" />
          <div className="pointer-events-none absolute -left-8 bottom-0 h-32 w-32 rounded-full bg-cyan-600/10 blur-[60px]" />
          <div className="relative flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-600 shadow-lg shadow-blue-500/25">
              <LayoutDashboard className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-extrabold tracking-tight text-white lg:text-4xl">
                <span className="bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">Dashboard</span>
              </h1>
              <p className="mt-1 text-sm text-gray-400">Welcome back, {data.account.name}</p>
            </div>
          </div>
        </div>
      </motion.div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <motion.div variants={itemVariants}><StatCard title="Total sent" value={formatNumber(data.messages.total_sent)} icon={<Send className="h-5 w-5 text-cyan-400" />} gradient="bg-cyan-500/10" /></motion.div>
        <motion.div variants={itemVariants}><StatCard title="Delivered" value={formatNumber(data.messages.total_delivered)} icon={<CheckCircle className="h-5 w-5 text-emerald-400" />} gradient="bg-emerald-500/10" /></motion.div>
        <motion.div variants={itemVariants}><StatCard title="Failed" value={formatNumber(data.messages.total_failed)} icon={<XCircle className="h-5 w-5 text-red-400" />} gradient="bg-red-500/10" /></motion.div>
        <motion.div variants={itemVariants}><StatCard title="Delivery rate" value={`${data.messages.delivery_rate.toFixed(1)}%`} icon={<TrendingUp className="h-5 w-5 text-blue-400" />} gradient="bg-blue-500/10" /></motion.div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <motion.div variants={itemVariants}>
          <Card><CardHeader className="mb-3"><CardTitle>Devices</CardTitle></CardHeader>
            <p className="text-3xl font-bold text-gray-100">{data.devices.total}</p>
            <Badge variant="success" size="sm" className="mt-2">{data.devices.online} online</Badge>
          </Card>
        </motion.div>
        <motion.div variants={itemVariants}>
          <Card><CardHeader className="mb-3"><CardTitle>Daily usage</CardTitle></CardHeader>
            <p className="text-3xl font-bold text-gray-100">{formatNumber(data.usage.daily)}</p>
            {data.subscription && <p className="mt-2 text-sm text-gray-400">of {formatNumber(data.subscription.quota_daily)} quota</p>}
          </Card>
        </motion.div>
        <motion.div variants={itemVariants}>
          <Card><CardHeader className="mb-3"><CardTitle>Monthly usage</CardTitle></CardHeader>
            <p className="text-3xl font-bold text-gray-100">{formatNumber(data.usage.monthly)}</p>
            {data.subscription && <p className="mt-2 text-sm text-gray-400">of {formatNumber(data.subscription.quota_monthly)} quota</p>}
          </Card>
        </motion.div>
      </div>

      {data.subscription && (
        <motion.div variants={itemVariants}>
          <Card><CardHeader className="mb-4"><CardTitle>Subscription</CardTitle></CardHeader>
            <div className="grid gap-6 sm:grid-cols-4">
              <div><p className="text-xs font-medium text-gray-400">Plan</p><p className="mt-1 text-sm font-semibold capitalize text-gray-100">{data.subscription.plan_type}</p></div>
              <div><p className="text-xs font-medium text-gray-400">Status</p><p className="mt-1"><Badge variant={data.account.status === 'active' ? 'success' : 'warning'} size="sm">{data.account.status}</Badge></p></div>
              <div><p className="text-xs font-medium text-gray-400">Renewal</p><p className="mt-1 text-sm font-semibold text-gray-100">{new Date(data.subscription.renewal_date).toLocaleDateString()}</p></div>
              <div><p className="text-xs font-medium text-gray-400">Account</p><p className="mt-1 text-sm font-semibold text-gray-100">{data.account.email}</p></div>
            </div>
          </Card>
        </motion.div>
      )}
    </motion.div>
    </PageTransition>
  )
}
