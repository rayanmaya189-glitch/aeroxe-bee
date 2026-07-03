import { motion } from 'framer-motion'
import { useInView } from 'react-intersection-observer'
import { ROUTING_STRATEGIES } from '../constants/data'
import { staggerContainer, fadeInUp, slideInLeft } from '../animations/variants'

export function SmartRouting() {
  const [ref, inView] = useInView({ triggerOnce: true, threshold: 0.1 })

  return (
    <section id="features" className="relative bg-[#030712] py-24 lg:py-32">
      <div className="absolute left-0 right-0 top-0 h-px bg-gradient-to-r from-transparent via-white/[0.08] to-transparent" />
      <div className="relative mx-auto max-w-[1280px] px-6">
        <div className="grid items-center gap-16 lg:grid-cols-2">
          <motion.div
            initial="hidden"
            animate={inView ? 'visible' : 'hidden'}
            variants={staggerContainer}
            ref={ref}
          >
            <motion.div variants={fadeInUp}>
              <span className="mb-4 inline-block rounded-full border border-purple-500/20 bg-purple-500/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-purple-400">Smart Routing</span>
              <h2 className="mt-4 text-4xl font-bold tracking-tight text-white lg:text-5xl">
                Intelligent message routing{' '}
                <span className="bg-gradient-to-r from-purple-400 to-cyan-400 bg-clip-text text-transparent">for every use case</span>
              </h2>
              <p className="mt-4 max-w-lg text-lg text-gray-400">
                Choose from 5 routing strategies that weight reliability, cost, latency, and geography differently — so each message takes the optimal path.
              </p>
            </motion.div>

            <div className="mt-10 space-y-4">
              {ROUTING_STRATEGIES.map((strategy) => (
                <motion.div
                  key={strategy.title}
                  variants={fadeInUp}
                  className="group rounded-xl border border-white/[0.06] bg-white/[0.02] p-5 transition-all hover:border-white/[0.12] hover:bg-white/[0.04]"
                >
                  <div className="flex items-start gap-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-purple-500/20 to-cyan-500/20">
                      <strategy.icon className="h-5 w-5 text-purple-400" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-white">{strategy.title}</h3>
                      <p className="mt-1 text-sm text-gray-400">{strategy.description}</p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Routing visualization */}
          <motion.div
            initial="hidden"
            animate={inView ? 'visible' : 'hidden'}
            variants={slideInLeft}
            className="relative"
          >
            <div className="relative rounded-2xl border border-white/[0.08] bg-[#0a0f1e] p-8">
              <div className="space-y-4">
                {[
                  { label: 'Reliability Score', value: 92, color: 'from-green-500 to-emerald-400' },
                  { label: 'Reputation Score', value: 88, color: 'from-blue-500 to-cyan-400' },
                  { label: 'Cost Efficiency', value: 76, color: 'from-purple-500 to-pink-400' },
                  { label: 'Geo Affinity', value: 85, color: 'from-amber-500 to-orange-400' },
                ].map((item, i) => (
                  <div key={item.label} className="flex items-center gap-3">
                    <div className="h-2 w-2 rounded-full bg-gradient-to-r from-purple-400 to-cyan-400" />
                    <div className="h-2 flex-1 rounded-full bg-white/[0.06]">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={inView ? { width: `${item.value}%` } : {}}
                        transition={{ duration: 1.5, delay: 0.5 + i * 0.2, ease: [0.22, 1, 0.36, 1] }}
                        className={`h-full rounded-full bg-gradient-to-r ${item.color}`}
                      />
                    </div>
                    <span className="text-xs text-gray-500 w-28 text-right">{item.label}</span>
                  </div>
                ))}
              </div>
              <div className="mt-6 rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
                <div className="text-xs text-gray-500">Active Strategy</div>
                <div className="mt-2 flex items-baseline gap-1">
                  <span className="text-xl font-bold text-white">Highest Reliability</span>
                </div>
                <p className="mt-1 text-xs text-gray-400">Default for OTP traffic — maximizes delivery guarantees</p>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}
