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

const containerVariants = { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.06 } } }
const itemVariants = { hidden: { opacity: 0, y: 12 }, visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] } } }

export function MemberAnalyticsPage() {
  const { data: analytics = [], isLoading, error } = useQuery({
    queryKey: ['member-analytics'],
    queryFn: async () => { const res = await api.get<ApiResponse<AnalyticsDaily[]>>('/member/analytics'); return res.data.data || [] },
  })

  if (isLoading) return <PageTransition><PageSkeleton /></PageTransition>
  if (error) return <PageTransition><div className="rounded-lg border border-red-500/20 bg-red-500/5 p-4 text-sm text-red-400">Failed to load analytics</div></PageTransition>

  const totals = analytics.reduce((acc, day) => ({ sent: acc.sent + day.total_sent, delivered: acc.delivered + day.total_delivered, failed: acc.failed + day.total_failed }), { sent: 0, delivered: 0, failed: 0 })

  return (
    <PageTransition>
    <motion.div initial="hidden" animate="visible" variants={containerVariants} className="space-y-6">
      <motion.div variants={itemVariants}>
        <h1 className="text-2xl font-bold tracking-tight text-gray-100">Analytics</h1>
        <p className="mt-1 text-sm text-gray-400">Your message delivery analytics</p>
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
