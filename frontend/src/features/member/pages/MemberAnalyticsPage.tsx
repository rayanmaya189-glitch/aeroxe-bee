import { motion } from 'framer-motion'
import { PageTransition } from '@/components/ui/PageTransition'
import { useQuery } from '@tanstack/react-query'
import api from '@/services/api'
import type { ApiResponse } from '@/types/api'
import type { AnalyticsDaily } from '@/types/models'
import { Card, CardHeader, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { PageSkeleton } from '@/components/ui/Skeleton'
import { formatNumber } from '@/utils/format'
import { staggerContainer, fadeInUp, itemVariants } from '@/components/animations/variants'
import { BarChart3 } from 'lucide-react'

export function MemberAnalyticsPage() {
  const { data: analytics = [], isLoading, error } = useQuery({
    queryKey: ['member-analytics'],
    queryFn: async () => { const res = await api.get<ApiResponse<AnalyticsDaily[]>>('/member/analytics'); return res.data.data || [] },
  })

  if (isLoading) return <PageTransition><PageSkeleton /></PageTransition>
  if (error) return <PageTransition><div className="rounded-2xl border border-red-500/20 bg-red-500/5 p-4 text-sm text-red-400">Failed to load analytics</div></PageTransition>

  const totals = analytics.reduce((acc, day) => ({ sent: acc.sent + day.total_sent, delivered: acc.delivered + day.total_delivered, failed: acc.failed + day.total_failed }), { sent: 0, delivered: 0, failed: 0 })

  return (
    <PageTransition>
    <motion.div initial="hidden" animate="visible" variants={staggerContainer} className="space-y-8">
      <motion.div variants={fadeInUp}>
        <div className="relative overflow-hidden rounded-2xl border border-white/[0.06] bg-white/[0.02] p-8">
          <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-emerald-600/10 blur-[80px]" />
          <div className="pointer-events-none absolute -left-8 bottom-0 h-32 w-32 rounded-full bg-cyan-600/10 blur-[60px]" />
          <div className="relative flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-cyan-600 shadow-lg shadow-emerald-500/25">
              <BarChart3 className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-extrabold tracking-tight text-white lg:text-4xl">
                <span className="bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">Analytics</span>
              </h1>
              <p className="mt-1 text-sm text-gray-400">Your message delivery analytics</p>
            </div>
          </div>
        </div>
      </motion.div>

      <div className="grid gap-4 sm:grid-cols-3">
        <motion.div variants={itemVariants}><Card><p className="text-sm font-medium text-gray-400">Total sent</p><p className="mt-1 text-3xl font-bold text-gray-100">{formatNumber(totals.sent)}</p></Card></motion.div>
        <motion.div variants={itemVariants}><Card><p className="text-sm font-medium text-gray-400">Total delivered</p><p className="mt-1 text-3xl font-bold text-gray-100">{formatNumber(totals.delivered)}</p></Card></motion.div>
        <motion.div variants={itemVariants}><Card><p className="text-sm font-medium text-gray-400">Total failed</p><p className="mt-1 text-3xl font-bold text-gray-100">{formatNumber(totals.failed)}</p></Card></motion.div>
      </div>

      <motion.div variants={itemVariants}>
        <Card>
          <CardHeader className="mb-4"><CardTitle>Daily breakdown</CardTitle></CardHeader>
          {analytics.length === 0 ? (
            <p className="text-sm text-gray-500">No analytics data available yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-white/[0.06]">
                    {['Date', 'Sent', 'Delivered', 'Failed', 'Rate'].map((h) => <th key={h} className="pb-3 text-xs font-medium uppercase text-gray-500">{h}</th>)}
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.04]">
                  {analytics.slice(0, 30).map((day) => (
                    <tr key={day.id} className="hover:bg-white/[0.03]">
                      <td className="py-3 font-medium text-gray-100">{new Date(day.date).toLocaleDateString()}</td>
                      <td className="py-3 text-gray-400">{formatNumber(day.total_sent)}</td>
                      <td className="py-3 text-gray-400">{formatNumber(day.total_delivered)}</td>
                      <td className="py-3 text-gray-400">{formatNumber(day.total_failed)}</td>
                      <td className="py-3"><Badge variant={day.total_sent > 0 && (day.total_delivered / day.total_sent) > 0.9 ? 'success' : 'warning'} size="sm">{day.total_sent > 0 ? `${((day.total_delivered / day.total_sent) * 100).toFixed(1)}%` : '—'}</Badge></td>
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
