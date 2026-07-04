import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useInView } from 'react-intersection-observer'
import { Check, Sparkles, CreditCard, Banknote, QrCode, Smartphone, Zap, MessageSquare, ArrowRight } from 'lucide-react'
import { PRICING_PLANS } from '../constants/data'
import { staggerContainer, fadeInUp } from '../animations/variants'

interface ApiPlan {
  id: string
  name: string
  monthly_price: number
  daily_quota: number
  monthly_quota: number
  price_per_sms: number
  max_devices: number
  default_routing_strategy: string
  dedicated_pool: boolean
}

interface PricingPlan {
  name: string
  planId: string
  monthlyPrice: number
  yearlyPrice: number
  description: string
  features: readonly string[]
  cta: string
  popular: boolean
  monthlyQuota?: number
  dailyQuota?: number
  maxDevices?: number
  pricePerSms?: number
  routingStrategy?: string
  dedicatedPool?: boolean
}

function formatQuota(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(0)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`
  return String(n)
}

function mapApiPlanToPricing(apiPlan: ApiPlan, index: number): PricingPlan {
  const fallback = PRICING_PLANS.find((p) => p.planId === apiPlan.id)
  if (fallback) {
    return {
      ...fallback,
      monthlyPrice: apiPlan.monthly_price ?? fallback.monthlyPrice,
      yearlyPrice: Math.round((apiPlan.monthly_price ?? fallback.monthlyPrice) * 10),
      monthlyQuota: apiPlan.monthly_quota,
      dailyQuota: apiPlan.daily_quota,
      maxDevices: apiPlan.max_devices,
      pricePerSms: apiPlan.price_per_sms,
      routingStrategy: apiPlan.default_routing_strategy,
      dedicatedPool: apiPlan.dedicated_pool,
    }
  }
  return {
    name: apiPlan.name,
    planId: apiPlan.id,
    monthlyPrice: apiPlan.monthly_price,
    yearlyPrice: Math.round(apiPlan.monthly_price * 10),
    description: `${formatQuota(apiPlan.monthly_quota)} SMS/month`,
    features: [
      `${formatQuota(apiPlan.monthly_quota)} SMS/month`,
      `${formatQuota(apiPlan.daily_quota)} daily quota`,
      `$${apiPlan.price_per_sms.toFixed(4)} per SMS`,
      `${apiPlan.default_routing_strategy} routing`,
      apiPlan.dedicated_pool ? 'Dedicated device pool' : 'Shared device pool',
      'API access',
    ],
    cta: index === 0 ? 'Get Started' : 'Contact Sales',
    popular: index === 2,
    monthlyQuota: apiPlan.monthly_quota,
    dailyQuota: apiPlan.daily_quota,
    maxDevices: apiPlan.max_devices,
    pricePerSms: apiPlan.price_per_sms,
    routingStrategy: apiPlan.default_routing_strategy,
    dedicatedPool: apiPlan.dedicated_pool,
  }
}

function PricingSkeleton() {
  return (
    <div className="grid gap-4 lg:grid-cols-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="animate-pulse rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6">
          <div className="h-5 w-20 rounded bg-white/[0.06]" />
          <div className="mt-3 h-3 w-32 rounded bg-white/[0.04]" />
          <div className="mt-6 h-10 w-24 rounded bg-white/[0.06]" />
          <div className="mt-8 h-10 w-full rounded-xl bg-white/[0.06]" />
          <div className="mt-6 space-y-3">
            {Array.from({ length: 5 }).map((_, j) => (
              <div key={j} className="h-4 rounded bg-white/[0.04]" />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

export function Pricing() {
  const [annual, setAnnual] = useState(false)
  const [plans, setPlans] = useState<PricingPlan[]>([...PRICING_PLANS])
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null)
  const [paymentMethods, setPaymentMethods] = useState<{ method: string; label: string }[]>([])
  const [loading, setLoading] = useState(true)
  const [ref, inView] = useInView({ triggerOnce: true, threshold: 0.1 })

  useEffect(() => {
    const controller = new AbortController()

    async function fetchData() {
      try {
        const [plansRes, methodsRes] = await Promise.allSettled([
          fetch('/api/v1/public/plans', { signal: controller.signal }),
          fetch('/api/v1/public/payment-methods', { signal: controller.signal }),
        ])

        if (plansRes.status === 'fulfilled' && plansRes.value.ok) {
          const json = await plansRes.value.json()
          if (json.success && Array.isArray(json.data) && json.data.length > 0) {
            const mapped = json.data
              .filter((p: ApiPlan) => p.monthly_price !== undefined)
              .sort((a: ApiPlan, b: ApiPlan) => a.monthly_price - b.monthly_price)
              .map((p: ApiPlan, i: number) => mapApiPlanToPricing(p, i))
            if (mapped.length > 0) {
              setPlans(mapped)
            }
          }
        }

        if (methodsRes.status === 'fulfilled' && methodsRes.value.ok) {
          const json = await methodsRes.value.json()
          if (json.success && Array.isArray(json.data)) {
            setPaymentMethods(json.data)
          }
        }
      } catch {
        // API unavailable — keep hardcoded fallback
      } finally {
        setLoading(false)
      }
    }

    fetchData()
    return () => controller.abort()
  }, [])

  // Auto-select the popular plan
  useEffect(() => {
    if (!selectedPlan && plans.length > 0) {
      const popular = plans.find((p) => p.popular)
      if (popular) setSelectedPlan(popular.planId)
    }
  }, [plans])

  return (
    <section id="pricing" className="relative bg-[#030712] py-24 lg:py-32 overflow-hidden">
      <div className="absolute left-0 right-0 top-0 h-px bg-gradient-to-r from-transparent via-white/[0.08] to-transparent" />
      <div className="absolute left-1/4 top-1/2 h-[500px] w-[500px] -translate-y-1/2 rounded-full bg-purple-600/8 blur-[150px]" />
      <div className="absolute right-1/4 top-1/3 h-[400px] w-[400px] rounded-full bg-blue-600/8 blur-[120px]" />

      <div className="relative mx-auto max-w-[1400px] px-6">
        <motion.div
          initial="hidden"
          animate={inView ? 'visible' : 'hidden'}
          variants={staggerContainer}
          ref={ref}
        >
          <motion.div variants={fadeInUp} className="mb-14 text-center">
            <span className="mb-4 inline-block rounded-full border border-blue-500/20 bg-blue-500/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-blue-400">Pricing</span>
            <h2 className="mt-4 text-4xl font-bold tracking-tight text-white lg:text-5xl">
              Simple, transparent{' '}
              <span className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">pricing</span>
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-lg text-gray-400">
              Start free. Scale as you grow. No hidden fees.
            </p>

            {/* Toggle */}
            <div className="mx-auto mt-8 flex w-fit items-center gap-3 rounded-full border border-white/[0.08] bg-white/[0.03] p-1">
              <button
                onClick={() => setAnnual(false)}
                className={`rounded-full px-5 py-2 text-sm font-medium transition-all ${!annual ? 'bg-white/10 text-white' : 'text-gray-400 hover:text-gray-300'}`}
              >
                Monthly
              </button>
              <button
                onClick={() => setAnnual(true)}
                className={`rounded-full px-5 py-2 text-sm font-medium transition-all ${annual ? 'bg-white/10 text-white' : 'text-gray-400 hover:text-gray-300'}`}
              >
                Yearly <span className="ml-1 text-xs text-green-400">Save 2 months</span>
              </button>
            </div>
          </motion.div>

          {loading ? (
            <PricingSkeleton />
          ) : (
            <div className="grid gap-4 lg:grid-cols-4">
              {plans.map((plan, idx) => {
                const isSelected = selectedPlan === plan.planId
                const isPopular = plan.popular
                // 3D depth offsets — center cards are pushed forward
                const offsets = [-3, -1, 1, 3]
                const offsetX = offsets[idx] || 0
                const offsetZ = isSelected ? 20 : Math.abs(offsetX) * -3
                const rotationY = isSelected ? 0 : offsetX * 1.2

                return (
                  <motion.div
                    key={plan.planId}
                    variants={fadeInUp}
                    onClick={() => setSelectedPlan(plan.planId)}
                    className="relative cursor-pointer"
                    style={{
                      transform: `perspective(1200px) rotateY(${rotationY}deg) translateZ(${offsetZ}px)`,
                      transformStyle: 'preserve-3d',
                      transition: 'all 0.4s cubic-bezier(0.22, 1, 0.36, 1)',
                    }}
                    whileHover={{
                      rotateY: 0,
                      translateZ: 30,
                      scale: 1.02,
                      transition: { duration: 0.3 },
                    }}
                  >
                    {/* Glow effect for selected/popular */}
                    {(isSelected || isPopular) && (
                      <div className={`absolute -inset-[1px] rounded-2xl ${
                        isPopular
                          ? 'bg-gradient-to-b from-blue-500/30 via-purple-500/20 to-transparent'
                          : 'bg-gradient-to-b from-white/10 via-white/5 to-transparent'
                      } blur-sm`} />
                    )}

                    <div className={`relative h-full rounded-2xl border p-6 transition-all duration-300 ${
                      isPopular
                        ? 'border-blue-500/30 bg-gradient-to-b from-blue-500/[0.08] via-[#0a0f1a] to-[#060a12] shadow-2xl shadow-blue-500/10'
                        : isSelected
                          ? 'border-white/[0.15] bg-white/[0.04] shadow-xl shadow-white/5'
                          : 'border-white/[0.06] bg-white/[0.02] hover:border-white/[0.1]'
                    }`}>
                      {isPopular && (
                        <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-10">
                          <span className="flex items-center gap-1 rounded-full bg-gradient-to-r from-blue-600 to-purple-600 px-4 py-1 text-xs font-semibold text-white shadow-lg shadow-blue-500/25">
                            <Sparkles className="h-3 w-3" />
                            Most Popular
                          </span>
                        </div>
                      )}

                      {isSelected && !isPopular && (
                        <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-10">
                          <span className="rounded-full bg-white/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-gray-300">
                            Selected
                          </span>
                        </div>
                      )}

                      {/* Plan header */}
                      <h3 className="text-lg font-bold text-white">{plan.name}</h3>
                      <p className="mt-1 text-xs text-gray-500">{plan.description}</p>

                      {/* Price */}
                      <div className="mt-5 flex items-baseline gap-1">
                        <span className="text-4xl font-extrabold text-white">
                          {plan.monthlyPrice === 0 ? 'Free' : `$${annual ? plan.yearlyPrice : plan.monthlyPrice}`}
                        </span>
                        {plan.monthlyPrice > 0 && (
                          <span className="text-sm text-gray-500">/{annual ? 'year' : 'mo'}</span>
                        )}
                      </div>

                      {/* Key stats from backend */}
                      <div className="mt-5 grid grid-cols-2 gap-3">
                        <div className="rounded-xl border border-white/[0.06] bg-white/[0.03] p-3">
                          <div className="flex items-center gap-1.5 mb-1">
                            <MessageSquare className="h-3 w-3 text-blue-400" />
                            <span className="text-[10px] font-medium uppercase tracking-wider text-gray-500">SMS/mo</span>
                          </div>
                          <p className="text-lg font-bold text-white">{plan.monthlyQuota != null ? formatQuota(plan.monthlyQuota) : '—'}</p>
                        </div>
                        <div className="rounded-xl border border-white/[0.06] bg-white/[0.03] p-3">
                          <div className="flex items-center gap-1.5 mb-1">
                            <Zap className="h-3 w-3 text-amber-400" />
                            <span className="text-[10px] font-medium uppercase tracking-wider text-gray-500">Daily</span>
                          </div>
                          <p className="text-lg font-bold text-white">{plan.dailyQuota != null ? formatQuota(plan.dailyQuota) : '—'}</p>
                        </div>
                        <div className="rounded-xl border border-white/[0.06] bg-white/[0.03] p-3">
                          <div className="flex items-center gap-1.5 mb-1">
                            <Smartphone className="h-3 w-3 text-emerald-400" />
                            <span className="text-[10px] font-medium uppercase tracking-wider text-gray-500">Devices</span>
                          </div>
                          <p className="text-lg font-bold text-white">{plan.maxDevices ?? '—'}</p>
                        </div>
                        <div className="rounded-xl border border-white/[0.06] bg-white/[0.03] p-3">
                          <div className="flex items-center gap-1.5 mb-1">
                            <CreditCard className="h-3 w-3 text-purple-400" />
                            <span className="text-[10px] font-medium uppercase tracking-wider text-gray-500">Per SMS</span>
                          </div>
                          <p className="text-lg font-bold text-white">
                            {(plan.pricePerSms ?? 0) === 0 ? 'Free' : `$${(plan.pricePerSms ?? 0).toFixed(4)}`}
                          </p>
                        </div>
                      </div>

                      {/* Features */}
                      <ul className="mt-5 space-y-2.5">
                        {plan.features.map((feature) => (
                          <li key={feature} className="flex items-start gap-2.5 text-xs text-gray-300">
                            <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-green-400" />
                            <span>{feature}</span>
                          </li>
                        ))}
                      </ul>

                      {/* CTA */}
                      <button
                        className={`mt-6 w-full flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold transition-all ${
                          isPopular
                            ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40'
                            : isSelected
                              ? 'bg-white/10 text-white hover:bg-white/15'
                              : 'border border-white/[0.1] bg-white/[0.04] text-white hover:bg-white/[0.08]'
                        }`}
                      >
                        {plan.cta}
                        <ArrowRight className="h-4 w-4" />
                      </button>
                    </div>
                  </motion.div>
                )
              })}
            </div>
          )}

          {/* Payment methods footer */}
          {paymentMethods.length > 0 && (
            <motion.div variants={fadeInUp} className="mt-14 flex flex-col items-center gap-3">
              <p className="text-xs font-medium uppercase tracking-wider text-gray-500">Accepted payment methods</p>
              <div className="flex flex-wrap items-center justify-center gap-3">
                {paymentMethods.map((pm) => {
                  const Icon = pm.method === 'bank_transfer' ? Banknote : pm.method === 'trc20' ? CreditCard : QrCode
                  return (
                    <span
                      key={pm.method}
                      className="flex items-center gap-2 rounded-xl border border-white/[0.06] bg-white/[0.03] px-4 py-2.5 text-sm text-gray-300 transition-colors hover:border-white/[0.12] hover:text-white"
                    >
                      <Icon className="h-4 w-4 text-blue-400" />
                      {pm.label}
                    </span>
                  )
                })}
              </div>
            </motion.div>
          )}

          {/* API integration note */}
          <motion.p variants={fadeInUp} className="mt-8 text-center text-xs text-gray-600">
            All plan data loaded from <code className="rounded bg-white/[0.04] px-1.5 py-0.5 text-gray-500">GET /api/v1/public/plans</code> • Includes device limits, daily/monthly SMS quotas, and per-message pricing
          </motion.p>
        </motion.div>
      </div>
    </section>
  )
}
