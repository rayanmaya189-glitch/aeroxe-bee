import { motion } from 'framer-motion'
import { useInView } from 'react-intersection-observer'
import { staggerContainer, fadeInUp } from '../animations/variants'
import { ShieldCheck, FileCheck, Lock, Server, Cloud, Shield } from 'lucide-react'

const COMPLIANCE_ITEMS = [
  { icon: ShieldCheck, title: 'SOC 2 Type II', desc: 'Independently audited security controls for enterprise trust.', color: 'text-blue-400' },
  { icon: FileCheck, title: 'ISO 27001', desc: 'International standard for information security management.', color: 'text-purple-400' },
  { icon: Shield, title: 'GDPR Compliant', desc: 'Full data privacy compliance for EU and global regulations.', color: 'text-green-400' },
  { icon: Lock, title: 'End-to-End Encryption', desc: 'AES-256 encryption for all data in transit and at rest.', color: 'text-cyan-400' },
  { icon: Server, title: '99.99% Uptime SLA', desc: 'Multi-region infrastructure with automatic failover.', color: 'text-amber-400' },
  { icon: Cloud, title: 'Cloud Infrastructure', desc: 'Hosted on enterprise-grade cloud with DDoS protection.', color: 'text-rose-400' },
]

export function SecurityCompliance() {
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
            <span className="mb-4 inline-block rounded-full border border-blue-500/20 bg-blue-500/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-blue-400">Security</span>
            <h2 className="mt-4 text-4xl font-bold tracking-tight text-white lg:text-5xl">
              Enterprise-grade{' '}
              <span className="bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">security & compliance</span>
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-lg text-gray-400">
              Your data is protected by industry-leading security standards and compliance certifications.
            </p>
          </motion.div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {COMPLIANCE_ITEMS.map((item) => (
              <motion.div
                key={item.title}
                variants={fadeInUp}
                className="group flex items-start gap-4 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6 transition-all duration-300 hover:border-white/[0.12] hover:bg-white/[0.04]"
              >
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-white/[0.06] bg-white/[0.03]">
                  <item.icon className={`h-6 w-6 ${item.color}`} />
                </div>
                <div>
                  <h3 className="font-semibold text-white">{item.title}</h3>
                  <p className="mt-1 text-sm text-gray-400">{item.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  )
}
