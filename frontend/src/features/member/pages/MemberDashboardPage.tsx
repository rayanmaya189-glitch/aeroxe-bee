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

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="space-y-2">
          <div className="h-8 w-48 animate-pulse rounded-lg glass-stat" />
          <div className="h-4 w-64 animate-pulse rounded glass-stat opacity-60" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-28 animate-pulse rounded-2xl glass-stat" />
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-xl border border-danger/20 bg-danger/5 p-4 text-sm text-danger">
        {error}
      </div>
    )
  }

  if (!data) return null

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-surface-900 dark:text-white">My Dashboard</h1>
        <p className="text-sm text-surface-500 dark:text-surface-400">Welcome, {data.account.name}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Total Sent" value={data.messages.total_sent} color="amber" />
        <StatCard title="Delivered" value={data.messages.total_delivered} color="green" />
        <StatCard title="Failed" value={data.messages.total_failed} color="red" />
        <StatCard title="Delivery Rate" value={`${data.messages.delivery_rate.toFixed(1)}%`} color="honey" />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <InfoCard title="Devices" color="honey">
          <p className="text-2xl font-bold text-surface-900 dark:text-white">{data.devices.total}</p>
          <p className="text-sm text-success">{data.devices.online} online</p>
        </InfoCard>
        <InfoCard title="Daily Usage" color="amber">
          <p className="text-2xl font-bold text-surface-900 dark:text-white">{data.usage.daily}</p>
          {data.subscription && <p className="text-sm text-surface-500 dark:text-surface-400">of {data.subscription.quota_daily} quota</p>}
        </InfoCard>
        <InfoCard title="Monthly Usage" color="amber">
          <p className="text-2xl font-bold text-surface-900 dark:text-white">{data.usage.monthly}</p>
          {data.subscription && <p className="text-sm text-surface-500 dark:text-surface-400">of {data.subscription.quota_monthly} quota</p>}
        </InfoCard>
      </div>

      {data.subscription && (
        <div className="glass-card rounded-2xl p-6">
          <h2 className="mb-4 text-lg font-semibold text-surface-900 dark:text-white">Subscription</h2>
          <div className="grid gap-4 sm:grid-cols-4">
            <div>
              <p className="text-xs font-medium text-surface-500 dark:text-surface-400">Plan</p>
              <p className="mt-1 font-medium capitalize text-surface-900 dark:text-white">{data.subscription.plan_type}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-surface-500 dark:text-surface-400">Status</p>
              <p className="mt-1 font-medium capitalize text-surface-900 dark:text-white">{data.account.status}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-surface-500 dark:text-surface-400">Renewal</p>
              <p className="mt-1 font-medium text-surface-900 dark:text-white">{new Date(data.subscription.renewal_date).toLocaleDateString()}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-surface-500 dark:text-surface-400">Account</p>
              <p className="mt-1 font-medium text-surface-900 dark:text-white">{data.account.email}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

const iconMap: Record<string, { iconBg: string; iconColor: string; svg: string }> = {
  amber: {
    iconBg: 'bg-primary-400/20 dark:bg-primary-400/25',
    iconColor: 'text-primary-700 dark:text-primary-400',
    svg: 'M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5',
  },
  green: {
    iconBg: 'bg-success/15 dark:bg-success/20',
    iconColor: 'text-success',
    svg: 'M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
  },
  red: {
    iconBg: 'bg-danger/15 dark:bg-danger/20',
    iconColor: 'text-danger',
    svg: 'M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z',
  },
  honey: {
    iconBg: 'bg-primary-400/20 dark:bg-primary-400/25',
    iconColor: 'text-primary-700 dark:text-primary-400',
    svg: 'M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941',
  },
}

function StatCard({ title, value, color }: { title: string; value: number | string; color: string }) {
  const c = iconMap[color] ?? iconMap.honey
  return (
    <div className="glass-stat group rounded-2xl p-5 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-surface-600 dark:text-surface-400">{title}</p>
          <p className="mt-2 text-3xl font-bold text-surface-900 dark:text-white">
            {typeof value === 'number' ? value.toLocaleString() : value}
          </p>
        </div>
        <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${c.iconBg} transition-transform duration-300 group-hover:scale-110`}>
          <svg className={`h-5 w-5 ${c.iconColor}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d={c.svg} />
          </svg>
        </div>
      </div>
    </div>
  )
}

const infoIconMap: Record<string, { iconBg: string; iconColor: string; svg: string }> = {
  honey: {
    iconBg: 'bg-primary-400/20 dark:bg-primary-400/25',
    iconColor: 'text-primary-700 dark:text-primary-400',
    svg: 'M10.5 1.5H8.25A2.25 2.25 0 006 3.75v16.5a2.25 2.25 0 002.25 2.25h7.5A2.25 2.25 0 0018 20.25V3.75a2.25 2.25 0 00-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 18.75h3',
  },
  amber: {
    iconBg: 'bg-primary-400/20 dark:bg-primary-400/25',
    iconColor: 'text-primary-700 dark:text-primary-400',
    svg: 'M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z',
  },
}

function InfoCard({ title, color, children }: { title: string; color: string; children: React.ReactNode }) {
  const c = infoIconMap[color] ?? infoIconMap.honey
  return (
    <div className="glass-card rounded-2xl p-5">
      <div className="flex items-center gap-3">
        <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${c.iconBg}`}>
          <svg className={`h-4 w-4 ${c.iconColor}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d={c.svg} />
          </svg>
        </div>
        <p className="text-sm font-medium text-surface-600 dark:text-surface-400">{title}</p>
      </div>
      <div className="mt-3">{children}</div>
    </div>
  )
}
