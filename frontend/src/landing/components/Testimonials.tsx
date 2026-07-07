import { motion } from 'framer-motion'
import { useInView } from 'react-intersection-observer'
import { Star, Quote } from 'lucide-react'
import { staggerContainer, fadeInUp } from '../animations/variants'

const TESTIMONIALS = [
  {
    name: 'Priya Sharma',
    role: 'CTO, FinServe India',
    company: 'FinServe India',
    avatar: 'PS',
    rating: 5,
    text: 'AeroXe Bee cut our OTP delivery costs by 40% while improving reliability. The queuing system alone paid for the entire platform in the first month.',
    color: 'from-blue-500 to-cyan-400',
  },
  {
    name: 'Marcus Chen',
    role: 'Engineering Lead, CloudBase',
    company: 'CloudBase',
    avatar: 'MC',
    rating: 5,
    text: 'We migrated from Twilio to AeroXe Bee for our transactional messaging. The real-time analytics and delivery confidence scoring give us visibility we never had before.',
    color: 'from-purple-500 to-pink-400',
  },
  {
    name: 'Sarah Mitchell',
    role: 'VP Engineering, HealthConnect',
    company: 'HealthConnect',
    avatar: 'SM',
    rating: 5,
    text: 'The delivery confidence scoring changed how we think about SMS reliability. We can now make data-driven decisions about our messaging strategy.',
    color: 'from-emerald-500 to-green-400',
  },
  {
    name: 'Raj Patel',
    role: 'Founder, QuickPoll',
    company: 'QuickPoll',
    avatar: 'RP',
    rating: 5,
    text: 'Self-hosting was seamless. We deployed the entire platform in under an hour and had our first messages sending within minutes. The API is beautifully designed.',
    color: 'from-amber-500 to-orange-400',
  },
  {
    name: 'Emma Rodriguez',
    role: 'Director of Ops, RetailFlow',
    company: 'RetailFlow',
    avatar: 'ER',
    rating: 5,
    text: 'The message queuing ensures our OTP messages always get through, even during peak marketing campaigns. Game changer for customer experience.',
    color: 'from-rose-500 to-pink-400',
  },
  {
    name: 'David Kim',
    role: 'Lead Developer, NovaTech',
    company: 'NovaTech',
    avatar: 'DK',
    rating: 5,
    text: 'The webhook system and real-time analytics give us complete control over our messaging pipeline. Integration was straightforward with their REST API.',
    color: 'from-cyan-500 to-blue-400',
  },
]

export function Testimonials() {
  const [ref, inView] = useInView({ triggerOnce: true, threshold: 0.1 })

  return (
    <section className="relative bg-[#030712] py-24 lg:py-32">
      <div className="absolute left-0 right-0 top-0 h-px bg-gradient-to-r from-transparent via-white/[0.08] to-transparent" />
      <div className="absolute left-1/4 top-1/3 h-[500px] w-[500px] rounded-full bg-purple-600/8 blur-[150px]" />
      <div className="relative mx-auto max-w-[1280px] px-6">
        <motion.div
          initial="hidden"
          animate={inView ? 'visible' : 'hidden'}
          variants={staggerContainer}
          ref={ref}
        >
          <motion.div variants={fadeInUp} className="mb-16 text-center">
            <span className="mb-4 inline-block rounded-full border border-amber-500/20 bg-amber-500/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-amber-400">Testimonials</span>
            <h2 className="mt-4 text-4xl font-bold tracking-tight text-white lg:text-5xl">
              Trusted by{' '}
              <span className="bg-gradient-to-r from-amber-400 to-orange-400 bg-clip-text text-transparent">engineering teams worldwide</span>
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-lg text-gray-400">
              Teams choose AeroXe Bee for reliable SMS delivery, real-time analytics, and complete control over their messaging infrastructure.
            </p>
          </motion.div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {TESTIMONIALS.map((testimonial) => (
              <motion.div
                key={testimonial.name}
                variants={fadeInUp}
                className="group relative rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6 transition-all duration-300 hover:border-white/[0.12] hover:bg-white/[0.04]"
              >
                <Quote className="absolute right-6 top-6 h-8 w-8 text-white/[0.04]" />
                <div className="flex items-center gap-1 mb-4">
                  {Array.from({ length: testimonial.rating }).map((_, i) => (
                    <Star key={i} className="h-4 w-4 text-amber-400" fill="currentColor" />
                  ))}
                </div>
                <p className="text-sm leading-relaxed text-gray-300 mb-6">&ldquo;{testimonial.text}&rdquo;</p>
                <div className="flex items-center gap-3">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br ${testimonial.color} text-xs font-bold text-white`}>
                    {testimonial.avatar}
                  </div>
                  <div>
                    <div className="text-sm font-medium text-white">{testimonial.name}</div>
                    <div className="text-xs text-gray-500">{testimonial.role}</div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  )
}
