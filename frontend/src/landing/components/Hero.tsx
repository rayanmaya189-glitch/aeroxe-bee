import { motion } from 'framer-motion'
import { ArrowRight, Play, Star, MessageSquare, Globe } from 'lucide-react'
import { staggerContainer, fadeInUp, blurReveal, float } from '../animations/variants'
import { STATS, TRUSTED_COMPANIES } from '../constants/data'
import { useCountUp } from '../hooks/useScrollReveal'

function formatStat(value: number, count: number): string {
  if (value >= 1_000_000_000) return `${(count / 1_000_000_000).toFixed(1)}B`
  if (value >= 1_000_000) return `${(count / 1_000_000).toFixed(0)}M`
  if (value >= 1_000) return `${(count / 1_000).toFixed(0)}K`
  return String(count)
}

function StatCounter({ value, label, suffix }: { value: number; label: string; suffix: string }) {
  const { count, ref } = useCountUp(value, 2000)
  return (
    <div ref={ref} className="text-center">
      <div className="text-3xl font-bold text-white lg:text-4xl">
        {formatStat(value, count)}{suffix}
      </div>
      <div className="mt-1 text-sm text-gray-400">{label}</div>
    </div>
  )
}

export function Hero() {
  return (
    <section className="relative min-h-screen overflow-hidden bg-[#030712]">
      {/* Background grid */}
      <div className="absolute inset-0" style={{
        backgroundImage: `linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)`,
        backgroundSize: '64px 64px',
      }} />

      {/* Animated blobs */}
      <div className="absolute left-1/4 top-20 h-[500px] w-[500px] rounded-full bg-blue-600/20 blur-[128px]" />
      <div className="absolute right-1/4 top-40 h-[400px] w-[400px] rounded-full bg-purple-600/20 blur-[128px]" />
      <div className="absolute bottom-20 left-1/2 h-[300px] w-[300px] -translate-x-1/2 rounded-full bg-cyan-500/10 blur-[100px]" />

      <div className="relative mx-auto max-w-[1280px] px-6 pt-16 lg:pt-24">
        {/* Announcement bar */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="mx-auto mb-8 w-fit"
        >
          <a href="#features" className="group flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-gray-300 backdrop-blur-sm transition-all hover:border-white/20 hover:bg-white/10">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-gradient-to-r from-blue-500 to-purple-500">
              <Star className="h-3 w-3 text-white" fill="currentColor" />
            </span>
            <span>New: 5 smart routing strategies now available</span>
            <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
          </a>
        </motion.div>

        {/* Main heading */}
        <motion.div
          initial="hidden"
          animate="visible"
          variants={staggerContainer}
          className="text-center"
        >
          <motion.h1 variants={blurReveal} className="mx-auto max-w-4xl text-5xl font-extrabold tracking-tight text-white sm:text-6xl lg:text-7xl xl:text-8xl">
            The future of{' '}
            <span className="bg-gradient-to-r from-blue-400 via-purple-400 to-cyan-400 bg-clip-text text-transparent">
              SMS delivery
            </span>{' '}
            is here
          </motion.h1>

          <motion.p variants={fadeInUp} className="mx-auto mt-6 max-w-2xl text-lg text-gray-400 lg:mt-8 lg:text-xl">
            Smart routing strategies, real-time delivery confidence scoring, device fleet management, and priority queues — all from a single platform.
            Self-hostable or managed SaaS.
          </motion.p>

          {/* CTAs */}
          <motion.div variants={fadeInUp} className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row lg:mt-12">
            <a
              href="/register"
              className="group relative flex items-center gap-2 rounded-2xl bg-gradient-to-r from-blue-600 to-purple-600 px-8 py-4 text-base font-semibold text-white shadow-2xl shadow-blue-500/25 transition-all hover:shadow-blue-500/40 hover:brightness-110"
            >
              Start Free Trial
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              <div className="absolute inset-0 rounded-2xl bg-white/10 opacity-0 transition-opacity group-hover:opacity-100" />
            </a>
            <a
              href="#demo"
              className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-8 py-4 text-base font-semibold text-gray-300 backdrop-blur-sm transition-all hover:border-white/20 hover:text-white"
            >
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-white/10">
                <Play className="h-3 w-3 fill-white" />
              </div>
              View Documentation
            </a>
          </motion.div>

          {/* Dashboard mockup */}
          <motion.div variants={fadeInUp} className="relative mx-auto mt-16 max-w-5xl lg:mt-20">
            <div className="rounded-2xl border border-white/[0.08] bg-gradient-to-b from-white/[0.05] to-transparent p-2 shadow-2xl shadow-black/50">
              <div className="rounded-xl bg-[#0a0f1e] p-6">
                {/* Mock dashboard header */}
                <div className="mb-6 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex gap-1.5">
                      <div className="h-3 w-3 rounded-full bg-red-500/80" />
                      <div className="h-3 w-3 rounded-full bg-yellow-500/80" />
                      <div className="h-3 w-3 rounded-full bg-green-500/80" />
                    </div>
                    <div className="rounded-lg bg-white/5 px-3 py-1 text-xs text-gray-500">app.aeroxbee.com/dashboard</div>
                  </div>
                </div>
                {/* Mock stats */}
                <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                  {[
                    { label: 'Messages Sent', value: '1.2M', change: '+12.5%', changeClass: 'text-blue-400' },
                    { label: 'Delivery Confidence', value: '94.2%', change: '+2.1%', changeClass: 'text-green-400' },
                    { label: 'Active Devices', value: '248', change: '+18', changeClass: 'text-purple-400' },
                    { label: 'Avg Latency (p95)', value: '142ms', change: '-23ms', changeClass: 'text-cyan-400' },
                  ].map((stat) => (
                    <div key={stat.label} className="rounded-xl border border-white/[0.06] bg-white/[0.03] p-4">
                      <div className="text-xs text-gray-500">{stat.label}</div>
                      <div className="mt-1 text-2xl font-bold text-white">{stat.value}</div>
                      <div className={`mt-1 text-xs ${stat.changeClass}`}>{stat.change}</div>
                    </div>
                  ))}
                </div>
                {/* Mock chart area */}
                <div className="mt-4 rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
                  <div className="mb-4 text-sm font-medium text-gray-400">Message Volume — Last 30 Days</div>
                  <div className="flex items-end gap-1.5 h-32">
                    {Array.from({ length: 30 }, (_, i) => {
                      const h = 30 + Math.sin(i * 0.5) * 25 + (i * 7 % 20)
                      return (
                        <div
                          key={i}
                          className="flex-1 rounded-t bg-gradient-to-t from-blue-600/60 to-blue-400/60 transition-all hover:from-blue-600 hover:to-blue-400"
                          style={{ height: `${h}%` }}
                        />
                      )
                    })}
                  </div>
                </div>
              </div>
            </div>
            {/* Floating cards */}
            <motion.div variants={float} className="absolute -left-4 top-1/4 hidden rounded-xl border border-white/[0.08] bg-[#111827]/90 p-3 shadow-xl backdrop-blur-xl lg:block">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-green-500/20">
                  <MessageSquare className="h-4 w-4 text-green-400" />
                </div>
                <div>
                  <div className="text-xs font-medium text-white">Delivered</div>
                  <div className="text-xs text-green-400">+12,847 today</div>
                </div>
              </div>
            </motion.div>
            <motion.div variants={float} className="absolute -right-4 bottom-1/4 hidden rounded-xl border border-white/[0.08] bg-[#111827]/90 p-3 shadow-xl backdrop-blur-xl lg:block" style={{ animationDelay: '2s' }}>
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-500/20">
                  <Globe className="h-4 w-4 text-purple-400" />
                </div>
                <div>
                  <div className="text-xs font-medium text-white">Queue Depth</div>
                  <div className="text-xs text-purple-400">3 priority lanes</div>
                </div>
              </div>
            </motion.div>
          </motion.div>

          {/* Trust */}
          <motion.div variants={fadeInUp} className="mt-16 pb-8">
            <p className="mb-6 text-sm text-gray-500">Open-source core • Self-hostable • Managed SaaS</p>
            <div className="relative overflow-hidden">
              <div className="flex w-fit gap-12" style={{ animation: 'marquee 30s linear infinite' }}>
                {[...TRUSTED_COMPANIES, ...TRUSTED_COMPANIES, ...TRUSTED_COMPANIES].map((name, i) => (
                  <span key={`${name}-${i}`} className="whitespace-nowrap text-sm font-medium text-gray-600 transition-colors hover:text-gray-400">{name}</span>
                ))}
              </div>
              <div className="absolute inset-y-0 left-0 w-24 bg-gradient-to-r from-[#030712] to-transparent" />
              <div className="absolute inset-y-0 right-0 w-24 bg-gradient-to-l from-[#030712] to-transparent" />
            </div>
            <div className="mx-auto mt-10 grid max-w-3xl grid-cols-2 gap-8 lg:grid-cols-4">
              {STATS.map((stat) => (
                <StatCounter key={stat.label} value={stat.value} label={stat.label} suffix={stat.suffix} />
              ))}
            </div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  )
}
