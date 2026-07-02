import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import api from '@/services/api'
import type { ApiResponse } from '@/types/api'
import type { AnalyticsDaily } from '@/types/models'
import { Card, CardHeader, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { PageSkeleton } from '@/components/ui/Skeleton'
import { formatNumber } from '@/utils/format'

export function MemberAnalyticsPage() {
  const { data: analytics = [], isLoading, error } = useQuery({
    queryKey: ['member-analytics'],
    queryFn: async () => {
      const res = await api.get<ApiResponse<AnalyticsDaily[]>>('/member/analytics')
      return res.data.data || []
    },
  })

  if (isLoading) return <PageSkeleton />

  if (error) {
    return (
      <div className="rounded-lg border border-danger-200 bg-danger-50 p-4 text-sm text-danger-700 dark:border-danger-800/50 dark:bg-danger-900/20 dark:text-danger-300">
        Failed to load analytics
      </div>
    )
  }

  const totals = analytics.reduce(
    (acc, day) => ({
      sent: acc.sent + day.total_sent,
      delivered: acc.delivered + day.total_delivered,
      failed: acc.failed + day.total_failed,
    }),
    { sent: 0, delivered: 0, failed: 0 },
  )

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-100">Analytics</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Your message delivery analytics</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Total sent</p>
          <p className="mt-1 text-3xl font-bold text-gray-900 dark:text-gray-100">{formatNumber(totals.sent)}</p>
        </Card>
        <Card>
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Total delivered</p>
          <p className="mt-1 text-3xl font-bold text-gray-900 dark:text-gray-100">{formatNumber(totals.delivered)}</p>
        </Card>
        <Card>
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Total failed</p>
          <p className="mt-1 text-3xl font-bold text-gray-900 dark:text-gray-100">{formatNumber(totals.failed)}</p>
        </Card>
      </div>

      <Card>
        <CardHeader className="mb-4">
          <CardTitle>Daily breakdown</CardTitle>
        </CardHeader>
        {analytics.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-gray-400">No analytics data available yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-800">
                  <th className="pb-3 text-xs font-medium uppercase text-gray-500 dark:text-gray-400">Date</th>
                  <th className="pb-3 text-xs font-medium uppercase text-gray-500 dark:text-gray-400">Sent</th>
                  <th className="pb-3 text-xs font-medium uppercase text-gray-500 dark:text-gray-400">Delivered</th>
                  <th className="pb-3 text-xs font-medium uppercase text-gray-500 dark:text-gray-400">Failed</th>
                  <th className="pb-3 text-xs font-medium uppercase text-gray-500 dark:text-gray-400">Rate</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800/50">
                {analytics.slice(0, 30).map((day) => (
                  <tr key={day.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/30">
                    <td className="py-3 font-medium text-gray-900 dark:text-gray-100">{new Date(day.date).toLocaleDateString()}</td>
                    <td className="py-3 text-gray-600 dark:text-gray-400">{formatNumber(day.total_sent)}</td>
                    <td className="py-3 text-gray-600 dark:text-gray-400">{formatNumber(day.total_delivered)}</td>
                    <td className="py-3 text-gray-600 dark:text-gray-400">{formatNumber(day.total_failed)}</td>
                    <td className="py-3">
                      <Badge variant={day.total_sent > 0 && (day.total_delivered / day.total_sent) > 0.9 ? 'success' : 'warning'} size="sm">
                        {day.total_sent > 0 ? `${((day.total_delivered / day.total_sent) * 100).toFixed(1)}%` : '—'}
                      </Badge>
                    </td>
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
