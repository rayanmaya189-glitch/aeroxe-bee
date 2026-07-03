import { useState } from 'react'
import { motion } from 'framer-motion'
import { useInView } from 'react-intersection-observer'
import { Check, Sparkles } from 'lucide-react'
import { PRICING_PLANS } from '../constants/data'
import { staggerContainer, fadeInUp } from '../animations/variants'

export function Pricing() {
  const [annual, setAnnual] = useState(false)
  const [ref, inView] = useInView({ triggerOnce: true, threshold: 0.1 })

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

          <div className="grid gap-6 lg:grid-cols-3">
            {PRICING_PLANS.map((plan) => (
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
                  <span className="text-5xl font-bold text-white">${annual ? plan.yearlyPrice : plan.monthlyPrice}</span>
                  <span className="text-sm text-gray-500">/{annual ? 'year' : 'mo'}</span>
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
        </motion.div>
      </div>
    </section>
  )
}
