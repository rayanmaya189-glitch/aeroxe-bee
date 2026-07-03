import { motion } from 'framer-motion'
import { useInView } from 'react-intersection-observer'
import { staggerContainer, fadeInUp } from '../animations/variants'
import { INTEGRATIONS } from '../constants/data'

export function Integrations() {
  const [ref, inView] = useInView({ triggerOnce: true, threshold: 0.1 })

  return (
    <section id="resources" className="relative bg-[#030712] py-24 lg:py-32">
      <div className="absolute left-0 right-0 top-0 h-px bg-gradient-to-r from-transparent via-white/[0.08] to-transparent" />
      <div className="relative mx-auto max-w-[1280px] px-6">
        <motion.div
          initial="hidden"
          animate={inView ? 'visible' : 'hidden'}
          variants={staggerContainer}
          ref={ref}
          className="text-center"
        >
          <motion.div variants={fadeInUp}>
            <span className="mb-4 inline-block rounded-full border border-cyan-500/20 bg-cyan-500/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-cyan-400">Integrations</span>
            <h2 className="mt-4 text-4xl font-bold tracking-tight text-white lg:text-5xl">
              Connects with{' '}
              <span className="bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">everything</span>
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-lg text-gray-400">
              REST APIs, SDKs, webhooks, and native integrations with the tools you already use.
            </p>
          </motion.div>

          <motion.div variants={fadeInUp} className="mt-12 grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-8">
            {INTEGRATIONS.map((intg) => (
              <div
                key={intg.name}
                className="group flex flex-col items-center gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] p-5 transition-all hover:border-cyan-500/20 hover:bg-white/[0.04]"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/[0.06] transition-colors group-hover:bg-cyan-500/10">
                  <intg.icon className="h-5 w-5 text-gray-400 transition-colors group-hover:text-cyan-400" />
                </div>
                <span className="text-xs font-medium text-gray-400">{intg.name}</span>
              </div>
            ))}
          </motion.div>
        </motion.div>
      </div>
    </section>
  )
}
