import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useInView } from 'react-intersection-observer'
import { Check, Sparkles, CreditCard, Banknote, QrCode, Smartphone, Zap, MessageSquare, ArrowRight } from 'lucide-react'
import { PRICING_PLANS } from '../constants/data'
import { staggerContainer, fadeInUp } from '../animations/variants'
import { useIsMobile, useIsTablet } from '@/hooks/useMediaQuery'

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
  is_popular: boolean
  cta_text: string
}

interface PricingPlan {
  name: string
  planId: string
  monthlyPrice: number
  yearlyPrice: number
  description: string
  features?: readonly string[]
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

function formatRoutingStrategy(strategy: string): string {
  const map: Record<string, string> = {
    fastest_delivery: 'Fastest delivery routing',
    lowest_cost: 'Lowest-cost routing',
    highest_reliability: 'Highest-reliability routing',
    geo_affinity: 'Geo-affinity routing',
    profit_optimized: 'Profit-optimized routing',
  }
  return map[strategy] ?? strategy.replace(/_/g, ' ') + ' routing'
}

/**
 * Generate feature list dynamically from the backend plan properties.
 * Position index (0-based) determines tier-dependent labels (analytics, support, CTA).
 */
function generateFeatures(plan: ApiPlan, index: number, totalPlans: number): string[] {
  const features: string[] = []

  // 1. SMS quota
  features.push(`${formatQuota(plan.monthly_quota)} SMS/month`)

  // 2. Daily quota
  features.push(`${formatQuota(plan.daily_quota)} daily SMS`)

  // 3. Device connections
  features.push(`${plan.max_devices} device connection${plan.max_devices !== 1 ? 's' : ''}`)

  // 4. Routing strategy
  features.push(formatRoutingStrategy(plan.default_routing_strategy))

  // 5. Analytics level (tier-dependent)
  if (index === 0) {
    features.push('Basic analytics')
  } else if (index <= 1) {
    features.push('Advanced analytics')
  } else {
    features.push('Full analytics suite')
  }

  // 6. Support level (tier-dependent)
  if (index === 0) {
    features.push('Community support')
  } else if (index <= 1) {
    features.push('Priority support')
  } else if (index <= 2) {
    features.push('Dedicated support')
  } else {
    features.push('Dedicated support & custom SLA')
  }

  // 7. Device pool
  features.push(plan.dedicated_pool ? 'Dedicated device pool' : 'Shared device pool')

  // 8. Webhooks (only for paid plans)
  if (plan.monthly_price > 0) {
    features.push('Custom webhooks')
  }

  // 9. OTP system (only for paid plans)
  if (plan.monthly_price > 0) {
    features.push('OTP system')
  }

  // 10. Cost tracking (only for scale+ plans)
  if (index >= 2) {
    features.push('Cost & profit tracking')
  }

  // 11. Custom integrations (enterprise only)
  if (index === totalPlans - 1 && plan.monthly_price > 0) {
    features.push('Custom integrations')
  }

  // 12. API access (always included)
  features.push('API access')

  return features
}

function mapApiPlanToPricing(apiPlan: ApiPlan, _index: number, _totalPlans: number): PricingPlan {
  const fallback = PRICING_PLANS.find((p) => p.planId === apiPlan.id)
  // Always generate features dynamically from backend data
  const features = generateFeatures(apiPlan, _index, _totalPlans)
  const monthlyPrice = apiPlan.monthly_price ?? fallback?.monthlyPrice ?? 0
  const description = fallback?.description ?? `${formatQuota(apiPlan.monthly_quota)} SMS/month`
  // CTA and popular are now fully dynamic from the backend
  const cta = apiPlan.cta_text || fallback?.cta || 'Get Started'
  const popular = apiPlan.is_popular ?? fallback?.popular ?? false

  return {
    name: apiPlan.name,
    planId: apiPlan.id,
    monthlyPrice,
    yearlyPrice: Math.round(monthlyPrice * 10),
    description,
    features,
    cta,
    popular,
    monthlyQuota: apiPlan.monthly_quota,
    dailyQuota: apiPlan.daily_quota,
    maxDevices: apiPlan.max_devices,
    pricePerSms: apiPlan.price_per_sms,
    routingStrategy: apiPlan.default_routing_strategy,
    dedicatedPool: apiPlan.dedicated_pool,
  }
}

function PricingSkeleton({ isMobile, isTablet }: { isMobile: boolean; isTablet: boolean }) {
  const cols = isMobile ? 'grid-cols-1' : isTablet ? 'grid-cols-2' : 'grid-cols-4'
  return (
    <div className={`grid gap-4 ${cols}`}>
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
  const [hoveredPlan, setHoveredPlan] = useState<string | null>(null)
  const [paymentMethods, setPaymentMethods] = useState<{ method: string; label: string }[]>([])
  const [loading, setLoading] = useState(true)
  const [ref, inView] = useInView({ triggerOnce: true, threshold: 0.1 })
  const isMobile = useIsMobile()
  const isTablet = useIsTablet()

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
            const filtered = json.data
              .filter((p: ApiPlan) => p.monthly_price !== undefined)
              .sort((a: ApiPlan, b: ApiPlan) => a.monthly_price - b.monthly_price)
            const mapped = filtered.map((p: ApiPlan, i: number) => mapApiPlanToPricing(p, i, filtered.length))
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
        // API unavailable - keep hardcoded fallback
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
  }, [plans, selectedPlan])

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
            <h2 className="mt-4 text-3xl font-bold tracking-tight text-white sm:text-4xl lg:text-5xl">
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
            <PricingSkeleton isMobile={isMobile} isTablet={isTablet} />
          ) : (
            <div
              className={`grid gap-4 ${isMobile ? 'grid-cols-1' : isTablet ? 'grid-cols-2' : 'grid-cols-4'}`}
              style={{ perspective: isMobile ? undefined : 1200 }}
            >
              {plans.map((plan, idx) => {
                const isSelected = selectedPlan === plan.planId
                const isPopular = plan.popular

                // 3D depth offsets reduced on smaller screens
                const offsets = isMobile ? [0, 0, 0, 0] : isTablet ? [-1, 1, -1, 1] : [-3, -1, 1, 3]
                const offsetX = offsets[idx] ?? 0
                const maxDepth = isMobile ? 0 : isTablet ? 6 : 20
                const offsetZ = isSelected ? maxDepth : Math.abs(offsetX) * (isMobile ? 0 : isTablet ? -2 : -3)
                const rotationY = isSelected ? 0 : offsetX * (isMobile ? 0 : isTablet ? 0.6 : 1.2)

                return (
                  <motion.div
                    key={plan.planId}
                    variants={fadeInUp}
                    onClick={() => setSelectedPlan(plan.planId)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        setSelectedPlan(plan.planId)
                      }
                    }}
                    onMouseEnter={() => setHoveredPlan(plan.planId)}
                    onMouseLeave={() => setHoveredPlan(null)}
                    role="button"
                    tabIndex={0}
                    className="relative cursor-pointer"
                    style={{ transformStyle: 'preserve-3d' }}
                    animate={{
                      rotateY: rotationY,
                      translateZ: offsetZ,
                      scale: 1,
                    }}
                    whileHover={
                      isMobile
                        ? undefined
                        : {
                            rotateY: 0,
                            translateZ: 30,
                            scale: 1.02,
                          }
                    }
                    transition={{
                      type: 'spring',
                      stiffness: 200,
                      damping: 25,
                    }}
                  >
                    {/* Glow effect for selected/popular */}
                    {(isSelected || isPopular) && (
                      <div
                        className={`absolute -inset-px rounded-2xl blur-sm ${
                          isPopular
                            ? 'bg-gradient-to-b from-blue-500/30 via-purple-500/20 to-transparent'
                            : 'bg-gradient-to-b from-white/10 via-white/5 to-transparent'
                        }`}
                      />
                    )}

                    <div
                      className={`relative h-full rounded-2xl border p-6 transition-all duration-300 ${
                        isPopular
                          ? 'border-blue-500/30 bg-gradient-to-b from-blue-500/[0.08] via-[#0a0f1a] to-[#060a12] shadow-2xl shadow-blue-500/10'
                          : isSelected
                            ? 'border-white/[0.15] bg-white/[0.04] shadow-xl shadow-white/5'
                            : 'border-white/[0.06] bg-white/[0.02] hover:border-white/[0.1]'
                      }`}
                    >
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
                        <StatCard icon={<MessageSquare className="h-3 w-3 text-blue-400" />} label="SMS/mo" value={plan.monthlyQuota != null ? formatQuota(plan.monthlyQuota) : '\u2014'} />
                        <StatCard icon={<Zap className="h-3 w-3 text-amber-400" />} label="Daily" value={plan.dailyQuota != null ? formatQuota(plan.dailyQuota) : '\u2014'} />
                        <StatCard icon={<Smartphone className="h-3 w-3 text-emerald-400" />} label="Devices" value={plan.maxDevices != null ? String(plan.maxDevices) : '\u2014'} />
                        <StatCard icon={<CreditCard className="h-3 w-3 text-purple-400" />} label="Per SMS" value={(plan.pricePerSms ?? 0) === 0 ? 'Free' : `$${(plan.pricePerSms ?? 0).toFixed(4)}`} />
                      </div>

                      {/* Features */}
                      <ul className="mt-5 space-y-2.5">
                        {(plan.features ?? []).map((feature) => (
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

          {/* Feature comparison table */}
          {!loading && plans.length > 0 && (
            <motion.div variants={fadeInUp} className="mt-16">
              <FeatureComparisonTable plans={plans} hoveredPlan={hoveredPlan} onHoveredPlanChange={setHoveredPlan} />
            </motion.div>
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

          <motion.p variants={fadeInUp} className="mt-8 text-center text-xs text-gray-600">
            All plan data loaded from{' '}
            <code className="rounded bg-white/[0.04] px-1.5 py-0.5 text-gray-500">GET /api/v1/public/plans</code>{' '}
            &middot; Includes device limits, daily/monthly SMS quotas, and per-message pricing
          </motion.p>
        </motion.div>
      </div>
    </section>
  )
}

/**
 * Single source of truth for comparison table rows.
 * Each entry defines a label, a regex pattern to match against the plan's features array,
 * and a render mode: 'value' shows the matched feature string, 'boolean' shows check/dash.
 */
const FEATURE_CATEGORIES: { label: string; pattern: RegExp; render: 'value' | 'boolean' }[] = [
  { label: 'Monthly SMS', pattern: /SMS\/month/, render: 'value' },
  { label: 'Daily SMS', pattern: /daily SMS/, render: 'value' },
  { label: 'Devices', pattern: /device connection/, render: 'value' },
  { label: 'Routing', pattern: /routing/, render: 'value' },
  { label: 'Analytics', pattern: /analytics/, render: 'value' },
  { label: 'Support', pattern: /support/, render: 'value' },
  { label: 'Device Pool', pattern: /device pool/, render: 'value' },
  { label: 'Webhooks', pattern: /webhook/, render: 'boolean' },
  { label: 'OTP System', pattern: /OTP/, render: 'boolean' },
  { label: 'Cost Tracking', pattern: /cost.*track/, render: 'boolean' },
  { label: 'Integrations', pattern: /integration/, render: 'boolean' },
  { label: 'API Access', pattern: /API access/, render: 'boolean' },
]

function FeatureComparisonTable({ plans, hoveredPlan, onHoveredPlanChange }: { plans: PricingPlan[]; hoveredPlan: string | null; onHoveredPlanChange: (planId: string | null) => void }) {
  // Derive comparison rows from plans' features arrays using FEATURE_CATEGORIES patterns
  const categories = FEATURE_CATEGORIES.map((cat) => ({
    label: cat.label,
    values: plans.map((plan) => {
      const feature = (plan.features ?? []).find((f) => cat.pattern.test(f))
      return cat.render === 'boolean' ? feature !== undefined : (feature ?? '\u2014')
    }),
  }))

  return (
    <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] overflow-hidden">
      <div className="px-6 py-4 border-b border-white/[0.06]">
        <h3 className="text-sm font-semibold text-white">Compare all features</h3>
        <p className="text-xs text-gray-500 mt-0.5">See what each plan includes at a glance</p>
      </div>

      {/* Desktop table */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/[0.06]">
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/5">Feature</th>
              {plans.map((plan) => (
                <th
                  key={plan.planId}
                  onMouseEnter={() => onHoveredPlanChange(plan.planId)}
                  onMouseLeave={() => onHoveredPlanChange(null)}
                  onFocus={() => onHoveredPlanChange(plan.planId)}
                  onBlur={() => onHoveredPlanChange(null)}
                  tabIndex={0}
                  className={`px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider transition-colors duration-200 ${
                    hoveredPlan === plan.planId
                      ? 'bg-white/[0.04] text-white'
                      : plan.popular
                        ? 'text-blue-400'
                        : 'text-gray-400'
                  }`}
                >
                  {plan.name}
                  {plan.popular && (
                    <span className="ml-1.5 inline-block rounded-full bg-blue-500/20 px-1.5 py-0.5 text-[9px] text-blue-400">Popular</span>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.04]">
            {categories.map((cat, catIdx) => (
              <tr key={cat.label} className={catIdx % 2 === 0 ? 'bg-white/[0.01]' : ''}>
                <td className="px-6 py-3 text-xs font-medium text-gray-300">{cat.label}</td>
                {cat.values.map((val, planIdx) => (
                  <td key={plans[planIdx]?.planId ?? planIdx} className="px-4 py-3 text-center">
                    {typeof val === 'boolean' ? (
                      val ? (
                        <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-green-500/10">
                          <Check className="h-3 w-3 text-green-400" />
                        </span>
                      ) : (
                        <span className="text-gray-600">\u2014</span>
                      )
                    ) : (
                      <span className="text-xs text-gray-300">{val}</span>
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile stacked view */}
      <div className="md:hidden">
        {plans.map((plan, planIdx) => (
          <div key={plan.planId} className="border-b border-white/[0.06] last:border-b-0">
            <div className="px-4 py-3 flex items-center justify-between">
              <span className={`text-sm font-semibold ${plan.popular ? 'text-blue-400' : 'text-white'}`}>{plan.name}</span>
              {plan.popular && (
                <span className="rounded-full bg-blue-500/20 px-2 py-0.5 text-[9px] font-semibold text-blue-400">Popular</span>
              )}
            </div>
            <div className="px-4 pb-3 space-y-2">
              {categories.map((cat) => {
                const val = cat.values[planIdx]
                return (
                  <div key={cat.label} className="flex items-center justify-between text-xs">
                    <span className="text-gray-500">{cat.label}</span>
                    {typeof val === 'boolean' ? (
                      val ? (
                        <Check className="h-3.5 w-3.5 text-green-400" />
                      ) : (
                        <span className="text-gray-600">\u2014</span>
                      )
                    ) : (
                      <span className="text-gray-300">{String(val)}</span>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/[0.06] bg-white/[0.03] p-3">
      <div className="flex items-center gap-1.5 mb-1">
        {icon}
        <span className="text-[10px] font-medium uppercase tracking-wider text-gray-500">{label}</span>
      </div>
      <p className="text-lg font-bold text-white">{value}</p>
    </div>
  )
}
