import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useInView } from 'react-intersection-observer'
import { Check, Sparkles, CreditCard, Banknote, QrCode } from 'lucide-react'
import { PRICING_PLANS } from '../constants/data'
import { staggerContainer, fadeInUp } from '../animations/variants'

interface ApiPlan {
  id: string
  name: string
  monthly_price: number
  daily_quota: number
  monthly_quota: number
  price_per_sms: number
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
}

function formatQuota(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(0)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`
  return String(n)
}

function mapApiPlanToPricing(apiPlan: ApiPlan, index: number): PricingPlan {
  // Match against known hardcoded plans for feature lists
  const fallback = PRICING_PLANS.find((p) => p.planId === apiPlan.id)
  if (fallback) {
    return {
      ...fallback,
      monthlyPrice: apiPlan.monthly_price || fallback.monthlyPrice,
      yearlyPrice: Math.round((apiPlan.monthly_price || fallback.monthlyPrice) * 10),
    }
  }
  // Unknown plan from API — render with generic features
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
    popular: index === 1,
  }
}

function PricingSkeleton() {
  return (
    <div className="grid gap-6 lg:grid-cols-3">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="animate-pulse rounded-2xl border border-white/[0.06] bg-white/[0.02] p-8">
          <div className="h-5 w-20 rounded bg-white/[0.06]" />
          <div className="mt-3 h-3 w-40 rounded bg-white/[0.04]" />
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

  return (
    <section id="pricing" className="relative bg-[#030712] py-24 lg:py-32">
      <div className="absolute left-0 right-0 top-0 h-px bg-gradient-to-r from-transparent via-white/[0.08] to-transparent" />
      <div className="absolute left-1/4 top-1/2 h-[400px] w-[400px] -translate-y-1/2 rounded-full bg-purple-600/10 blur-[120px]" />
      <div className="relative mx-auto max-w-[1280px] px-6">
        <motion.div
          initial="hidden"
          animate={inView ? 'visible' : 'hidden'}
          variants={staggerContainer}
          ref={ref}
        >
          <motion.div variants={fadeInUp} className="mb-12 text-center">
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
            <div className="grid gap-6 lg:grid-cols-3">
              {plans.map((plan) => (
                <motion.div
                  key={plan.name}
                  variants={fadeInUp}
                  className={`relative rounded-2xl border p-8 transition-all duration-300 ${
                    plan.popular
                      ? 'border-blue-500/30 bg-gradient-to-b from-blue-500/[0.08] to-transparent shadow-2xl shadow-blue-500/10'
                      : 'border-white/[0.06] bg-white/[0.02] hover:border-white/[0.12]'
                  }`}
                >
                  {plan.popular && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <span className="flex items-center gap-1 rounded-full bg-gradient-to-r from-blue-600 to-purple-600 px-4 py-1 text-xs font-semibold text-white shadow-lg shadow-blue-500/25">
                        <Sparkles className="h-3 w-3" />
                        Most Popular
                      </span>
                    </div>
                  )}

                  <h3 className="text-lg font-semibold text-white">{plan.name}</h3>
                  <p className="mt-1 text-sm text-gray-400">{plan.description}</p>

                  <div className="mt-6 flex items-baseline gap-1">
                    <span className="text-5xl font-bold text-white">
                      {plan.monthlyPrice === 0 ? 'Free' : `$${annual ? plan.yearlyPrice : plan.monthlyPrice}`}
                    </span>
                    {plan.monthlyPrice > 0 && (
                      <span className="text-sm text-gray-500">/{annual ? 'year' : 'mo'}</span>
                    )}
                  </div>

                  <button
                    className={`mt-8 w-full rounded-xl py-3 text-sm font-semibold transition-all ${
                      plan.popular
                        ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40'
                        : 'border border-white/[0.1] bg-white/[0.04] text-white hover:bg-white/[0.08]'
                    }`}
                  >
                    {plan.cta}
                  </button>

                  <ul className="mt-8 space-y-3">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex items-start gap-3 text-sm text-gray-300">
                        <Check className="mt-0.5 h-4 w-4 shrink-0 text-green-400" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                </motion.div>
              ))}
            </div>
          )}

          {/* Payment methods footer */}
          {paymentMethods.length > 0 && (
            <motion.div variants={fadeInUp} className="mt-12 flex flex-col items-center gap-3">
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
            Plans loaded from <code className="rounded bg-white/[0.04] px-1.5 py-0.5 text-gray-500">GET /api/v1/public/plans</code> • Payment methods from <code className="rounded bg-white/[0.04] px-1.5 py-0.5 text-gray-500">GET /api/v1/public/payment-methods</code>
          </motion.p>
        </motion.div>
      </div>
    </section>
  )
}
