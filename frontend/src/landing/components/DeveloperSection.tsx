import { motion } from 'framer-motion'
import { useInView } from 'react-intersection-observer'
import { staggerContainer, fadeInUp } from '../animations/variants'
import { Code, Terminal, BookOpen, Webhook } from 'lucide-react'

export function DeveloperSection() {
  const [ref, inView] = useInView({ triggerOnce: true, threshold: 0.1 })

  return (
    <section id="developers" className="relative bg-[#030712] py-24 lg:py-32">
      <div className="absolute left-0 right-0 top-0 h-px bg-gradient-to-r from-transparent via-white/[0.08] to-transparent" />
      <div className="relative mx-auto max-w-[1280px] px-6">
        <motion.div
          initial="hidden"
          animate={inView ? 'visible' : 'hidden'}
          variants={staggerContainer}
          ref={ref}
          className="grid items-center gap-16 lg:grid-cols-2"
        >
          <motion.div variants={fadeInUp}>
            <span className="mb-4 inline-block rounded-full border border-cyan-500/20 bg-cyan-500/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-cyan-400">Developers</span>
            <h2 className="mt-4 text-4xl font-bold tracking-tight text-white lg:text-5xl">
              API-first{' '}
              <span className="bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">architecture</span>
            </h2>
            <p className="mt-4 max-w-lg text-lg text-gray-400">
              Every feature is accessible via REST APIs. Send SMS, manage devices, configure webhooks, and query analytics — all programmatically.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <a
                href="#"
                className="group flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-500/25 transition-all hover:shadow-blue-500/40 hover:brightness-110"
              >
                <BookOpen className="h-4 w-4" />
                View Documentation
              </a>
              <a
                href="#"
                className="flex items-center gap-2 rounded-xl border border-white/[0.1] bg-white/[0.04] px-6 py-3 text-sm font-semibold text-gray-300 transition-all hover:bg-white/[0.08] hover:text-white"
              >
                <Terminal className="h-4 w-4" />
                API Reference
              </a>
            </div>
          </motion.div>

          {/* Code sample */}
          <motion.div variants={fadeInUp} className="relative">
            <div className="rounded-2xl border border-white/[0.08] bg-[#0a0f1e] overflow-hidden">
              <div className="flex items-center gap-2 border-b border-white/[0.06] px-4 py-3">
                <div className="flex gap-1.5">
                  <div className="h-3 w-3 rounded-full bg-red-500/80" />
                  <div className="h-3 w-3 rounded-full bg-yellow-500/80" />
                  <div className="h-3 w-3 rounded-full bg-green-500/80" />
                </div>
                <span className="ml-2 text-xs text-gray-500">send-sms.sh</span>
              </div>
              <pre className="overflow-x-auto p-6 text-sm leading-relaxed">
                <code>
                  <span className="text-purple-400">curl</span> <span className="text-green-400">-X POST</span> <span className="text-blue-300">\{'\n'}</span>
                  <span className="text-blue-300">  https://api.aeroxbee.com/api/v1/send</span> <span className="text-blue-300">\{'\n'}</span>
                  <span className="text-amber-300">  -H</span> <span className="text-green-400">"Authorization: Bearer YOUR_API_KEY"</span> <span className="text-blue-300">\{'\n'}</span>
                  <span className="text-amber-300">  -H</span> <span className="text-green-400">"Content-Type: application/json"</span> <span className="text-blue-300">\{'\n'}</span>
                  <span className="text-amber-300">  -d</span> <span className="text-green-400">'{'{'}'{'\n'}</span>
                  <span className="text-green-400">    "recipient": "+1234567890",{'\n'}</span>
                  <span className="text-green-400">    "message": "Your OTP is 4829",{'\n'}</span>
                  <span className="text-green-400">    "message_type": "otp",{'\n'}</span>
                  <span className="text-green-400">    "idempotency_key": "unique-key-123"{'\n'}</span>
                  <span className="text-green-400">  {'}'}'</span>
                </code>
              </pre>
              <div className="border-t border-white/[0.06] px-6 py-3">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-green-400" />
                  <span className="text-xs text-gray-400">202 Accepted — queued for delivery via highest_reliability strategy</span>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  )
}
