import { motion } from 'framer-motion'
import { PageTransition } from '@/components/ui/PageTransition'
import { useQuery } from '@tanstack/react-query'
import { getPlans } from '@/services/dashboard'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { PageSkeleton } from '@/components/ui/Skeleton'
import { EmptyState } from '@/components/ui/EmptyState'
import { formatNumber } from '@/utils/format'
import { staggerContainer, fadeInUp, itemVariants } from '@/components/animations/variants'
import { CreditCard, Check } from 'lucide-react'

export function BillingPage() {
  const { data: plans = [], isLoading } = useQuery({ queryKey: ['plans'], queryFn: getPlans })
  if (isLoading) return <PageTransition><PageSkeleton /></PageTransition>

  return (
    <PageTransition>
    <motion.div initial="hidden" animate="visible" variants={staggerContainer} className="space-y-8">
      {/* Hero header */}
      <motion.div variants={fadeInUp}>
        <div className="relative overflow-hidden rounded-2xl border border-white/[0.06] bg-white/[0.02] p-8">
          <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-violet-600/10 blur-[80px]" />
          <div className="pointer-events-none absolute -left-8 bottom-0 h-32 w-32 rounded-full bg-blue-600/10 blur-[60px]" />
          <div className="relative flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-blue-600 shadow-lg shadow-violet-500/25">
              <CreditCard className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-extrabold tracking-tight text-white lg:text-4xl">
                <span className="bg-gradient-to-r from-violet-400 to-blue-400 bg-clip-text text-transparent">Billing & plans</span>
              </h1>
              <p className="mt-1 text-sm text-gray-400">Overview of available plans and pricing</p>
            </div>
          </div>
        </div>
      </motion.div>

      {plans.length === 0 ? (
        <EmptyState title="No plans available" description="Plans will appear here once configured." />
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {plans.map((plan, idx) => (
            <motion.div key={plan.id} variants={itemVariants}>
              <Card hover glow={['bg-blue-500/15', 'bg-violet-500/15', 'bg-cyan-500/15'][idx % 3]}>
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-base font-semibold text-gray-100">{plan.name}</h3>
                    <p className="mt-1 text-3xl font-bold tracking-tight text-gray-100">
                      ${plan.monthly_price}<span className="text-sm font-normal text-gray-500">/mo</span>
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {plan.visibility === 'private' && <Badge variant="danger" size="sm">Private</Badge>}
                    {plan.visibility === 'custom' && <Badge variant="warning" size="sm">Custom</Badge>}
                    {plan.dedicated_pool && <Badge variant="primary" size="sm">Dedicated</Badge>}
                  </div>
                </div>
                <div className="mt-6 space-y-3 text-sm">
                  {[
                    ['Daily quota', formatNumber(plan.daily_quota)],
                    ['Monthly quota', formatNumber(plan.monthly_quota)],
                    ['Overage buffer', `${plan.overage_buffer_pct}%`],
                    ['Max queue depth', formatNumber(plan.max_queue_depth)],
                    ['Price per SMS', `$${plan.price_per_sms}`],
                  ].map(([label, value]) => (
                    <div key={label} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Check className="h-3.5 w-3.5 text-emerald-400" />
                        <span className="text-gray-400">{label}</span>
                      </div>
                      <span className="font-medium text-gray-200">{value}</span>
                    </div>
                  ))}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Check className="h-3.5 w-3.5 text-emerald-400" />
                      <span className="text-gray-400">Routing</span>
                    </div>
                    <Badge size="sm">Standard</Badge>
                  </div>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      )}
    </motion.div>
    </PageTransition>
  )
}
