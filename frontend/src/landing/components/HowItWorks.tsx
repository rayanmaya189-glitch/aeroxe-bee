import { motion } from 'framer-motion'
import { useInView } from 'react-intersection-observer'
import { staggerContainer, fadeInUp } from '../animations/variants'
import { Smartphone, BarChart3, Zap, ArrowRight, CheckCircle2 } from 'lucide-react'

const STEPS = [
  {
    number: '01',
    icon: Smartphone,
    title: 'Connect your devices',
    description: 'Install the Android app on phones with SIM cards. Pair them via QR code and they become SMS-sending nodes in your network.',
    details: ['QR code pairing', 'Real-time health monitoring', 'Automatic message queuing'],
    color: 'from-blue-500 to-cyan-400',
  },
  {
    number: '02',
    icon: Zap,
    title: 'Send messages via API',
    description: 'Use our REST API or SDK to send SMS. Messages are automatically queued and delivered through available devices.',
    details: ['REST API', 'Webhook callbacks', 'Idempotent sends'],
    color: 'from-purple-500 to-pink-400',
  },
  {
    number: '03',
    icon: BarChart3,
    title: 'Monitor and optimize',
    description: 'Track delivery confidence scores, device health, cost efficiency, and analytics in real-time through the dashboard.',
    details: ['Delivery confidence', 'Cost tracking', 'Queue analytics'],
    color: 'from-emerald-500 to-green-400',
  },
]

export function HowItWorks() {
  const [ref, inView] = useInView({ triggerOnce: true, threshold: 0.1 })

  return (
    <section id="how-it-works" className="relative bg-[#030712] py-24 lg:py-32">
      <div className="absolute left-0 right-0 top-0 h-px bg-gradient-to-r from-transparent via-white/[0.08] to-transparent" />
      <div className="absolute right-1/4 top-1/3 h-[400px] w-[400px] rounded-full bg-blue-600/8 blur-[120px]" />
      <div className="relative mx-auto max-w-[1280px] px-6">
        <motion.div
          initial="hidden"
          animate={inView ? 'visible' : 'hidden'}
          variants={staggerContainer}
          ref={ref}
        >
          <motion.div variants={fadeInUp} className="mb-16 text-center">
            <span className="mb-4 inline-block rounded-full border border-blue-500/20 bg-blue-500/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-blue-400">How It Works</span>
            <h2 className="mt-4 text-4xl font-bold tracking-tight text-white lg:text-5xl">
              From setup to{' '}
              <span className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">first message in minutes</span>
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-lg text-gray-400">
              Three simple steps to transform your Android phones into a reliable SMS delivery network.
            </p>
          </motion.div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {STEPS.map((step, idx) => (
              <motion.div
                key={step.number}
                variants={fadeInUp}
                className="group relative"
              >
                {/* Connector line */}
                {idx < STEPS.length - 1 && (
                  <div className="absolute left-[calc(50%+40px)] top-8 hidden h-px w-[calc(100%-80px)] bg-gradient-to-r from-white/[0.12] to-transparent lg:block" />
                )}

                <div className="relative rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6 transition-all duration-300 hover:border-white/[0.12] hover:bg-white/[0.04]">
                  <div className="mb-4 flex items-center gap-3">
                    <div className={`flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${step.color} shadow-lg`}>
                      <step.icon className="h-6 w-6 text-white" />
                    </div>
                    <span className="text-xs font-bold text-gray-600">{step.number}</span>
                  </div>
                  <h3 className="mb-2 text-lg font-semibold text-white">{step.title}</h3>
                  <p className="mb-4 text-sm leading-relaxed text-gray-400">{step.description}</p>
                  <ul className="space-y-2">
                    {step.details.map((detail) => (
                      <li key={detail} className="flex items-center gap-2 text-xs text-gray-500">
                        <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-green-400" />
                        {detail}
                      </li>
                    ))}
                  </ul>
                </div>
              </motion.div>
            ))}
          </div>

          {/* CTA */}
          <motion.div variants={fadeInUp} className="mt-12 text-center">
            <a
              href="/register"
              className="group inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 px-8 py-3.5 text-sm font-semibold text-white shadow-lg shadow-blue-500/25 transition-all hover:shadow-blue-500/40 hover:brightness-110"
            >
              Start Sending in Minutes
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </a>
          </motion.div>
        </motion.div>
      </div>
    </section>
  )
}
