import { useQuery } from '@tanstack/react-query'
import { getPlans } from '@/services/dashboard'
import type { Plan } from '@/types/models'
import { Card, CardHeader, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { PageSkeleton } from '@/components/ui/Skeleton'
import { EmptyState } from '@/components/ui/EmptyState'
import { formatNumber } from '@/utils/format'

export function BillingPage() {
  const { data: plans = [], isLoading } = useQuery({
    queryKey: ['plans'],
    queryFn: getPlans,
  })

  if (isLoading) return <PageSkeleton />

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-100">Billing &amp; plans</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Overview of available plans and pricing</p>
      </div>

      {plans.length === 0 ? (
        <EmptyState title="No plans available" description="Plans will appear here once configured." />
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {plans.map((plan) => (
            <Card key={plan.id} hover>
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">{plan.name}</h3>
                  <p className="mt-1 text-2xl font-bold text-gray-900 dark:text-gray-100">
                    ${plan.monthly_price}<span className="text-sm font-normal text-gray-400">/mo</span>
                  </p>
                </div>
                {plan.dedicated_pool && <Badge variant="primary" size="sm">Dedicated</Badge>}
              </div>

              <div className="mt-6 space-y-3 text-sm">
                <div className="flex justify-between text-gray-600 dark:text-gray-400">
                  <span>Daily quota</span>
                  <span className="font-medium text-gray-900 dark:text-gray-100">{formatNumber(plan.daily_quota)}</span>
                </div>
                <div className="flex justify-between text-gray-600 dark:text-gray-400">
                  <span>Monthly quota</span>
                  <span className="font-medium text-gray-900 dark:text-gray-100">{formatNumber(plan.monthly_quota)}</span>
                </div>
                <div className="flex justify-between text-gray-600 dark:text-gray-400">
                  <span>Overage buffer</span>
                  <span className="font-medium text-gray-900 dark:text-gray-100">{plan.overage_buffer_pct}%</span>
                </div>
                <div className="flex justify-between text-gray-600 dark:text-gray-400">
                  <span>Max queue depth</span>
                  <span className="font-medium text-gray-900 dark:text-gray-100">{formatNumber(plan.max_queue_depth)}</span>
                </div>
                <div className="flex justify-between text-gray-600 dark:text-gray-400">
                  <span>Price per SMS</span>
                  <span className="font-medium text-gray-900 dark:text-gray-100">${plan.price_per_sms}</span>
                </div>
                <div className="flex justify-between text-gray-600 dark:text-gray-400">
                  <span>Routing strategy</span>
                  <Badge size="sm">{plan.default_routing_strategy}</Badge>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
