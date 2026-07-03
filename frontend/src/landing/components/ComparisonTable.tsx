import { motion } from 'framer-motion'
import { useInView } from 'react-intersection-observer'
import { Check, X } from 'lucide-react'
import { COMPARISON_ROWS } from '../constants/data'
import { staggerContainer, fadeInUp } from '../animations/variants'

export function ComparisonTable() {
  const [ref, inView] = useInView({ triggerOnce: true, threshold: 0.1 })

  return (
    <section className="relative bg-[#030712] py-24 lg:py-32">
      <div className="absolute left-0 right-0 top-0 h-px bg-gradient-to-r from-transparent via-white/[0.08] to-transparent" />
      <div className="relative mx-auto max-w-4xl px-6">
        <motion.div
          initial="hidden"
          animate={inView ? 'visible' : 'hidden'}
          variants={staggerContainer}
          ref={ref}
        >
          <motion.div variants={fadeInUp} className="mb-12 text-center">
            <span className="mb-4 inline-block rounded-full border border-blue-500/20 bg-blue-500/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-blue-400">Why Us</span>
            <h2 className="mt-4 text-4xl font-bold tracking-tight text-white lg:text-5xl">
              Why teams choose{' '}
              <span className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">AeroXe Bee</span>
            </h2>
          </motion.div>

          <motion.div variants={fadeInUp} className="overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.02]">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-white/[0.08]">
                  <th className="px-6 py-4 text-gray-400">Feature</th>
                  <th className="px-6 py-4 text-center">
                    <span className="rounded-lg bg-gradient-to-r from-blue-600 to-purple-600 px-3 py-1 text-xs font-bold text-white">AeroXe Bee</span>
                  </th>
                  <th className="px-6 py-4 text-center text-gray-400">Competitor A</th>
                  <th className="px-6 py-4 text-center text-gray-400">Competitor B</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.06]">
                {COMPARISON_ROWS.map((row) => (
                  <tr key={row.feature} className="transition-colors hover:bg-white/[0.02]">
                    <td className="px-6 py-4 font-medium text-white">{row.feature}</td>
                    <td className="px-6 py-4 text-center">
                      {row.us ? (
                        <Check className="mx-auto h-5 w-5 text-green-400" />
                      ) : (
                        <X className="mx-auto h-5 w-5 text-gray-600" />
                      )}
                    </td>
                    <td className="px-6 py-4 text-center">
                      {row.competitor1 ? (
                        <Check className="mx-auto h-5 w-5 text-gray-500" />
                      ) : (
                        <X className="mx-auto h-5 w-5 text-gray-600" />
                      )}
                    </td>
                    <td className="px-6 py-4 text-center">
                      {row.competitor2 ? (
                        <Check className="mx-auto h-5 w-5 text-gray-500" />
                      ) : (
                        <X className="mx-auto h-5 w-5 text-gray-600" />
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </motion.div>
        </motion.div>
      </div>
    </section>
  )
}
