import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getPlans, createPlan, updatePlan, deletePlan } from '@/services/dashboard'
import type { Plan } from '@/types/models'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { EmptyState } from '@/components/ui/EmptyState'
import { PageSkeleton } from '@/components/ui/Skeleton'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { formatNumber } from '@/utils/format'

export function PlansPage() {
  const queryClient = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Plan | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Plan | null>(null)
  const [error, setError] = useState('')

  // Form state
  const [name, setName] = useState('')
  const [planId, setPlanId] = useState('')
  const [dailyQuota, setDailyQuota] = useState('')
  const [monthlyQuota, setMonthlyQuota] = useState('')
  const [monthlyPrice, setMonthlyPrice] = useState('')
  const [pricePerSms, setPricePerSms] = useState('')
  const [overageBuffer, setOverageBuffer] = useState('')
  const [maxQueueDepth, setMaxQueueDepth] = useState('')
  const [routingStrategy, setRoutingStrategy] = useState('fastest_delivery')
  const [dedicatedPool, setDedicatedPool] = useState(false)

  const { data: plans = [], isLoading } = useQuery({
    queryKey: ['admin-plans'],
    queryFn: getPlans,
  })

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload: Plan = {
        id: planId,
        name,
        daily_quota: Number(dailyQuota) || 0,
        monthly_quota: Number(monthlyQuota) || 0,
        monthly_price: Number(monthlyPrice) || 0,
        price_per_sms: Number(pricePerSms) || 0,
        overage_buffer_pct: Number(overageBuffer) || 0,
        max_queue_depth: Number(maxQueueDepth) || 100,
        dedicated_pool: dedicatedPool,
        default_routing_strategy: routingStrategy,
      }
      if (editing) {
        return updatePlan(editing.id, payload)
      }
      return createPlan(payload)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-plans'] })
      closeForm()
    },
    onError: (err: Error) => setError(err.message),
  })

  const deleteMutation = useMutation({
    mutationFn: async () => { if (deleteTarget) await deletePlan(deleteTarget.id) },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-plans'] })
      setDeleteTarget(null)
    },
  })

  function openForm(plan?: Plan) {
    setEditing(plan || null)
    setPlanId(plan?.id || '')
    setName(plan?.name || '')
    setDailyQuota(String(plan?.daily_quota ?? ''))
    setMonthlyQuota(String(plan?.monthly_quota ?? ''))
    setMonthlyPrice(String(plan?.monthly_price ?? ''))
    setPricePerSms(String(plan?.price_per_sms ?? ''))
    setOverageBuffer(String(plan?.overage_buffer_pct ?? ''))
    setMaxQueueDepth(String(plan?.max_queue_depth ?? ''))
    setRoutingStrategy(plan?.default_routing_strategy || 'fastest_delivery')
    setDedicatedPool(plan?.dedicated_pool || false)
    setError('')
    setShowForm(true)
  }

  function closeForm() {
    setShowForm(false)
    setEditing(null)
    setError('')
  }

  if (isLoading) return <PageSkeleton />

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-100">Plans</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Manage subscription plans and pricing</p>
        </div>
        <Button size="sm" onClick={() => openForm()}>New plan</Button>
      </div>

      {plans.length === 0 ? (
        <EmptyState
          title="No plans configured"
          description="Create a plan to define pricing and quotas."
          action={<Button size="sm" onClick={() => openForm()}>Create plan</Button>}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
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

              <div className="mt-5 space-y-2.5 text-sm">
                <div className="flex justify-between text-gray-500 dark:text-gray-400">
                  <span>Daily quota</span>
                  <span className="font-medium text-gray-700 dark:text-gray-300">{formatNumber(plan.daily_quota)}</span>
                </div>
                <div className="flex justify-between text-gray-500 dark:text-gray-400">
                  <span>Monthly quota</span>
                  <span className="font-medium text-gray-700 dark:text-gray-300">{formatNumber(plan.monthly_quota)}</span>
                </div>
                <div className="flex justify-between text-gray-500 dark:text-gray-400">
                  <span>Overage buffer</span>
                  <span className="font-medium text-gray-700 dark:text-gray-300">{plan.overage_buffer_pct}%</span>
                </div>
                <div className="flex justify-between text-gray-500 dark:text-gray-400">
                  <span>Price per SMS</span>
                  <span className="font-medium text-gray-700 dark:text-gray-300">${plan.price_per_sms}</span>
                </div>
                <div className="flex justify-between text-gray-500 dark:text-gray-400">
                  <span>Max queue</span>
                  <span className="font-medium text-gray-700 dark:text-gray-300">{formatNumber(plan.max_queue_depth)}</span>
                </div>
                <div className="flex justify-between text-gray-500 dark:text-gray-400">
                  <span>Routing</span>
                  <Badge size="sm">{plan.default_routing_strategy}</Badge>
                </div>
              </div>

              <div className="mt-4 flex gap-2 border-t border-gray-100 pt-4 dark:border-gray-800">
                <Button variant="ghost" size="xs" onClick={() => openForm(plan)}>Edit</Button>
                <Button variant="ghost" size="xs" className="text-danger-600" onClick={() => setDeleteTarget(plan)}>Delete</Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal
        open={showForm}
        onClose={closeForm}
        title={editing ? 'Edit plan' : 'New plan'}
        size="lg"
        footer={
          <>
            <Button variant="ghost" size="sm" onClick={closeForm} disabled={saveMutation.isPending}>Cancel</Button>
            <Button size="sm" onClick={() => saveMutation.mutate()} loading={saveMutation.isPending}>
              {editing ? 'Update' : 'Create'}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          {error && (
            <div className="rounded-lg border border-danger-200 bg-danger-50 p-3 text-sm text-danger-700">{error}</div>
          )}
          <div className="grid gap-4 sm:grid-cols-2">
            <Input label="Plan ID" value={planId} onChange={(e) => setPlanId(e.target.value)} placeholder="e.g. free, pro, scale" required disabled={!!editing} />
            <Input label="Plan name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Free, Pro" required />
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <Input label="Daily quota" type="number" value={dailyQuota} onChange={(e) => setDailyQuota(e.target.value)} placeholder="100" required />
            <Input label="Monthly quota" type="number" value={monthlyQuota} onChange={(e) => setMonthlyQuota(e.target.value)} placeholder="3000" required />
            <Input label="Max queue depth" type="number" value={maxQueueDepth} onChange={(e) => setMaxQueueDepth(e.target.value)} placeholder="100" required />
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <Input label="Monthly price ($)" type="number" step="0.01" value={monthlyPrice} onChange={(e) => setMonthlyPrice(e.target.value)} placeholder="29.00" required />
            <Input label="Price per SMS ($)" type="number" step="0.001" value={pricePerSms} onChange={(e) => setPricePerSms(e.target.value)} placeholder="0.005" required />
            <Input label="Overage buffer (%)" type="number" value={overageBuffer} onChange={(e) => setOverageBuffer(e.target.value)} placeholder="10" required />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Routing strategy</label>
              <select
                value={routingStrategy}
                onChange={(e) => setRoutingStrategy(e.target.value)}
                className="block w-full rounded-lg border border-gray-300 bg-white px-3.5 py-2.5 text-sm text-gray-900 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
              >
                <option value="fastest_delivery">Fastest delivery</option>
                <option value="lowest_cost">Lowest cost</option>
                <option value="highest_reliability">Highest reliability</option>
                <option value="geo_affinity">Geo affinity</option>
                <option value="profit_optimized">Profit optimized</option>
              </select>
            </div>
            <div className="flex items-end">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={dedicatedPool}
                  onChange={(e) => setDedicatedPool(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Dedicated pool</span>
              </label>
            </div>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => deleteMutation.mutate()}
        title="Delete plan"
        description={`Are you sure you want to delete the "${deleteTarget?.name}" plan? This may affect active subscriptions.`}
        loading={deleteMutation.isPending}
      />
    </div>
  )
}
