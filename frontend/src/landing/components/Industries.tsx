import { motion } from 'framer-motion'
import { useInView } from 'react-intersection-observer'
import { staggerContainer, fadeInUp } from '../animations/variants'
import {
  Heart, Building2, Home, HardHat, GraduationCap,
  ShoppingBag, Factory, Scale, Landmark, Hotel,
} from 'lucide-react'

const INDUSTRIES = [
  { icon: Heart, title: 'Healthcare', desc: 'Patient alerts, appointment reminders, and HIPAA-compliant messaging.', color: 'from-rose-500 to-pink-500' },
  { icon: Building2, title: 'Finance', desc: 'Transaction alerts, OTP verification, and compliance notifications.', color: 'from-blue-500 to-indigo-500' },
  { icon: Home, title: 'Real Estate', desc: 'Property alerts, lead nurturing, and tenant communications.', color: 'from-emerald-500 to-green-500' },
  { icon: HardHat, title: 'Construction', desc: 'Job site updates, safety alerts, and crew coordination.', color: 'from-amber-500 to-orange-500' },
  { icon: GraduationCap, title: 'Education', desc: 'Student notifications, parent alerts, and campus emergency systems.', color: 'from-purple-500 to-violet-500' },
  { icon: ShoppingBag, title: 'Retail', desc: 'Order updates, flash sale alerts, and loyalty notifications.', color: 'from-cyan-500 to-teal-500' },
  { icon: Factory, title: 'Manufacturing', desc: 'Production alerts, supply chain updates, and quality notifications.', color: 'from-slate-500 to-gray-500' },
  { icon: Scale, title: 'Legal', desc: 'Deadline reminders, court date notifications, and client updates.', color: 'from-indigo-500 to-blue-500' },
  { icon: Landmark, title: 'Government', desc: 'Emergency alerts, public safety notifications, and civic updates.', color: 'from-red-500 to-rose-500' },
  { icon: Hotel, title: 'Hospitality', desc: 'Booking confirmations, guest services, and event management.', color: 'from-teal-500 to-cyan-500' },
]

export function Industries() {
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
            <span className="mb-4 inline-block rounded-full border border-violet-500/20 bg-violet-500/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-violet-400">Industries</span>
            <h2 className="mt-4 text-4xl font-bold tracking-tight text-white lg:text-5xl">
              Trusted across{' '}
              <span className="bg-gradient-to-r from-violet-400 to-purple-400 bg-clip-text text-transparent">every industry</span>
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-lg text-gray-400">
              From healthcare to hospitality, AeroXe Bee powers mission-critical messaging across 10+ industries.
            </p>
          </motion.div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {INDUSTRIES.map((industry) => (
              <motion.div
                key={industry.title}
                variants={fadeInUp}
                className="group relative rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6 text-center transition-all duration-300 hover:border-white/[0.12] hover:bg-white/[0.04]"
              >
                <div className={`mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${industry.color} shadow-lg`}>
                  <industry.icon className="h-6 w-6 text-white" />
                </div>
                <h3 className="text-sm font-semibold text-white">{industry.title}</h3>
                <p className="mt-2 text-xs leading-relaxed text-gray-400">{industry.desc}</p>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  )
}
