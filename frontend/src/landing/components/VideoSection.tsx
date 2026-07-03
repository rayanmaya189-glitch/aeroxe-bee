import { motion } from 'framer-motion'
import { useInView } from 'react-intersection-observer'
import { Play } from 'lucide-react'
import { fadeInUp } from '../animations/variants'

export function VideoSection() {
  const [ref, inView] = useInView({ triggerOnce: true, threshold: 0.1 })

  return (
    <section className="relative bg-[#030712] py-24 lg:py-32">
      <div className="absolute left-0 right-0 top-0 h-px bg-gradient-to-r from-transparent via-white/[0.08] to-transparent" />
      <div className="relative mx-auto max-w-4xl px-6">
        <motion.div
          initial="hidden"
          animate={inView ? 'visible' : 'hidden'}
          variants={fadeInUp}
          ref={ref}
          className="text-center"
        >
          <span className="mb-4 inline-block rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-gray-400">Demo</span>
          <h2 className="mt-4 text-4xl font-bold tracking-tight text-white lg:text-5xl">
            See it in{' '}
            <span className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">action</span>
          </h2>

          <div className="relative mt-12 overflow-hidden rounded-3xl border border-white/[0.08] bg-white/[0.02]">
            <div className="aspect-video bg-gradient-to-br from-[#0a0f1e] to-[#111827] flex items-center justify-center">
              <div className="relative group cursor-pointer">
                <div className="absolute inset-0 rounded-full bg-blue-500/20 blur-2xl transition-all group-hover:bg-blue-500/30 group-hover:blur-3xl" />
                <div className="relative flex h-20 w-20 items-center justify-center rounded-full bg-white/10 backdrop-blur-xl border border-white/20 transition-all group-hover:scale-110 group-hover:bg-white/15">
                  <Play className="h-8 w-8 text-white fill-white ml-1" />
                </div>
              </div>
            </div>
          </div>
          <p className="mt-6 text-sm text-gray-500">Watch how AeroXe Bee transforms SMS delivery in under 3 minutes</p>
        </motion.div>
      </div>
    </section>
  )
}
