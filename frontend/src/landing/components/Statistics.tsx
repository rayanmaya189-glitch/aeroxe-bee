import { motion } from 'framer-motion'
import { useInView } from 'react-intersection-observer'
import { staggerContainer, fadeInUp } from '../animations/variants'
import { useCountUp } from '../hooks/useScrollReveal'

const STAT_ITEMS = [
  { value: 99.99, label: 'Uptime SLA', suffix: '%', bar: 99.99, color: 'from-green-500 to-emerald-400' },
  { value: 142, label: 'Avg Latency', suffix: 'ms', bar: 85, color: 'from-blue-500 to-cyan-400' },
  { value: 99.7, label: 'Delivery Rate', suffix: '%', bar: 99.7, color: 'from-purple-500 to-pink-400' },
  { value: 40, label: 'Cost Reduction', suffix: '%', bar: 40, color: 'from-orange-500 to-amber-400' },
]

function StatBar({ value, label, suffix, bar, color, inView }: {
  value: number; label: string; suffix: string; bar: number; color: string; inView: boolean
}) {
  const { count, ref } = useCountUp(value, 2000)
  return (
    <div ref={ref} className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6">
      <div className="text-sm text-gray-400">{label}</div>
      <div className="mt-2 text-3xl font-bold text-white">
        {count}{suffix}
      </div>
      <div className="mt-4 h-2 rounded-full bg-white/[0.06]">
        <motion.div
          initial={{ width: 0 }}
          animate={inView ? { width: `${bar}%` } : {}}
          transition={{ duration: 1.5, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
          className={`h-full rounded-full bg-gradient-to-r ${color}`}
        />
      </div>
    </div>
  )
}

export function Statistics() {
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
            <span className="mb-4 inline-block rounded-full border border-emerald-500/20 bg-emerald-500/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-emerald-400">Performance</span>
            <h2 className="mt-4 text-4xl font-bold tracking-tight text-white lg:text-5xl">
              Numbers that{' '}
              <span className="bg-gradient-to-r from-emerald-400 to-green-400 bg-clip-text text-transparent">speak for themselves</span>
            </h2>
          </motion.div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {STAT_ITEMS.map((item) => (
              <StatBar key={item.label} {...item} inView={inView} />
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  )
}
