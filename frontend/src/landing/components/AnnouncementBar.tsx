import { motion } from 'framer-motion'
import { ArrowRight, Sparkles, Rocket } from 'lucide-react'

export function AnnouncementBar() {
  return (
    <div className="relative z-50 bg-gradient-to-r from-blue-600 via-purple-600 to-cyan-600">
      <div className="mx-auto max-w-[1280px] px-6">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-center gap-3 py-2.5"
        >
          <motion.span
            animate={{ rotate: [0, 15, -15, 0] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          >
            <Sparkles className="h-4 w-4 text-amber-300" />
          </motion.span>
          <span className="text-sm font-medium text-white">
            <Rocket className="mr-1.5 inline h-4 w-4" />
            Limited Time: Get 3 months free on Enterprise plans
          </span>
          <a
            href="/register"
            className="group inline-flex items-center gap-1 rounded-full bg-white/20 px-3 py-1 text-xs font-semibold text-white backdrop-blur-sm transition-all hover:bg-white/30"
          >
            Claim Offer
            <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
          </a>
        </motion.div>
      </div>
    </div>
  )
}
