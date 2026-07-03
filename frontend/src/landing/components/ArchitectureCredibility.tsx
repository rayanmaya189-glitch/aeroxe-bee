import { motion } from 'framer-motion'
import { useInView } from 'react-intersection-observer'
import { staggerContainer, fadeInUp } from '../animations/variants'
import { CREDIBILITY_POINTS } from '../constants/data'
import { TrendingUp } from 'lucide-react'

export function ArchitectureCredibility() {
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
            <span className="mb-4 inline-block rounded-full border border-emerald-500/20 bg-emerald-500/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-emerald-400">Engineering</span>
            <h2 className="mt-4 text-4xl font-bold tracking-tight text-white lg:text-5xl">
              Built on{' '}
              <span className="bg-gradient-to-r from-emerald-400 to-green-400 bg-clip-text text-transparent">proven engineering patterns</span>
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-lg text-gray-400">
              Every subsystem is designed for production reliability — not marketing claims.
            </p>
          </motion.div>

          <div className="grid gap-6 md:grid-cols-2">
            {CREDIBILITY_POINTS.map((point) => (
              <motion.div
                key={point.title}
                variants={fadeInUp}
                className="group flex items-start gap-5 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-8 transition-all duration-300 hover:border-white/[0.12] hover:bg-white/[0.04]"
              >
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500/20 to-green-500/20">
                  <point.icon className="h-6 w-6 text-emerald-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-white">{point.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-gray-400">{point.description}</p>
                </div>
              </motion.div>
            ))}
          </div>

          <motion.div variants={fadeInUp} className="mt-12 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-8">
            <div className="grid gap-6 sm:grid-cols-3">
              {[
                { value: 'p95 < 150ms', label: 'API Acceptance Latency' },
                { value: '0%', label: 'Duplicate Send Target' },
                { value: '99.5%+', label: 'API Availability Target' },
              ].map((stat) => (
                <div key={stat.label} className="text-center">
                  <div className="flex items-center justify-center gap-2">
                    <span className="text-2xl font-bold text-white">{stat.value}</span>
                    <TrendingUp className="h-4 w-4 text-green-400" />
                  </div>
                  <div className="mt-1 text-sm text-gray-400">{stat.label}</div>
                </div>
              ))}
            </div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  )
}
