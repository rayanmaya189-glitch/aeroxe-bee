import { motion } from 'framer-motion'
import { useInView } from 'react-intersection-observer'
import { staggerContainer, fadeInUp } from '../animations/variants'
import { TrendingUp, ArrowUpRight } from 'lucide-react'

const CASE_STUDIES = [
  {
    company: 'TechFlow Inc.',
    industry: 'SaaS',
    quote: 'We reduced SMS delivery costs by 42% while improving delivery rates from 85% to 99.7%.',
    metrics: [
      { label: 'Cost Reduction', value: '42%' },
      { label: 'Delivery Rate', value: '99.7%' },
      { label: 'ROI', value: '12x' },
    ],
    gradient: 'from-blue-500 to-cyan-500',
  },
  {
    company: 'DataSync Corp.',
    industry: 'FinTech',
    quote: 'AeroXe Bee\'s AI routing saved us $40K/month while handling 3x more transaction alerts.',
    metrics: [
      { label: 'Monthly Savings', value: '$40K' },
      { label: 'Volume Growth', value: '3x' },
      { label: 'Latency', value: '-67%' },
    ],
    gradient: 'from-purple-500 to-pink-500',
  },
  {
    company: 'CloudBase',
    industry: 'Healthcare',
    quote: 'Managing 500 devices across 12 hospitals became effortless with fleet management.',
    metrics: [
      { label: 'Devices Managed', value: '500+' },
      { label: 'Hospitals', value: '12' },
      { label: 'Downtime', value: '0%' },
    ],
    gradient: 'from-green-500 to-emerald-500',
  },
]

export function CustomerSuccess() {
  const [ref, inView] = useInView({ triggerOnce: true, threshold: 0.1 })

  return (
    <section className="relative bg-[#030712] py-24 lg:py-32">
      <div className="absolute left-0 right-0 top-0 h-px bg-gradient-to-r from-transparent via-white/[0.08] to-transparent" />
      <div className="relative mx-auto max-w-[1280px] px-6">
        <motion.div
          initial="hidden"
          animate={inView ? 'visible' : 'hidden'}
          variants={staggerContainer}
          ref={ref}
        >
          <motion.div variants={fadeInUp} className="mb-16 text-center">
            <span className="mb-4 inline-block rounded-full border border-emerald-500/20 bg-emerald-500/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-emerald-400">Customer Success</span>
            <h2 className="mt-4 text-4xl font-bold tracking-tight text-white lg:text-5xl">
              Real results from{' '}
              <span className="bg-gradient-to-r from-emerald-400 to-green-400 bg-clip-text text-transparent">real companies</span>
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-lg text-gray-400">
              See how industry leaders transformed their messaging infrastructure with AeroXe Bee.
            </p>
          </motion.div>

          <div className="grid gap-6 lg:grid-cols-3">
            {CASE_STUDIES.map((study) => (
              <motion.div
                key={study.company}
                variants={fadeInUp}
                className="group rounded-2xl border border-white/[0.06] bg-white/[0.02] p-8 transition-all duration-300 hover:border-white/[0.12] hover:bg-white/[0.04]"
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ${study.gradient}`}>
                    <span className="text-sm font-bold text-white">{study.company[0]}</span>
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-white">{study.company}</div>
                    <div className="text-xs text-gray-500">{study.industry}</div>
                  </div>
                </div>

                <blockquote className="text-sm leading-relaxed text-gray-300">
                  &ldquo;{study.quote}&rdquo;
                </blockquote>

                <div className="mt-6 grid grid-cols-3 gap-3">
                  {study.metrics.map((metric) => (
                    <div key={metric.label} className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <span className="text-lg font-bold text-white">{metric.value}</span>
                        <TrendingUp className="h-3 w-3 text-green-400" />
                      </div>
                      <div className="mt-1 text-[10px] text-gray-500">{metric.label}</div>
                    </div>
                  ))}
                </div>

                <div className="mt-6 flex items-center gap-1 text-sm font-medium text-blue-400 transition-colors group-hover:text-blue-300">
                  Read full case study
                  <ArrowUpRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  )
}
