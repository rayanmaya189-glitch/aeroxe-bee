import { motion } from 'framer-motion'
import { useInView } from 'react-intersection-observer'
import { 
  Route, Shield, Smartphone, BarChart3, 
  MessageSquare, Clock, ArrowRight
} from 'lucide-react'
import { staggerContainer, fadeInUp } from '../animations/variants'

const differentiators = [
  {
    icon: Route,
    title: '5 Intelligent Routing Strategies',
    description: 'Fastest delivery, lowest cost, highest reliability, geo-affinity, or profit-optimized — choose what matters most for each message type.',
    color: 'from-blue-500 to-cyan-400',
  },
  {
    icon: Smartphone,
    title: 'Device Fleet Management',
    description: 'Turn Android phones into SMS-sending nodes with real-time health monitoring, automatic failover, and intelligent load balancing.',
    color: 'from-purple-500 to-pink-400',
  },
  {
    icon: Shield,
    title: 'Automatic Failover & Circuit Breakers',
    description: 'Smart circuit breakers detect issues and automatically reroute traffic. Self-healing system with configurable recovery thresholds.',
    color: 'from-green-500 to-emerald-400',
  },
  {
    icon: BarChart3,
    title: 'Delivery Confidence Scoring',
    description: 'Multiple signal sources combined to produce honest delivery confidence scores, giving you accurate visibility into message status.',
    color: 'from-orange-500 to-amber-400',
  },
  {
    icon: MessageSquare,
    title: 'Priority Messaging Lanes',
    description: 'Three dedicated lanes for OTP, transactional, and marketing messages — ensuring critical messages always get delivered first.',
    color: 'from-rose-500 to-pink-400',
  },
  {
    icon: Clock,
    title: 'Real-Time Analytics',
    description: 'Live dashboards with delivery rates, queue depths, device health, and cost tracking across your entire fleet.',
    color: 'from-cyan-500 to-blue-400',
  },
]

const stats = [
  { value: '95%+', label: 'Delivery Rate Target' },
  { value: '150ms', label: 'API Latency (p95)' },
  { value: '99.9%', label: 'API Uptime' },
  { value: '5', label: 'Routing Strategies' },
]

export function WhyChooseUs() {
  const [ref, inView] = useInView({ triggerOnce: true, threshold: 0.1 })

  return (
    <section className="relative bg-[#030712] py-24 lg:py-32 overflow-hidden">
      <div className="absolute left-0 right-0 top-0 h-px bg-gradient-to-r from-transparent via-white/[0.08] to-transparent" />
      <div className="absolute left-1/4 top-1/2 h-[500px] w-[500px] -translate-y-1/2 rounded-full bg-blue-600/8 blur-[150px]" />
      <div className="absolute right-1/4 top-1/3 h-[400px] w-[400px] rounded-full bg-purple-600/8 blur-[120px]" />

      <div className="relative mx-auto max-w-[1280px] px-6">
        <motion.div
          initial="hidden"
          animate={inView ? 'visible' : 'hidden'}
          variants={staggerContainer}
          ref={ref}
        >
          <motion.div variants={fadeInUp} className="mb-16 text-center">
            <span className="mb-4 inline-block rounded-full border border-blue-500/20 bg-blue-500/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-blue-400">
              Why AeroXe Bee
            </span>
            <h2 className="mt-4 text-3xl font-bold tracking-tight text-white sm:text-4xl lg:text-5xl">
              Built for teams who need{' '}
              <span className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                reliable SMS delivery
              </span>
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-lg text-gray-400">
              Enterprise-grade SMS infrastructure with smart routing, device fleet management, 
              and real-time visibility — all from a single platform.
            </p>
          </motion.div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {differentiators.map((item) => (
              <motion.div
                key={item.title}
                variants={fadeInUp}
                className="group relative rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6 transition-all duration-300 hover:border-white/[0.12] hover:bg-white/[0.04]"
              >
                <div className={`mb-4 inline-flex rounded-xl bg-gradient-to-br ${item.color} p-3`}>
                  <item.icon className="h-6 w-6 text-white" />
                </div>
                <h3 className="mb-2 text-lg font-semibold text-white">{item.title}</h3>
                <p className="text-sm leading-relaxed text-gray-400">{item.description}</p>
              </motion.div>
            ))}
          </div>

          <motion.div variants={fadeInUp} className="mt-16">
            <div className="rounded-2xl border border-white/[0.06] bg-gradient-to-br from-white/[0.03] to-transparent p-8">
              <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
                {stats.map((stat) => (
                  <div key={stat.label} className="text-center">
                    <div className="text-3xl font-bold text-white">{stat.value}</div>
                    <div className="mt-1 text-sm text-gray-400">{stat.label}</div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>

          <motion.div variants={fadeInUp} className="mt-12 text-center">
            <a
              href="#pricing"
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-500/25 transition-all hover:shadow-blue-500/40 hover:brightness-110"
            >
              See Pricing
              <ArrowRight className="h-4 w-4" />
            </a>
          </motion.div>
        </motion.div>
      </div>
    </section>
  )
}
