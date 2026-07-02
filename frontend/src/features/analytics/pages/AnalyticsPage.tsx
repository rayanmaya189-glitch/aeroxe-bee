import { useState, useEffect } from 'react'
import { getAnalytics } from '@/services/dashboard'
import type { AnalyticsDaily } from '@/types/models'
import { Card, CardHeader, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { PageSkeleton } from '@/components/ui/Skeleton'
import { EmptyState } from '@/components/ui/EmptyState'
import { formatNumber } from '@/utils/format'

export function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsDaily[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getAnalytics()
      .then((d) => setData(d))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <PageSkeleton />

  const totals = data.reduce(
    (acc, day) => ({
      sent: acc.sent + day.total_sent,
      delivered: acc.delivered + day.total_delivered,
      failed: acc.failed + day.total_failed,
      otp: acc.otp + day.otp_sent,
      transactional: acc.transactional + day.transactional_sent,
      marketing: acc.marketing + day.marketing_sent,
    }),
    { sent: 0, delivered: 0, failed: 0, otp: 0, transactional: 0, marketing: 0 },
  )

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-100">Analytics</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Platform-wide message analytics</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Total sent</p>
          <p className="mt-1 text-3xl font-bold text-gray-900 dark:text-gray-100">{formatNumber(totals.sent)}</p>
        </Card>
        <Card>
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Delivered</p>
          <p className="mt-1 text-3xl font-bold text-gray-900 dark:text-gray-100">{formatNumber(totals.delivered)}</p>
        </Card>
        <Card>
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Failed</p>
          <p className="mt-1 text-3xl font-bold text-gray-900 dark:text-gray-100">{formatNumber(totals.failed)}</p>
        </Card>
        <Card>
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Delivery rate</p>
          <p className="mt-1 text-3xl font-bold text-gray-900 dark:text-gray-100">
            {totals.sent > 0 ? `${((totals.delivered / totals.sent) * 100).toFixed(1)}%` : '—'}
          </p>
        </Card>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">OTP messages</p>
          <p className="mt-1 text-2xl font-bold text-gray-900 dark:text-gray-100">{formatNumber(totals.otp)}</p>
        </Card>
        <Card>
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Transactional</p>
          <p className="mt-1 text-2xl font-bold text-gray-900 dark:text-gray-100">{formatNumber(totals.transactional)}</p>
        </Card>
        <Card>
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Marketing</p>
          <p className="mt-1 text-2xl font-bold text-gray-900 dark:text-gray-100">{formatNumber(totals.marketing)}</p>
        </Card>
      </div>

      <Card>
        <CardHeader className="mb-4">
          <CardTitle>Daily breakdown</CardTitle>
        </CardHeader>
        {data.length === 0 ? (
          <EmptyState title="No data yet" description="Analytics data will appear here once messages are sent." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-800">
                  <th className="pb-3 text-xs font-medium uppercase text-gray-500 dark:text-gray-400">Date</th>
                  <th className="pb-3 text-xs font-medium uppercase text-gray-500 dark:text-gray-400">Sent</th>
                  <th className="pb-3 text-xs font-medium uppercase text-gray-500 dark:text-gray-400">Delivered</th>
                  <th className="pb-3 text-xs font-medium uppercase text-gray-500 dark:text-gray-400">Failed</th>
                  <th className="pb-3 text-xs font-medium uppercase text-gray-500 dark:text-gray-400">OTP</th>
                  <th className="pb-3 text-xs font-medium uppercase text-gray-500 dark:text-gray-400">Transactional</th>
                  <th className="pb-3 text-xs font-medium uppercase text-gray-500 dark:text-gray-400">Marketing</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800/50">
                {data.slice(0, 30).map((day) => (
                  <tr key={day.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/30">
                    <td className="py-3 font-medium text-gray-900 dark:text-gray-100">{new Date(day.date).toLocaleDateString()}</td>
                    <td className="py-3 text-gray-600 dark:text-gray-400">{formatNumber(day.total_sent)}</td>
                    <td className="py-3 text-gray-600 dark:text-gray-400">{formatNumber(day.total_delivered)}</td>
                    <td className="py-3 text-gray-600 dark:text-gray-400">{formatNumber(day.total_failed)}</td>
                    <td className="py-3 text-gray-600 dark:text-gray-400">{formatNumber(day.otp_sent)}</td>
                    <td className="py-3 text-gray-600 dark:text-gray-400">{formatNumber(day.transactional_sent)}</td>
                    <td className="py-3 text-gray-600 dark:text-gray-400">{formatNumber(day.marketing_sent)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  )
}
