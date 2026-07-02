import { useState, useEffect } from 'react'
import { getPlans } from '@/services/dashboard'
import type { Plan } from '@/types/models'

export function BillingPage() {
  const [plans, setPlans] = useState<Plan[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => { load() }, [])

  async function load() {
    try { setLoading(true); setPlans(await getPlans()) }
    catch (err: unknown) { setError(err instanceof Error ? err.message : 'Failed') }
    finally { setLoading(false) }
  }

  return (
    <div className="space-y-6 p-6">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Billing & Plans</h1>
      {error && <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600 dark:bg-red-900/20">{error}</div>}
      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-64 animate-pulse rounded-2xl bg-gray-200 dark:bg-gray-700" />)}
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {plans.map((plan) => (
            <div key={plan.id} className={`rounded-2xl border-2 p-6 transition-all hover:shadow-lg ${plan.id === 'pro' ? 'border-primary-500 shadow-primary-500/10' : 'border-gray-200 dark:border-gray-700'}`}>
              {plan.id === 'pro' && <span className="mb-2 inline-block rounded-full bg-primary-100 px-3 py-0.5 text-xs font-medium text-primary-700 dark:bg-primary-900/30 dark:text-primary-400">Popular</span>}
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">{plan.name}</h3>
              <div className="mt-3">
                <span className="text-3xl font-bold text-gray-900 dark:text-white">${plan.monthly_price}</span>
                <span className="text-sm text-gray-500 dark:text-gray-400">/mo</span>
              </div>
              <div className="mt-4 space-y-2 text-sm text-gray-600 dark:text-gray-400">
                <p>📤 {plan.daily_quota.toLocaleString()} SMS/day</p>
                <p>📊 {plan.monthly_quota.toLocaleString()} SMS/month</p>
                <p>💰 ${plan.price_per_sms.toFixed(3)}/SMS</p>
                <p>🔄 {plan.overage_buffer_pct}% overage buffer</p>
                <p>📋 {plan.max_queue_depth.toLocaleString()} queue depth</p>
                <p>🌐 {plan.dedicated_pool ? 'Dedicated pool' : 'Shared pool'}</p>
                <p>⚙️ Default: {plan.default_routing_strategy.replace('_', ' ')}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
