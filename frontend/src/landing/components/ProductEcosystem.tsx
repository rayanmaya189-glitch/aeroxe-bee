import { motion } from 'framer-motion'
import { useInView } from 'react-intersection-observer'
import { ECOSYSTEM } from '../constants/data'
import { staggerContainer, fadeInUp } from '../animations/variants'

export function ProductEcosystem() {
  const [ref, inView] = useInView({ triggerOnce: true, threshold: 0.1 })

  return (
    <section id="ecosystem" className="relative bg-[#030712] py-24 lg:py-32">
      <div className="absolute left-0 right-0 top-0 h-px bg-gradient-to-r from-transparent via-white/[0.08] to-transparent" />
      <div className="absolute left-1/3 top-1/3 h-[400px] w-[400px] rounded-full bg-purple-600/10 blur-[120px]" />
      <div className="relative mx-auto max-w-[1280px] px-6">
        <motion.div
          initial="hidden"
          animate={inView ? 'visible' : 'hidden'}
          variants={staggerContainer}
          ref={ref}
        >
          <motion.div variants={fadeInUp} className="mb-16 text-center">
            <span className="mb-4 inline-block rounded-full border border-blue-500/20 bg-blue-500/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-blue-400">Ecosystem</span>
            <h2 className="mt-4 text-4xl font-bold tracking-tight text-white lg:text-5xl">
              A complete{' '}
              <span className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">platform ecosystem</span>
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-lg text-gray-400">
              Four interconnected products working together to deliver reliable SMS at scale.
            </p>
          </motion.div>

          <div className="grid gap-6 md:grid-cols-2">
            {ECOSYSTEM.map((product) => (
              <motion.div
                key={product.title}
                variants={fadeInUp}
                className="group relative rounded-2xl border border-white/[0.06] bg-white/[0.02] p-8 transition-all duration-300 hover:border-white/[0.12] hover:bg-white/[0.04]"
              >
                <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-white/[0.06] to-white/[0.02] shadow-lg">
                  <product.icon className="h-6 w-6 text-white" />
                </div>
                <h3 className="text-lg font-semibold text-white">{product.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-gray-400">{product.description}</p>
                <div className="mt-4 inline-flex items-center gap-1.5 rounded-full border border-white/[0.06] bg-white/[0.03] px-3 py-1">
                  <span className="text-[10px] font-medium text-gray-500">{product.badge}</span>
                </div>
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-white/[0.02] to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
              </motion.div>
            ))}
          </div>

          {/* How it works - abstract flow */}
          <motion.div variants={fadeInUp} className="mt-12 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-8">
            <div className="text-center text-sm font-medium text-gray-400 mb-6">How it works</div>
            <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center sm:gap-2">
              {['Devices', '\u2192', 'Intelligent Routing', '\u2192', 'Delivery', '\u2192', 'Analytics'].map((step, i) => (
                <span key={i} className={step === '\u2192' ? 'text-blue-500 text-lg hidden sm:inline' : 'rounded-lg border border-white/[0.06] bg-white/[0.04] px-4 py-2 text-xs font-medium text-white'}>
                  {step}
                </span>
              ))}
            </div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  )
}
