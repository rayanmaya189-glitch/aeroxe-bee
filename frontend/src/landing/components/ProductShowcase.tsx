import { motion } from 'framer-motion'
import { useInView } from 'react-intersection-observer'
import { staggerContainer, fadeInUp } from '../animations/variants'

export function ProductShowcase() {
  const [ref, inView] = useInView({ triggerOnce: true, threshold: 0.1 })

  return (
    <section className="relative bg-[#030712] py-24 lg:py-32">
      <div className="absolute left-0 right-0 top-0 h-px bg-gradient-to-r from-transparent via-white/[0.08] to-transparent" />
      <div className="absolute right-0 top-1/3 h-[400px] w-[400px] rounded-full bg-blue-600/10 blur-[120px]" />
      <div className="relative mx-auto max-w-[1280px] px-6">
        <motion.div
          initial="hidden"
          animate={inView ? 'visible' : 'hidden'}
          variants={staggerContainer}
          ref={ref}
        >
          <motion.div variants={fadeInUp} className="mb-16 text-center">
            <span className="mb-4 inline-block rounded-full border border-blue-500/20 bg-blue-500/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-blue-400">Product</span>
            <h2 className="mt-4 text-4xl font-bold tracking-tight text-white lg:text-5xl">
              A dashboard built for{' '}
              <span className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">speed</span>
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-lg text-gray-400">
              Monitor, manage, and optimize your entire SMS infrastructure from one powerful interface.
            </p>
          </motion.div>

          <motion.div variants={fadeInUp} className="relative">
            <div className="rounded-2xl border border-white/[0.08] bg-gradient-to-b from-white/[0.05] to-transparent p-1 shadow-2xl shadow-black/50">
              <div className="rounded-xl bg-[#0a0f1e] p-8">
                {/* Dashboard mockup with feature callouts */}
                <div className="grid gap-6 lg:grid-cols-3">
                  {/* Main chart */}
                  <div className="lg:col-span-2 rounded-xl border border-white/[0.06] bg-white/[0.02] p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="text-sm font-medium text-white">Message Delivery Trends</div>
                      <div className="flex gap-2">
                        {['7D', '30D', '90D'].map((period) => (
                          <button key={period} className={`rounded-lg px-3 py-1 text-xs font-medium ${period === '30D' ? 'bg-white/10 text-white' : 'text-gray-500 hover:text-gray-400'}`}>{period}</button>
                        ))}
                      </div>
                    </div>
                    <div className="flex items-end gap-1 h-40">
                      {Array.from({ length: 30 }, (_, i) => {
                        const h = 30 + Math.sin(i * 0.5) * 25 + (i * 7 % 20)
                        return (
                          <div
                            key={i}
                            className="flex-1 rounded-t bg-gradient-to-t from-blue-600/60 to-blue-400/60"
                            style={{ height: `${h}%` }}
                          />
                        )
                      })}
                    </div>
                  </div>

                  {/* Side metrics */}
                  <div className="space-y-4">
                    <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
                      <div className="text-xs text-gray-500">Active Devices</div>
                      <div className="mt-1 text-2xl font-bold text-white">248</div>
                      <div className="mt-2 h-2 rounded-full bg-white/[0.06]">
                        <div className="h-full w-[85%] rounded-full bg-gradient-to-r from-green-500 to-emerald-400" />
                      </div>
                    </div>
                    <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
                      <div className="text-xs text-gray-500">Queue Depth</div>
                      <div className="mt-1 text-2xl font-bold text-white">1,247</div>
                      <div className="mt-2 h-2 rounded-full bg-white/[0.06]">
                        <div className="h-full w-[45%] rounded-full bg-gradient-to-r from-amber-500 to-orange-400" />
                      </div>
                    </div>
                    <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
                      <div className="text-xs text-gray-500">AI Confidence</div>
                      <div className="mt-1 text-2xl font-bold text-white">98.7%</div>
                      <div className="mt-2 h-2 rounded-full bg-white/[0.06]">
                        <div className="h-full w-[98.7%] rounded-full bg-gradient-to-r from-purple-500 to-pink-400" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  )
}
