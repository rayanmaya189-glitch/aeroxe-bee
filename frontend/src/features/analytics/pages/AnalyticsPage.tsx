import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { PageTransition } from '@/components/ui/PageTransition'
import { getAnalytics } from '@/services/dashboard'
import type { AnalyticsDaily } from '@/types/models'
import { Card, CardHeader, CardTitle } from '@/components/ui/Card'
import { PageSkeleton } from '@/components/ui/Skeleton'
import { EmptyState } from '@/components/ui/EmptyState'
import { formatNumber } from '@/utils/format'
import { staggerContainer, fadeInUp, itemVariants, progressFill } from '@/components/animations/variants'
import { BarChart3, Send, CheckCircle, XCircle, Zap } from 'lucide-react'

export function AnalyticsPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['admin-analytics'] as const,
    queryFn: () => getAnalytics(),
  })

  if (isLoading) return <PageTransition><PageSkeleton /></PageTransition>

  if (error) {
    return (
      <PageTransition>
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-gray-100">Analytics</h1>
          </div>
          <div className="rounded-2xl border border-red-500/20 bg-red-500/5 p-4 text-sm text-red-400">
            Failed to load analytics data.
          </div>
        </div>
      </PageTransition>
    )
  }

  const analyticsData = data ?? []

  const totals = (Array.isArray(analyticsData) ? analyticsData : []).reduce(
    (acc: { sent: number; delivered: number; failed: number; otp: number; transactional: number; marketing: number }, day: AnalyticsDaily) => ({
      sent: acc.sent + day.total_sent,
      delivered: acc.delivered + day.total_delivered,
      failed: acc.failed + day.total_failed,
      otp: acc.otp + day.otp_sent,
      transactional: acc.transactional + day.transactional_sent,
      marketing: acc.marketing + day.marketing_sent,
    }),
    { sent: 0, delivered: 0, failed: 0, otp: 0, transactional: 0, marketing: 0 },
  )

  const deliveryRate = totals.sent > 0 ? (totals.delivered / totals.sent) * 100 : 0
  const failRate = totals.sent > 0 ? (totals.failed / totals.sent) * 100 : 0

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
          <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-cyan-600/10 blur-[80px]" />
          <div className="pointer-events-none absolute -left-8 bottom-0 h-32 w-32 rounded-full bg-green-600/10 blur-[60px]" />
          <div className="relative flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-500 to-green-600 shadow-lg shadow-cyan-500/25">
              <BarChart3 className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-extrabold tracking-tight text-white lg:text-4xl">
                <span className="bg-gradient-to-r from-cyan-400 to-green-400 bg-clip-text text-transparent">Analytics</span>
              </h1>
              <p className="mt-1 text-sm text-gray-400">Platform-wide message analytics</p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Primary stat cards with animated progress */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <motion.div variants={itemVariants}>
          <Card hover glow="bg-blue-500/20">
            <div className="flex items-start justify-between">
              <div className="space-y-1.5">
                <p className="text-sm font-medium text-gray-400">Total sent</p>
                <p className="text-3xl font-bold tracking-tight text-gray-100">{formatNumber(totals.sent)}</p>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10 ring-1 ring-blue-500/20">
                <Send className="h-5 w-5 text-blue-400" />
              </div>
            </div>
          </Card>
        </motion.div>
        <motion.div variants={itemVariants}>
          <Card hover glow="bg-emerald-500/20">
            <div className="flex items-start justify-between">
              <div className="space-y-1.5">
                <p className="text-sm font-medium text-gray-400">Delivered</p>
                <p className="text-3xl font-bold tracking-tight text-gray-100">{formatNumber(totals.delivered)}</p>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 ring-1 ring-emerald-500/20">
                <CheckCircle className="h-5 w-5 text-emerald-400" />
              </div>
            </div>
            <div className="mt-3">
              <div className="h-1.5 rounded-full bg-white/[0.06]">
                <motion.div
                  custom={deliveryRate}
                  variants={progressFill}
                  initial="hidden"
                  animate="visible"
                  className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-green-400"
                />
              </div>
              <p className="mt-1 text-xs text-gray-500">{deliveryRate.toFixed(1)}% delivery rate</p>
            </div>
          </Card>
        </motion.div>
        <motion.div variants={itemVariants}>
          <Card hover glow="bg-red-500/20">
            <div className="flex items-start justify-between">
              <div className="space-y-1.5">
                <p className="text-sm font-medium text-gray-400">Failed</p>
                <p className="text-3xl font-bold tracking-tight text-gray-100">{formatNumber(totals.failed)}</p>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-500/10 ring-1 ring-red-500/20">
                <XCircle className="h-5 w-5 text-red-400" />
              </div>
            </div>
            <div className="mt-3">
              <div className="h-1.5 rounded-full bg-white/[0.06]">
                <motion.div
                  custom={failRate}
                  variants={progressFill}
                  initial="hidden"
                  animate="visible"
                  className="h-full rounded-full bg-gradient-to-r from-red-500 to-rose-400"
                />
              </div>
              <p className="mt-1 text-xs text-gray-500">{failRate.toFixed(1)}% failure rate</p>
            </div>
          </Card>
        </motion.div>
        <motion.div variants={itemVariants}>
          <Card hover glow="bg-purple-500/20">
            <div className="flex items-start justify-between">
              <div className="space-y-1.5">
                <p className="text-sm font-medium text-gray-400">Delivery rate</p>
                <p className="text-3xl font-bold tracking-tight text-gray-100">
                  {totals.sent > 0 ? `${deliveryRate.toFixed(1)}%` : '—'}
                </p>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-500/10 ring-1 ring-purple-500/20">
                <Zap className="h-5 w-5 text-purple-400" />
              </div>
            </div>
          </Card>
        </motion.div>
      </div>

      {/* Category breakdown */}
      <div className="grid gap-4 sm:grid-cols-3">
        <motion.div variants={itemVariants}>
          <Card hover glow="bg-orange-500/20">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-gray-400">OTP messages</p>
                <p className="mt-1 text-2xl font-bold text-gray-100">{formatNumber(totals.otp)}</p>
              </div>
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-orange-500/10 ring-1 ring-orange-500/20">
                <span className="text-sm font-bold text-orange-400">OTP</span>
              </div>
            </div>
          </Card>
        </motion.div>
        <motion.div variants={itemVariants}>
          <Card hover glow="bg-blue-500/20">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-gray-400">Transactional</p>
                <p className="mt-1 text-2xl font-bold text-gray-100">{formatNumber(totals.transactional)}</p>
              </div>
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-500/10 ring-1 ring-blue-500/20">
                <span className="text-sm font-bold text-blue-400">TX</span>
              </div>
            </div>
          </Card>
        </motion.div>
        <motion.div variants={itemVariants}>
          <Card hover glow="bg-cyan-500/20">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-gray-400">Marketing</p>
                <p className="mt-1 text-2xl font-bold text-gray-100">{formatNumber(totals.marketing)}</p>
              </div>
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-cyan-500/10 ring-1 ring-cyan-500/20">
                <span className="text-sm font-bold text-cyan-400">MK</span>
              </div>
            </div>
          </Card>
        </motion.div>
      </div>

      {/* Daily breakdown table */}
      <motion.div variants={itemVariants}>
        <Card>
          <CardHeader className="mb-4"><CardTitle>Daily breakdown</CardTitle></CardHeader>
          {analyticsData.length === 0 ? (
            <EmptyState title="No data yet" description="Analytics data will appear here once messages are sent." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-white/[0.06]">
                    {['Date', 'Sent', 'Delivered', 'Failed', 'OTP', 'Transactional', 'Marketing'].map((h) => (
                      <th key={h} className="pb-3 text-xs font-medium uppercase text-gray-500">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.04]">
                  {analyticsData.slice(0, 30).map((day: AnalyticsDaily) => (
                    <tr key={day.id} className="transition-colors hover:bg-white/[0.03]">
                      <td className="py-3 font-medium text-gray-100">{new Date(day.date).toLocaleDateString()}</td>
                      <td className="py-3 text-gray-400">{formatNumber(day.total_sent)}</td>
                      <td className="py-3 text-gray-400">{formatNumber(day.total_delivered)}</td>
                      <td className="py-3 text-gray-400">{formatNumber(day.total_failed)}</td>
                      <td className="py-3 text-gray-400">{formatNumber(day.otp_sent)}</td>
                      <td className="py-3 text-gray-400">{formatNumber(day.transactional_sent)}</td>
                      <td className="py-3 text-gray-400">{formatNumber(day.marketing_sent)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </motion.div>
    </motion.div>
    </PageTransition>
  )
}
