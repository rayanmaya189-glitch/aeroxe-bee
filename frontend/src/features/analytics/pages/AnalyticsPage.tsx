import { useState, useEffect } from 'react'
import { getAnalytics } from '@/services/dashboard'
import type { AnalyticsDaily } from '@/types/models'

export function AnalyticsPage() {
  const [analytics, setAnalytics] = useState<AnalyticsDaily[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => { loadAnalytics() }, [])

  async function loadAnalytics() {
    try {
      setLoading(true)
      const end = new Date().toISOString().split('T')[0]
      const start = new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0]
      const data = await getAnalytics({ start, end })
      setAnalytics(data)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load analytics')
    } finally {
      setLoading(false)
    }
  }

  const totals = analytics.reduce(
    (acc, a) => ({
      sent: acc.sent + a.total_sent,
      delivered: acc.delivered + a.total_delivered,
      failed: acc.failed + a.total_failed,
      otp: acc.otp + a.otp_sent,
      transactional: acc.transactional + a.transactional_sent,
      marketing: acc.marketing + a.marketing_sent,
    }),
    { sent: 0, delivered: 0, failed: 0, otp: 0, transactional: 0, marketing: 0 },
  )

  return (
    <div className="space-y-6 p-6">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Analytics</h1>

      {error && <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600 dark:bg-red-900/20">{error}</div>}

      {loading ? (
        <div className="h-64 animate-pulse rounded-2xl bg-gray-200 dark:bg-gray-700" />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-6">
            <KPI label="Total Sent" value={totals.sent} />
            <KPI label="Delivered" value={totals.delivered} />
            <KPI label="Failed" value={totals.failed} />
            <KPI label="OTP" value={totals.otp} />
            <KPI label="Transactional" value={totals.transactional} />
            <KPI label="Marketing" value={totals.marketing} />
          </div>

          <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 text-xs uppercase text-gray-500 dark:bg-gray-800 dark:text-gray-400">
                <tr>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Sent</th>
                  <th className="px-4 py-3">Delivered</th>
                  <th className="px-4 py-3">Failed</th>
                  <th className="px-4 py-3">OTP</th>
                  <th className="px-4 py-3">Transactional</th>
                  <th className="px-4 py-3">Marketing</th>
                  <th className="px-4 py-3">Avg Confidence</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {analytics.map((a) => (
                  <tr key={a.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                    <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{a.date}</td>
                    <td className="px-4 py-3">{a.total_sent}</td>
                    <td className="px-4 py-3 text-green-600">{a.total_delivered}</td>
                    <td className="px-4 py-3 text-red-600">{a.total_failed}</td>
                    <td className="px-4 py-3">{a.otp_sent}</td>
                    <td className="px-4 py-3">{a.transactional_sent}</td>
                    <td className="px-4 py-3">{a.marketing_sent}</td>
                    <td className="px-4 py-3">{a.avg_confidence.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}

function KPI({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-gray-200 p-4 dark:border-gray-700">
      <p className="text-xs font-medium uppercase text-gray-500 dark:text-gray-400">{label}</p>
      <p className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">{value.toLocaleString()}</p>
    </div>
  )
}
