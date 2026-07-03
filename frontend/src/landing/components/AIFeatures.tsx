import { motion } from 'framer-motion'
import { useInView } from 'react-intersection-observer'
import { AI_FEATURES } from '../constants/data'
import { staggerContainer, fadeInUp, slideInLeft } from '../animations/variants'

export function AIFeatures() {
  const [ref, inView] = useInView({ triggerOnce: true, threshold: 0.1 })

  return (
    <section className="relative bg-[#030712] py-24 lg:py-32">
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
              <span className="mb-4 inline-block rounded-full border border-purple-500/20 bg-purple-500/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-purple-400">AI Powered</span>
              <h2 className="mt-4 text-4xl font-bold tracking-tight text-white lg:text-5xl">
                Intelligence built into{' '}
                <span className="bg-gradient-to-r from-purple-400 to-cyan-400 bg-clip-text text-transparent">every message</span>
              </h2>
              <p className="mt-4 max-w-lg text-lg text-gray-400">
                Our AI engine analyzes millions of data points in real-time to optimize every aspect of your messaging pipeline.
              </p>
            </motion.div>

            <div className="mt-10 space-y-4">
              {AI_FEATURES.map((feature) => (
                <motion.div
                  key={feature.title}
                  variants={fadeInUp}
                  className="group rounded-xl border border-white/[0.06] bg-white/[0.02] p-5 transition-all hover:border-white/[0.12] hover:bg-white/[0.04]"
                >
                  <div className="flex items-start gap-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-purple-500/20 to-cyan-500/20">
                      <feature.icon className="h-5 w-5 text-purple-400" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-white">{feature.title}</h3>
                      <p className="mt-1 text-sm text-gray-400">{feature.description}</p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* AI Visual */}
          <motion.div
            initial="hidden"
            animate={inView ? 'visible' : 'hidden'}
            variants={slideInLeft}
            className="relative hidden lg:block"
          >
            <div className="relative rounded-2xl border border-white/[0.08] bg-[#0a0f1e] p-8">
              {/* Neural network visualization */}
              <div className="space-y-4">
                {['Route Optimization', 'Cost Prediction', 'Health Scoring', 'Anomaly Detection'].map((label, i) => (
                  <div key={label} className="flex items-center gap-3">
                    <div className="h-2 w-2 rounded-full bg-gradient-to-r from-purple-400 to-cyan-400" />
                    <div className="h-2 flex-1 rounded-full bg-white/[0.06]">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={inView ? { width: `${70 + i * 8}%` } : {}}
                        transition={{ duration: 1.5, delay: 0.5 + i * 0.2, ease: [0.22, 1, 0.36, 1] }}
                        className="h-full rounded-full bg-gradient-to-r from-purple-500/80 to-cyan-500/80"
                      />
                    </div>
                    <span className="text-xs text-gray-500 w-28 text-right">{label}</span>
                  </div>
                ))}
              </div>
              <div className="mt-6 rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
                <div className="text-xs text-gray-500">AI Confidence Score</div>
                <div className="mt-2 flex items-baseline gap-1">
                  <span className="text-3xl font-bold text-white">98.7</span>
                  <span className="text-sm text-green-400">+2.3%</span>
                </div>
                <div className="mt-3 h-2 rounded-full bg-white/[0.06]">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={inView ? { width: '98.7%' } : {}}
                    transition={{ duration: 2, delay: 1 }}
                    className="h-full rounded-full bg-gradient-to-r from-green-500 to-emerald-400"
                  />
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}
