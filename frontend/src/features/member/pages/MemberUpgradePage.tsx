import { useState } from 'react'
import { motion } from 'framer-motion'
import { PageTransition } from '@/components/ui/PageTransition'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getPlans, getEnabledPaymentConfigs, createSubscriptionRequest, createPaymentRequest } from '@/services/dashboard'
import type { Plan } from '@/types/models'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { staggerContainer, fadeInUp, itemVariants } from '@/components/animations/variants'
import { Check, Crown } from 'lucide-react'
import { useToast } from '@/components/ui/Toast'

export function MemberUpgradePage() {
  const queryClient = useQueryClient()
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null)
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly')
  const [paymentMethod, setPaymentMethod] = useState('')
  const [proofUrl, setProofUrl] = useState('')

  const { data: plans = [], isLoading: plansLoading } = useQuery({ queryKey: ['plans'], queryFn: getPlans })
  const { data: paymentMethods = [], isLoading: methodsLoading } = useQuery({ queryKey: ['enabled-payment-configs'], queryFn: getEnabledPaymentConfigs })

  const { addToast } = useToast()

  const upgradeMutation = useMutation({
    mutationFn: () => {
      if (!selectedPlan) throw new Error('No plan selected')
      return createSubscriptionRequest({ requested_plan: selectedPlan.id, requested_billing_cycle: billingCycle, reason: `Upgrade to ${selectedPlan.name} (${billingCycle})` })
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['my-subscription-requests'] }); setSelectedPlan(null) },
    onError: (err: Error) => { addToast(err.message || 'Failed to submit upgrade request', 'error') },
  })

  const payMutation = useMutation({
    mutationFn: () => {
      if (!selectedPlan || !paymentMethod) throw new Error('Missing data')
      const amount = billingCycle === 'yearly' ? selectedPlan.monthly_price * 10 : selectedPlan.monthly_price
      return createPaymentRequest({ plan_id: selectedPlan.id, billing_cycle: billingCycle, payment_method: paymentMethod, amount, proof_url: proofUrl })
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['my-payment-requests'] }); setSelectedPlan(null); setPaymentMethod(''); setProofUrl('') },
    onError: (err: Error) => { addToast(err.message || 'Failed to submit payment request', 'error') },
  })

  const calculatePrice = (plan: Plan) => billingCycle === 'yearly' ? plan.monthly_price * 10 : plan.monthly_price

  if (plansLoading) {
    return <PageTransition><div className="space-y-6"><div className="h-8 w-48 animate-pulse rounded bg-white/[0.06]" /><div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-64 animate-pulse rounded-2xl bg-white/[0.03]" />)}</div></div></PageTransition>
  }

  return (
    <PageTransition>
    <motion.div initial="hidden" animate="visible" variants={staggerContainer} className="space-y-8">
      <motion.div variants={fadeInUp}>
        <div className="relative overflow-hidden rounded-2xl border border-white/[0.06] bg-white/[0.02] p-8">
          <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-yellow-600/10 blur-[80px]" />
          <div className="pointer-events-none absolute -left-8 bottom-0 h-32 w-32 rounded-full bg-orange-600/10 blur-[60px]" />
          <div className="relative flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-yellow-500 to-orange-600 shadow-lg shadow-yellow-500/25">
              <Crown className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-extrabold tracking-tight text-white lg:text-4xl">
                <span className="bg-gradient-to-r from-yellow-400 to-orange-400 bg-clip-text text-transparent">Upgrade Plan</span>
              </h1>
              <p className="mt-1 text-sm text-gray-400">Choose a plan that fits your needs. Changes require admin approval.</p>
            </div>
          </div>
        </div>
      </motion.div>

      <motion.div variants={itemVariants} className="flex gap-2">
        <button onClick={() => setBillingCycle('monthly')} className={`rounded-xl px-4 py-2 text-sm font-medium transition-colors ${billingCycle === 'monthly' ? 'bg-blue-600 text-white' : 'bg-white/[0.06] text-gray-400 hover:bg-white/[0.1]'}`}>Monthly</button>
        <button onClick={() => setBillingCycle('yearly')} className={`rounded-xl px-4 py-2 text-sm font-medium transition-colors ${billingCycle === 'yearly' ? 'bg-blue-600 text-white' : 'bg-white/[0.06] text-gray-400 hover:bg-white/[0.1]'}`}>Yearly <span className="ml-1 text-xs text-emerald-400">Save 2 months</span></button>
      </motion.div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {plans.map((plan) => (
          <motion.div key={plan.id} variants={itemVariants}>
            <button onClick={() => setSelectedPlan(plan)}
              className={`w-full cursor-pointer rounded-xl border bg-white/[0.03] p-5 text-left transition-all hover:bg-white/[0.05] hover:shadow-lg ${selectedPlan?.id === plan.id ? 'border-blue-500/50 ring-2 ring-blue-500/20' : 'border-white/[0.06]'}`}>
              <CardHeader><CardTitle>{plan.name}</CardTitle>
                <div className="mt-2"><span className="text-3xl font-bold text-gray-100">${calculatePrice(plan)}</span><span className="text-sm text-gray-500">/{billingCycle === 'yearly' ? 'year' : 'month'}</span></div>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm text-gray-400">
                  {[`${plan.daily_quota.toLocaleString()} SMS/day`, `${plan.monthly_quota.toLocaleString()} SMS/month`, `${plan.max_queue_depth.toLocaleString()} queue depth`,
                    ...(plan.dedicated_pool ? ['Dedicated pool'] : []), plan.default_routing_strategy.replace(/_/g, ' '),
                    ...(plan.price_per_sms > 0 ? [`$${plan.price_per_sms}/SMS overage`] : [])
                  ].map((f) => <li key={f} className="flex items-center gap-1.5"><Check className="h-3 w-3 text-emerald-400" />{f}</li>)}
                </ul>
              </CardContent>
            </button>
          </motion.div>
        ))}
      </div>

      {selectedPlan && (
        <motion.div variants={itemVariants}>
          <Card>
            <CardHeader><CardTitle>Payment Method</CardTitle></CardHeader>
            <CardContent>
              {methodsLoading ? (
                <div className="h-10 animate-pulse rounded bg-white/[0.06]" />
              ) : (
                <div className="space-y-3">
                  {paymentMethods.map((method) => (
                    <button key={method.id} onClick={() => setPaymentMethod(method.method)}
                      className={`flex w-full items-center gap-3 rounded-lg border p-3 text-left transition-colors ${paymentMethod === method.method ? 'border-blue-500/50 bg-blue-500/5' : 'border-white/[0.08] hover:border-white/[0.15]'}`}>
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/[0.06]">
                        {method.method === 'bank_transfer' && '🏦'}{method.method === 'trc20' && '🔗'}{method.method === 'qr_code' && '📱'}
                      </div>
                      <div><p className="font-medium text-gray-100">{method.label}</p><p className="text-xs text-gray-500">{Object.values(method.details).filter(Boolean).join(' • ')}</p></div>
                    </button>
                  ))}
                  {paymentMethod && (
                    <Input label="Payment Proof URL (optional)" value={proofUrl} onChange={(e) => setProofUrl(e.target.value)} placeholder="https://..." />
                  )}
                  <div className="flex justify-end gap-2 pt-4">
                    <Button variant="secondary" onClick={() => { setSelectedPlan(null); setPaymentMethod('') }}>Cancel</Button>
                    <Button disabled={!paymentMethod} loading={upgradeMutation.isPending || payMutation.isPending} onClick={() => payMutation.mutate()}>Submit Upgrade Request</Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      )}
    </motion.div>
    </PageTransition>
  )
}
