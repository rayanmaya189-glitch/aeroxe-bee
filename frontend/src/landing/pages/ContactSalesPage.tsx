import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useInView } from 'react-intersection-observer'
import {
  Mail, Phone, MapPin, Clock, Send, ArrowLeft, CheckCircle2,
  MessageSquare, Building2, Users, Zap, Globe, Shield,
} from 'lucide-react'
import { staggerContainer, fadeInUp } from '../animations/variants'
import { useSEO } from '@/hooks/useSEO'

const REASONS = [
  { icon: Zap, label: 'Volume Pricing', desc: 'Custom pricing for high-volume SMS needs' },
  { icon: Shield, label: 'Enterprise Security', desc: 'Dedicated infrastructure and SLA guarantees' },
  { icon: Globe, label: 'Self-Hosting', desc: 'On-premise deployment options' },
  { icon: Users, label: 'Team Onboarding', desc: 'Dedicated support for team setup' },
] as const

const CONTACT_INFO = [
  { icon: Mail, label: 'Email', value: 'sales@aeroxbee.com', href: 'mailto:sales@aeroxbee.com' },
  { icon: Phone, label: 'Phone', value: '+91 70206 68210', href: 'tel:+917020668210' },
  { icon: MapPin, label: 'Office', value: 'Jalgaon, Maharashtra, India', href: null as string | null },
  { icon: Clock, label: 'Response Time', value: 'Within 24 hours', href: null as string | null },
]

export function ContactSalesPage() {
  useSEO({
    title: 'Contact Sales | AeroXe Bee',
    description: 'Get in touch with the AeroXe Bee sales team for custom pricing, enterprise security, self-hosting options, and team onboarding. We respond within 24 hours.',
    ogImage: '/og-contact-sales.svg',
    ogUrl: 'https://aeroxbee.com/contact-sales',
  })
  const [ref] = useInView({ triggerOnce: true, threshold: 0.1 })
  const [submitted, setSubmitted] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState('')
  const [form, setForm] = useState({
    name: '', email: '', company: '', phone: '', plan: '', message: '',
  })

  const updateField = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }))
    if (formError) setFormError('')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (submitting) return
    setSubmitting(true)
    try {
      const res = await fetch('/api/v1/public/contact-sales', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          email: form.email,
          company: form.company,
          phone: form.phone,
          plan: form.plan,
          message: form.message,
        }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Submission failed')
      }
      setSubmitted(true)
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  useEffect(() => {
    if (submitted) {
      const timer = setTimeout(() => {
        window.location.href = `mailto:sales@aeroxbee.com?subject=${encodeURIComponent(
          'Sales Inquiry - ' + (form.company || form.name)
        )}&body=${encodeURIComponent(
          'Hi AeroXe Bee Sales Team,\n\n'
          + 'Name: ' + form.name + '\n'
          + 'Company: ' + form.company + '\n'
          + 'Email: ' + form.email + '\n'
          + 'Phone: ' + form.phone + '\n'
          + 'Interested Plan: ' + form.plan + '\n\n'
          + 'Message:\n' + form.message
        )}`
      }, 5000)
      return () => clearTimeout(timer)
    }
  }, [submitted]) // eslint-disable-line react-hooks/exhaustive-deps

  const inputClasses =
    'w-full rounded-xl border border-white/[0.08] bg-white/[0.04] px-4 py-3 text-sm text-white placeholder-gray-500 outline-none transition-all focus:border-blue-500/40 focus:ring-1 focus:ring-blue-500/20'
  const labelClasses = 'block text-sm font-medium text-gray-300 mb-2'

  return (
    <div className="min-h-screen bg-[#030712]">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-white/[0.06] bg-[#030712]/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-[1280px] items-center justify-between px-6">
          <a href="/" className="flex items-center gap-2 text-sm text-gray-400 transition-colors hover:text-white">
            <ArrowLeft className="h-4 w-4" />
            Back to home
          </a>
          <a href="/" className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-purple-600">
              <Zap className="h-4 w-4 text-white" strokeWidth={2.5} />
            </div>
            <span className="text-base font-bold tracking-tight text-white">AeroXe Bee</span>
          </a>
          <a href="/login" className="text-sm text-gray-400 transition-colors hover:text-white">
            Log in
          </a>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden pb-8 pt-20 lg:pt-28">
        <div className="absolute left-1/4 top-0 h-[500px] w-[500px] -translate-y-1/2 rounded-full bg-blue-600/10 blur-[150px]" />
        <div className="absolute right-1/3 top-1/2 h-[400px] w-[400px] rounded-full bg-purple-600/8 blur-[120px]" />

        <div className="relative mx-auto max-w-[1280px] px-6 text-center">
          <motion.div
            initial="hidden"
            animate="visible"
            variants={staggerContainer}
          >
            <motion.span
              variants={fadeInUp}
              className="mb-4 inline-block rounded-full border border-blue-500/20 bg-blue-500/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-blue-400"
            >
              Contact Sales
            </motion.span>
            <motion.h1
              variants={fadeInUp}
              className="mt-4 text-4xl font-bold tracking-tight text-white sm:text-5xl lg:text-6xl"
            >
              Let&apos;s talk about{' '}
              <span className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                your needs
              </span>
            </motion.h1>
            <motion.p
              variants={fadeInUp}
              className="mx-auto mt-5 max-w-2xl text-lg text-gray-400"
            >
              Whether you need custom pricing, enterprise security, self-hosting options,
              or help scaling to millions of messages &mdash; our team is here.
            </motion.p>
          </motion.div>
        </div>
      </section>

      {/* Why contact sales */}
      <section className="relative pb-16 pt-8">
        <div className="mx-auto max-w-[1280px] px-6">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.3 }}
            variants={staggerContainer}
            ref={ref}
            className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
          >
            {REASONS.map((reason) => (
              <motion.div
                key={reason.label}
                variants={fadeInUp}
                className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5 transition-colors hover:border-white/[0.1] hover:bg-white/[0.04]"
              >
                <reason.icon className="h-5 w-5 text-blue-400" />
                <h3 className="mt-3 text-sm font-semibold text-white">{reason.label}</h3>
                <p className="mt-1 text-xs leading-relaxed text-gray-400">{reason.desc}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Form + Info */}
      <section className="relative pb-24">
        <div className="absolute left-0 right-0 top-0 h-px bg-gradient-to-r from-transparent via-white/[0.08] to-transparent" />
        <div className="mx-auto max-w-[1280px] px-6">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.1 }}
            variants={staggerContainer}
            className="grid gap-12 lg:grid-cols-5"
          >
            {/* Form */}
            <motion.div variants={fadeInUp} className="lg:col-span-3">
              <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-8">
                <h2 className="text-xl font-bold text-white">Send us a message</h2>
                <p className="mt-1 text-sm text-gray-400">
                  Fill out the form and our team will get back to you within 24 hours.
                </p>

                <AnimatePresence mode="wait">
                  {submitted ? (
                    <motion.div
                      key="success"
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0 }}
                      className="mt-8 flex flex-col items-center rounded-xl border border-green-500/20 bg-green-500/5 p-10 text-center"
                    >
                      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-green-500/10">
                        <CheckCircle2 className="h-7 w-7 text-green-400" />
                      </div>
                      <h3 className="mt-4 text-lg font-semibold text-white">Message sent!</h3>
                      <p className="mt-2 max-w-sm text-sm text-gray-400">
                        Your inquiry has been recorded and our sales team will reach out within 24 hours. We're also opening your email client for a direct follow-up.
                      </p>
                      <p className="mt-3 text-xs text-gray-500">Opening email client in a few seconds...</p>
                    </motion.div>
                  ) : (                      <motion.form
                      key="form"
                      initial={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      onSubmit={handleSubmit}
                      className="mt-8 space-y-5"
                    >
                      {formError && (
                        <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-3 text-sm text-red-400">
                          {formError}
                          <button type="button" onClick={() => setFormError('')} className="ml-2 font-medium underline">Dismiss</button>
                        </div>
                      )}
                      <div className="grid gap-5 sm:grid-cols-2">
                        <div>
                          <label htmlFor="cs-name" className={labelClasses}>
                            Full Name <span className="text-red-400">*</span>
                          </label>
                          <input
                            id="cs-name"
                            type="text"
                            required
                            value={form.name}
                            onChange={(e) => updateField('name', e.target.value)}
                            placeholder="John Doe"
                            className={inputClasses}
                          />
                        </div>
                        <div>
                          <label htmlFor="cs-email" className={labelClasses}>
                            Work Email <span className="text-red-400">*</span>
                          </label>
                          <input
                            id="cs-email"
                            type="email"
                            required
                            value={form.email}
                            onChange={(e) => updateField('email', e.target.value)}
                            placeholder="john@company.com"
                            className={inputClasses}
                          />
                        </div>
                      </div>

                      <div className="grid gap-5 sm:grid-cols-2">
                        <div>
                          <label htmlFor="cs-company" className={labelClasses}>
                            Company
                          </label>
                          <div className="relative">
                            <Building2 className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
                            <input
                              id="cs-company"
                              type="text"
                              value={form.company}
                              onChange={(e) => updateField('company', e.target.value)}
                              placeholder="Acme Corp"
                              className={`${inputClasses} pl-10`}
                            />
                          </div>
                        </div>
                        <div>
                          <label htmlFor="cs-phone" className={labelClasses}>
                            Phone Number
                          </label>
                          <div className="relative">
                            <Phone className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
                            <input
                              id="cs-phone"
                              type="tel"
                              value={form.phone}
                              onChange={(e) => updateField('phone', e.target.value)}
                              placeholder="+91 70206 68210"
                              className={`${inputClasses} pl-10`}
                            />
                          </div>
                        </div>
                      </div>

                      <div>
                        <label htmlFor="cs-plan" className={labelClasses}>
                          Which plan are you interested in?
                        </label>
                        <select
                          id="cs-plan"
                          value={form.plan}
                          onChange={(e) => updateField('plan', e.target.value)}
                          className={`${inputClasses} appearance-none bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTYiIGhlaWdodD0iMTYiIHZpZXdCb3g9IjAgMCAxNiAxNiIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cGF0aCBkPSJNNCA2bDQgNCA0LTYiIHN0cm9rZT0iIzk4QTI0MyIgc3Ryb2tlLXdpZHRoPSIxLjUiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIgZmlsbD0ibm9uZSIvPjwvc3ZnPg==')] bg-[length:16px] bg-[right_12px_center] bg-no-repeat pr-10`}
                        >
                          <option value="">Select a plan...</option>
                          <option value="Scale">Scale &mdash; $99.99/mo</option>
                          <option value="Enterprise">Enterprise &mdash; $299.99/mo</option>
                          <option value="Custom">Custom / Self-hosted</option>
                          <option value="Not sure">Not sure yet</option>
                        </select>
                      </div>

                      <div>
                        <label htmlFor="cs-message" className={labelClasses}>
                          Tell us about your needs <span className="text-red-400">*</span>
                        </label>
                        <textarea
                          id="cs-message"
                          required
                          rows={5}
                          value={form.message}
                          onChange={(e) => updateField('message', e.target.value)}
                          placeholder="How many messages per month? Any specific routing or integration needs?"
                          className={`${inputClasses} resize-none`}
                        />
                      </div>

                      <motion.button
                        type="submit"
                        disabled={submitting}
                        whileHover={!submitting ? { scale: 1.01 } : undefined}
                        whileTap={!submitting ? { scale: 0.98 } : undefined}
                        className="group flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 px-6 py-3.5 text-sm font-semibold text-white shadow-lg shadow-blue-500/25 transition-all hover:shadow-blue-500/40 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {submitting ? (
                          <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                        ) : (
                          <>
                            <Send className="h-4 w-4" />
                            Send Message
                          </>
                        )}
                      </motion.button>

                      <p className="text-center text-xs text-gray-500">
                        We&apos;ll respond within 24 hours. No spam, ever.
                      </p>
                    </motion.form>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>

            {/* Sidebar */}
            <motion.div variants={fadeInUp} className="lg:col-span-2">
              <div className="space-y-6">
                {/* Contact details */}
                <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6">
                  <h3 className="text-sm font-semibold text-white">Get in touch</h3>
                  <div className="mt-5 space-y-4">
                    {CONTACT_INFO.map((item) => (
                      <div key={item.label} className="flex items-start gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/[0.04]">
                          <item.icon className="h-4 w-4 text-blue-400" />
                        </div>
                        <div>
                          <p className="text-xs font-medium text-gray-500">{item.label}</p>
                          {item.href ? (
                            <a href={item.href} className="text-sm text-white transition-colors hover:text-blue-400">
                              {item.value}
                            </a>
                          ) : (
                            <p className="text-sm text-white">{item.value}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Quick email */}
                <div className="rounded-2xl border border-white/[0.06] bg-gradient-to-br from-blue-500/[0.06] to-purple-500/[0.06] p-6">
                  <MessageSquare className="h-5 w-5 text-blue-400" />
                  <h3 className="mt-3 text-sm font-semibold text-white">Prefer email?</h3>
                  <p className="mt-1 text-xs leading-relaxed text-gray-400">
                    Skip the form and reach out directly. We&apos;ll get back to you promptly.
                  </p>
                  <a
                    href="mailto:sales@aeroxbee.com?subject=Sales%20Inquiry"
                    className="mt-4 inline-flex items-center gap-2 rounded-xl border border-white/[0.1] bg-white/[0.06] px-5 py-2.5 text-sm font-medium text-white transition-all hover:bg-white/[0.1]"
                  >
                    <Mail className="h-4 w-4" />
                    Email Sales Team
                  </a>
                </div>

                {/* What to expect */}
                <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6">
                  <h3 className="text-sm font-semibold text-white">What to expect</h3>
                  <ul className="mt-4 space-y-3">
                    {[
                      'Response within 24 hours',
                      'Custom pricing tailored to your volume',
                      'Dedicated onboarding for enterprise',
                      'Self-hosting consultation available',
                    ].map((item) => (
                      <li key={item} className="flex items-start gap-2.5 text-xs text-gray-300">
                        <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-green-400" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </section>
    </div>
  )
}
