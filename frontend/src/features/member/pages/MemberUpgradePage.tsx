import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getPlans, getEnabledPaymentConfigs, createSubscriptionRequest, createPaymentRequest, type Plan, type PaymentConfig } from '@/services/dashboard'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'

export function MemberUpgradePage() {
  const queryClient = useQueryClient()
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null)
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly')
  const [paymentMethod, setPaymentMethod] = useState('')
  const [proofUrl, setProofUrl] = useState('')
  const [showConfirm, setShowConfirm] = useState(false)

  const { data: plans = [], isLoading: plansLoading } = useQuery({
    queryKey: ['plans'],
    queryFn: getPlans,
  })

  const { data: paymentMethods = [], isLoading: methodsLoading } = useQuery({
    queryKey: ['enabled-payment-configs'],
    queryFn: getEnabledPaymentConfigs,
  })

  const upgradeMutation = useMutation({
    mutationFn: () => {
      if (!selectedPlan) throw new Error('No plan selected')
      return createSubscriptionRequest({
        requested_plan: selectedPlan.id,
        requested_billing_cycle: billingCycle,
        reason: `Upgrade to ${selectedPlan.name} (${billingCycle})`,
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-subscription-requests'] })
      setSelectedPlan(null)
      setShowConfirm(false)
    },
  })

  const payMutation = useMutation({
    mutationFn: () => {
      if (!selectedPlan || !paymentMethod) throw new Error('Missing data')
      const amount = billingCycle === 'yearly' ? selectedPlan.monthly_price * 10 : selectedPlan.monthly_price
      return createPaymentRequest({
        plan_id: selectedPlan.id,
        billing_cycle: billingCycle,
        payment_method: paymentMethod,
        amount,
        proof_url: proofUrl,
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-payment-requests'] })
      setSelectedPlan(null)
      setShowConfirm(false)
      setPaymentMethod('')
      setProofUrl('')
    },
  })

  const calculatePrice = (plan: Plan) => {
    return billingCycle === 'yearly' ? plan.monthly_price * 10 : plan.monthly_price
  }

  if (plansLoading) {
    return (
      <div className="space-y-6 p-6">
        <div className="h-8 w-48 animate-pulse rounded bg-gray-100 dark:bg-gray-800" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-64 animate-pulse rounded-2xl bg-gray-100 dark:bg-gray-800" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Upgrade Plan</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Choose a plan that fits your needs. Changes require admin approval.</p>
      </div>

      {/* Billing Cycle Toggle */}
      <div className="flex gap-2">
        <button
          onClick={() => setBillingCycle('monthly')}
          className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
            billingCycle === 'monthly' ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400'
          }`}
        >Monthly</button>
        <button
          onClick={() => setBillingCycle('yearly')}
          className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
            billingCycle === 'yearly' ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400'
          }`}
        >Yearly <span className="ml-1 text-xs text-green-400">Save 2 months</span></button>
      </div>

      {/* Plan Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {plans.map((plan) => (
          <Card
            key={plan.id}
            className={`cursor-pointer transition-all hover:shadow-lg ${
              selectedPlan?.id === plan.id ? 'ring-2 ring-primary-600' : ''
            }`}
            onClick={() => setSelectedPlan(plan)}
          >
            <CardHeader>
              <CardTitle>{plan.name}</CardTitle>
              <div className="mt-2">
                <span className="text-3xl font-bold text-gray-900 dark:text-gray-100">${calculatePrice(plan)}</span>
                <span className="text-sm text-gray-500">/{billingCycle === 'yearly' ? 'year' : 'month'}</span>
              </div>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                <li>{plan.dailyQuota.toLocaleString()} SMS/day</li>
                <li>{plan.monthlyQuota.toLocaleString()} SMS/month</li>
                <li>{plan.maxQueueDepth.toLocaleString()} queue depth</li>
                {plan.dedicatedPool && <li className="text-primary-600">Dedicated pool</li>}
                <li>{plan.defaultRoutingStrategy.replace(/_/g, ' ')}</li>
                {plan.pricePerSms > 0 && <li>${plan.pricePerSms}/SMS overage</li>}
              </ul>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Payment Method Selection */}
      {selectedPlan && (
        <Card>
          <CardHeader>
            <CardTitle>Payment Method</CardTitle>
          </CardHeader>
          <CardContent>
            {methodsLoading ? (
              <div className="h-10 animate-pulse rounded bg-gray-100 dark:bg-gray-800" />
            ) : (
              <div className="space-y-3">
                {paymentMethods.map((method) => (
                  <button
                    key={method.id}
                    onClick={() => setPaymentMethod(method.method)}
                    className={`flex w-full items-center gap-3 rounded-lg border p-3 text-left transition-colors ${
                      paymentMethod === method.method
                        ? 'border-primary-600 bg-primary-50 dark:bg-primary-900/20'
                        : 'border-gray-200 hover:border-gray-300 dark:border-gray-700'
                    }`}
                  >
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gray-100 dark:bg-gray-800">
                      {method.method === 'bank_transfer' && '🏦'}
                      {method.method === 'trc20' && '🔗'}
                      {method.method === 'qr_code' && '📱'}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900 dark:text-gray-100">{method.label}</p>
                      <p className="text-xs text-gray-500">{Object.values(method.details).filter(Boolean).join(' • ')}</p>
                    </div>
                  </button>
                ))}

                {paymentMethod && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Payment Proof URL (optional)</label>
                    <input
                      value={proofUrl}
                      onChange={(e) => setProofUrl(e.target.value)}
                      placeholder="https://..."
                      className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800"
                    />
                  </div>
                )}

                <div className="flex justify-end gap-2 pt-4">
                  <Button variant="outline" onClick={() => { setSelectedPlan(null); setPaymentMethod('') }}>Cancel</Button>
                  <Button
                    disabled={!paymentMethod}
                    loading={upgradeMutation.isPending || payMutation.isPending}
                    onClick={() => {
                      payMutation.mutate()
                    }}
                  >
                    Submit Upgrade Request
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
