import { useState, useEffect } from 'react'
import api from '@/services/api'
import type { ApiResponse } from '@/types/api'

interface MemberDashboard {
  account: { id: string; name: string; email: string; plan: string; status: string }
  devices: { total: number; online: number }
  messages: { total_sent: number; total_delivered: number; total_failed: number; delivery_rate: number }
  usage: { daily: number; monthly: number }
  subscription: { plan_type: string; quota_daily: number; quota_monthly: number; renewal_date: string } | null
}

export function MemberDashboardPage() {
  const [data, setData] = useState<MemberDashboard | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    api.get<ApiResponse<MemberDashboard>>('/member/dashboard')
      .then((res) => {
        if (res.data.success && res.data.data) setData(res.data.data)
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="flex items-center justify-center p-12"><div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-600 border-t-transparent" /></div>
  if (error) return <div className="p-6"><div className="rounded-lg bg-red-50 p-4 text-red-600 dark:bg-red-900/20 dark:text-red-400">{error}</div></div>
  if (!data) return null

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">My Dashboard</h1>
        <p className="text-sm text-gray-600 dark:text-gray-400">Welcome, {data.account.name}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card title="Total Sent" value={data.messages.total_sent} color="blue" />
        <Card title="Delivered" value={data.messages.total_delivered} color="green" />
        <Card title="Failed" value={data.messages.total_failed} color="red" />
        <Card title="Delivery Rate" value={`${data.messages.delivery_rate.toFixed(1)}%`} color="emerald" />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <InfoCard title="Devices">
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{data.devices.total}</p>
          <p className="text-sm text-green-600">{data.devices.online} online</p>
        </InfoCard>
        <InfoCard title="Daily Usage">
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{data.usage.daily}</p>
          {data.subscription && <p className="text-sm text-gray-500">of {data.subscription.quota_daily} quota</p>}
        </InfoCard>
        <InfoCard title="Monthly Usage">
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{data.usage.monthly}</p>
          {data.subscription && <p className="text-sm text-gray-500">of {data.subscription.quota_monthly} quota</p>}
        </InfoCard>
      </div>

      {data.subscription && (
        <div className="rounded-2xl border border-gray-200 p-6 dark:border-gray-700">
          <h2 className="mb-3 text-lg font-semibold text-gray-900 dark:text-white">Subscription</h2>
          <div className="grid gap-4 sm:grid-cols-4">
            <div><p className="text-xs text-gray-500">Plan</p><p className="font-medium capitalize">{data.subscription.plan_type}</p></div>
            <div><p className="text-xs text-gray-500">Status</p><p className="font-medium capitalize">{data.account.status}</p></div>
            <div><p className="text-xs text-gray-500">Renewal</p><p className="font-medium">{new Date(data.subscription.renewal_date).toLocaleDateString()}</p></div>
            <div><p className="text-xs text-gray-500">Account</p><p className="font-medium">{data.account.email}</p></div>
          </div>
        </div>
      )}
    </div>
  )
}

function Card({ title, value, color }: { title: string; value: number | string; color: string }) {
  const colors: Record<string, string> = { blue: 'border-blue-500 bg-blue-50 dark:bg-blue-900/20', green: 'border-green-500 bg-green-50 dark:bg-green-900/20', red: 'border-red-500 bg-red-50 dark:bg-red-900/20', emerald: 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20' }
  return (
    <div className={`rounded-2xl border-l-4 p-5 shadow-sm ${colors[color] ?? colors.blue}`}>
      <p className="text-sm font-medium text-gray-600 dark:text-gray-400">{title}</p>
      <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">{typeof value === 'number' ? value.toLocaleString() : value}</p>
    </div>
  )
}

function InfoCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-gray-200 p-5 dark:border-gray-700">
      <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{title}</p>
      <div className="mt-2">{children}</div>
    </div>
  )
}
