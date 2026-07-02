import { useState, useEffect } from 'react'
import api from '@/services/api'
import type { ApiResponse } from '@/types/api'

interface AnalyticsEntry {
  date: string
  total: number
  delivered: number
  failed: number
  otp: number
  transactional: number
  marketing: number
}

export function MemberAnalyticsPage() {
  const [data, setData] = useState<AnalyticsEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    api.get<ApiResponse<AnalyticsEntry[]>>('/member/analytics')
      .then((res) => {
        if (res.data.success && res.data.data) setData(res.data.data)
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="flex items-center justify-center p-12"><div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-600 border-t-transparent" /></div>
  if (error) return <div className="p-6"><div className="rounded-lg bg-red-50 p-4 text-red-600 dark:bg-red-900/20 dark:text-red-400">{error}</div></div>

  const totals = data.reduce(
    (acc, d) => ({
      total: acc.total + d.total,
      delivered: acc.delivered + d.delivered,
      failed: acc.failed + d.failed,
      otp: acc.otp + d.otp,
      transactional: acc.transactional + d.transactional,
      marketing: acc.marketing + d.marketing,
    }),
    { total: 0, delivered: 0, failed: 0, otp: 0, transactional: 0, marketing: 0 }
  )

  const deliveryRate = totals.total > 0 ? ((totals.delivered / totals.total) * 100).toFixed(1) : '0.0'

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Analytics</h1>
        <p className="text-sm text-gray-600 dark:text-gray-400">Message delivery analytics over the last 30 days</p>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total Messages" value={totals.total} color="blue" />
        <StatCard label="Delivered" value={totals.delivered} color="green" />
        <StatCard label="Failed" value={totals.failed} color="red" />
        <StatCard label="Delivery Rate" value={`${deliveryRate}%`} color="emerald" />
      </div>

      {/* Breakdown by Type */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-gray-200 p-5 dark:border-gray-700">
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">OTP Messages</p>
          <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">{totals.otp.toLocaleString()}</p>
        </div>
        <div className="rounded-2xl border border-gray-200 p-5 dark:border-gray-700">
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Transactional</p>
          <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">{totals.transactional.toLocaleString()}</p>
        </div>
        <div className="rounded-2xl border border-gray-200 p-5 dark:border-gray-700">
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Marketing</p>
          <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">{totals.marketing.toLocaleString()}</p>
        </div>
      </div>

      {/* Daily Breakdown Table */}
      {data.length > 0 && (
        <div className="overflow-hidden rounded-2xl border border-gray-200 dark:border-gray-700">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-800">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Date</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400">Total</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400">Delivered</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400">Failed</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400">OTP</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400">Transactional</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400">Marketing</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white dark:divide-gray-700 dark:bg-gray-900">
              {data.sort((a, b) => b.date.localeCompare(a.date)).map((row) => (
                <tr key={row.date} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                  <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">{new Date(row.date).toLocaleDateString()}</td>
                  <td className="px-4 py-3 text-sm text-right text-gray-600 dark:text-gray-400">{row.total}</td>
                  <td className="px-4 py-3 text-sm text-right text-green-600 dark:text-green-400">{row.delivered}</td>
                  <td className="px-4 py-3 text-sm text-right text-red-600 dark:text-red-400">{row.failed}</td>
                  <td className="px-4 py-3 text-sm text-right text-gray-600 dark:text-gray-400">{row.otp}</td>
                  <td className="px-4 py-3 text-sm text-right text-gray-600 dark:text-gray-400">{row.transactional}</td>
                  <td className="px-4 py-3 text-sm text-right text-gray-600 dark:text-gray-400">{row.marketing}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function StatCard({ label, value, color }: { label: string; value: number | string; color: string }) {
  const colors: Record<string, string> = {
    blue: 'border-blue-500 bg-blue-50 dark:bg-blue-900/20',
    green: 'border-green-500 bg-green-50 dark:bg-green-900/20',
    red: 'border-red-500 bg-red-50 dark:bg-red-900/20',
    emerald: 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20',
  }
  return (
    <div className={`rounded-2xl border-l-4 p-5 shadow-sm ${colors[color] ?? colors.blue}`}>
      <p className="text-sm font-medium text-gray-600 dark:text-gray-400">{label}</p>
      <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">{typeof value === 'number' ? value.toLocaleString() : value}</p>
    </div>
  )
}
