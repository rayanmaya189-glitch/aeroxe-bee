import { useState, useRef } from 'react'
import { motion } from 'framer-motion'
import { PageTransition } from '@/components/ui/PageTransition'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getPlans, createPlan, updatePlan, deletePlan, getActiveFeatureCatalog } from '@/services/dashboard'
import type { Plan } from '@/types/models'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { EmptyState } from '@/components/ui/EmptyState'
import { PageSkeleton } from '@/components/ui/Skeleton'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { formatNumber } from '@/utils/format'
import { staggerContainer, fadeInUp, itemVariants } from '@/components/animations/variants'
import { Plus, Receipt, Check, X, Tags } from 'lucide-react'

const containerVariants = staggerContainer
const itemVariant = itemVariants

export function PlansPage() {
  const queryClient = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Plan | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Plan | null>(null)
  const [error, setError] = useState('')
  const [name, setName] = useState('')
  const [planId, setPlanId] = useState('')
  const [dailyQuota, setDailyQuota] = useState('')
  const [monthlyQuota, setMonthlyQuota] = useState('')
  const [monthlyPrice, setMonthlyPrice] = useState('')
  const [pricePerSms, setPricePerSms] = useState('')
  const [overageBuffer, setOverageBuffer] = useState('')
  const [maxQueueDepth, setMaxQueueDepth] = useState('')
  const [routingStrategy, setRoutingStrategy] = useState('fastest_delivery')
  const [dedicatedPool, setDedicatedPool] = useState(false)
  const [visibility, setVisibility] = useState<'public' | 'private' | 'custom'>('public')	const [maxDevices, setMaxDevices] = useState('')
	const [maxTemplates, setMaxTemplates] = useState('')
	const [isPopular, setIsPopular] = useState(false)
  const [ctaText, setCtaText] = useState('')
  const [featuresList, setFeaturesList] = useState<string[]>([])
  const [featureInput, setFeatureInput] = useState('')
  const featureInputRef = useRef<HTMLInputElement>(null)

  const { data: plans = [], isLoading } = useQuery({ queryKey: ['admin-plans'], queryFn: getPlans })
  const { data: catalogFeatures = [] } = useQuery({ queryKey: ['feature-catalog'], queryFn: getActiveFeatureCatalog })
  // Provide fallback suggestions if catalog is empty
  const suggestions = catalogFeatures.length > 0
    ? catalogFeatures.map((f) => f.name)
    : ['5K SMS/month', '10K daily SMS', 'Advanced analytics', 'Priority support', 'Custom webhooks', 'OTP system', 'API access']

  const saveMutation = useMutation({
    mutationFn: async () => {	const payload: Plan = { id: planId, name, visibility, daily_quota: Number(dailyQuota) || 0, monthly_quota: Number(monthlyQuota) || 0, monthly_price: Number(monthlyPrice) || 0, price_per_sms: Number(pricePerSms) || 0, overage_buffer_pct: Number(overageBuffer) || 0, max_queue_depth: Number(maxQueueDepth) || 100, max_devices: Number(maxDevices) || 1, max_templates: Number(maxTemplates) || 10, dedicated_pool: dedicatedPool, default_routing_strategy: routingStrategy, is_popular: isPopular, cta_text: ctaText || 'Get Started', features: featuresList }
      return editing ? updatePlan(editing.id, payload) : createPlan(payload)
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin-plans'] }); closeForm() },
    onError: (err: Error) => setError(err.message),
  })

  const deleteMutation = useMutation({
    mutationFn: async () => { if (deleteTarget) await deletePlan(deleteTarget.id) },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin-plans'] }); setDeleteTarget(null) },
  })

  function openForm(plan?: Plan) {
    setEditing(plan || null); setPlanId(plan?.id || ''); setName(plan?.name || '')
    setDailyQuota(String(plan?.daily_quota ?? '')); setMonthlyQuota(String(plan?.monthly_quota ?? ''))
    setMonthlyPrice(String(plan?.monthly_price ?? '')); setPricePerSms(String(plan?.price_per_sms ?? ''))
    setOverageBuffer(String(plan?.overage_buffer_pct ?? '')); setMaxQueueDepth(String(plan?.max_queue_depth ?? ''))
    setRoutingStrategy(plan?.default_routing_strategy || 'fastest_delivery')
    setDedicatedPool(plan?.dedicated_pool || false); setVisibility(plan?.visibility || 'public')	setMaxDevices(String(plan?.max_devices ?? '')); setMaxTemplates(String(plan?.max_templates ?? '')); setIsPopular(plan?.is_popular || false)
    setCtaText(plan?.cta_text || '')
    setFeaturesList(plan?.features ? [...plan.features] : [])
    setFeatureInput('')
    setError(''); setShowForm(true)
  }
  function closeForm() { setShowForm(false); setEditing(null); setError('') }

  if (isLoading) return <PageTransition><PageSkeleton /></PageTransition>
  const selCls = 'block w-full rounded-xl border border-white/[0.08] bg-white/[0.05] px-3.5 py-2.5 text-sm text-gray-100 focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-500/10'

  return (
    <PageTransition>
    <motion.div initial="hidden" animate="visible" variants={containerVariants} className="space-y-8">
      {/* Hero header */}
      <motion.div variants={fadeInUp}>
        <div className="relative overflow-hidden rounded-2xl border border-white/[0.06] bg-white/[0.02] p-8">
          <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-violet-600/10 blur-[80px]" />
          <div className="pointer-events-none absolute -left-8 bottom-0 h-32 w-32 rounded-full bg-blue-600/10 blur-[60px]" />
          <div className="relative flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-600 shadow-lg shadow-violet-500/25">
                <Receipt className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-extrabold tracking-tight text-white lg:text-4xl">
                  <span className="bg-gradient-to-r from-violet-400 to-indigo-400 bg-clip-text text-transparent">Plans</span>
                </h1>
                <p className="mt-1 text-sm text-gray-400">Manage subscription plans and pricing</p>
              </div>
            </div>
            <Button size="sm" icon={<Plus className="h-4 w-4" />} onClick={() => openForm()}>New plan</Button>
          </div>
        </div>
      </motion.div>

      {plans.length === 0 ? (
        <EmptyState title="No plans configured" description="Create a plan to define pricing and quotas." action={<Button size="sm" onClick={() => openForm()}>Create plan</Button>} />
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {plans.map((plan, idx) => (
            <motion.div key={plan.id} variants={itemVariant}>
              <Card hover glow={['bg-blue-500/15', 'bg-violet-500/15', 'bg-cyan-500/15'][idx % 3]}>
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-base font-semibold text-gray-100">{plan.name}</h3>
                    <p className="mt-1 text-3xl font-bold tracking-tight text-gray-100">${plan.monthly_price}<span className="text-sm font-normal text-gray-500">/mo</span></p>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {plan.is_popular && <Badge variant="info" size="sm">Popular</Badge>}
                    {plan.visibility === 'private' && <Badge variant="danger" size="sm">Private</Badge>}
                    {plan.visibility === 'custom' && <Badge variant="warning" size="sm">Custom</Badge>}
                    {plan.dedicated_pool && <Badge variant="primary" size="sm">Dedicated</Badge>}
                  </div>
                </div>                  <div className="mt-6 space-y-3 text-sm">                    {[['Daily quota', formatNumber(plan.daily_quota)], ['Monthly quota', formatNumber(plan.monthly_quota)], ['Max devices', String(plan.max_devices ?? '—')], ['Max templates', String(plan.max_templates ?? '—')], ['Overage buffer', `${plan.overage_buffer_pct}%`], ['Price per SMS', `$${plan.price_per_sms}`], ['Max queue', formatNumber(plan.max_queue_depth)], ['CTA text', plan.cta_text || '—']].map(([l, v]) => (
                    <div key={l} className="flex items-center justify-between">
                      <div className="flex items-center gap-2"><Check className="h-3.5 w-3.5 text-emerald-400" /><span className="text-gray-400">{l}</span></div>
                      <span className="font-medium text-gray-200">{v}</span>
                    </div>
                  ))}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2"><Check className="h-3.5 w-3.5 text-emerald-400" /><span className="text-gray-400">Routing</span></div>
                    <Badge size="sm">{plan.default_routing_strategy}</Badge>
                  </div>
                  {(plan.features || []).length > 0 && (
                    <div className="pt-2">
                      <p className="text-[10px] font-medium uppercase tracking-wider text-gray-500 mb-2">Features</p>
                      <div className="flex flex-wrap gap-1.5">
                        {(plan.features || []).slice(0, 6).map((f) => (
                          <span key={f} className="inline-flex items-center rounded-md border border-white/[0.06] bg-white/[0.04] px-2 py-0.5 text-[10px] text-gray-400">{f}</span>
                        ))}
                        {(plan.features || []).length > 6 && (
                          <span className="inline-flex items-center rounded-md bg-white/[0.04] px-2 py-0.5 text-[10px] text-gray-500">+{(plan.features || []).length - 6} more</span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
                <div className="mt-4 flex gap-2 border-t border-white/[0.06] pt-4">
                  <Button variant="ghost" size="xs" onClick={() => openForm(plan)}>Edit</Button>
                  <Button variant="ghost" size="xs" className="text-red-400" onClick={() => setDeleteTarget(plan)}>Delete</Button>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      <Modal open={showForm} onClose={closeForm} title={editing ? 'Edit plan' : 'New plan'} size="lg"
        footer={<><Button variant="ghost" size="sm" onClick={closeForm} disabled={saveMutation.isPending}>Cancel</Button><Button size="sm" onClick={() => saveMutation.mutate()} loading={saveMutation.isPending}>{editing ? 'Update' : 'Create'}</Button></>}>
        <div className="space-y-4">
          {error && <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-3 text-sm text-red-400">{error}</div>}
          <div className="grid gap-4 sm:grid-cols-2">
            <Input label="Plan ID" value={planId} onChange={(e) => setPlanId(e.target.value)} placeholder="e.g. free, pro" required disabled={!!editing} />
            <Input label="Plan name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Free, Pro" required />
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <Input label="Daily quota" type="number" value={dailyQuota} onChange={(e) => setDailyQuota(e.target.value)} required />
            <Input label="Monthly quota" type="number" value={monthlyQuota} onChange={(e) => setMonthlyQuota(e.target.value)} required />
            <Input label="Max queue depth" type="number" value={maxQueueDepth} onChange={(e) => setMaxQueueDepth(e.target.value)} required />
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <Input label="Monthly price ($)" type="number" step="0.01" value={monthlyPrice} onChange={(e) => setMonthlyPrice(e.target.value)} required />
            <Input label="Price per SMS ($)" type="number" step="0.001" value={pricePerSms} onChange={(e) => setPricePerSms(e.target.value)} required />
            <Input label="Overage buffer (%)" type="number" value={overageBuffer} onChange={(e) => setOverageBuffer(e.target.value)} required />
          </div>		<div className="grid gap-4 sm:grid-cols-4">
            <Input label="Max devices" type="number" value={maxDevices} onChange={(e) => setMaxDevices(e.target.value)} required />
            <Input label="Max templates" type="number" value={maxTemplates} onChange={(e) => setMaxTemplates(e.target.value)} required />
            <Input label="CTA button text" value={ctaText} onChange={(e) => setCtaText(e.target.value)} placeholder="e.g. Get Started, Contact Sales" />
            <label className="flex items-end gap-3 pb-1">
              <input type="checkbox" checked={isPopular} onChange={(e) => setIsPopular(e.target.checked)} className="h-4 w-4 rounded border-white/20 bg-white/5 text-blue-500" />
              <span className="text-sm font-medium text-gray-300">Mark as popular</span>
            </label>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-300">Plan Features</label>
            <p className="mb-3 text-xs text-gray-500">These are displayed on the landing page pricing cards and comparison table.</p>
            {featuresList.length > 0 && (
              <div className="mb-3 flex flex-wrap gap-2">
                {featuresList.map((feature, idx) => (
                  <span
                    key={idx}
                    className="group inline-flex items-center gap-1.5 rounded-lg border border-blue-500/20 bg-blue-500/10 px-3 py-1.5 text-xs font-medium text-blue-300 transition-all hover:border-blue-500/30 hover:bg-blue-500/15"
                  >
                    {feature}
                    <button
                      type="button"
                      onClick={() => setFeaturesList(featuresList.filter((_, i) => i !== idx))}
                      className="ml-0.5 rounded-full p-0.5 text-blue-400/50 transition-colors hover:bg-blue-500/20 hover:text-blue-300"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
            <div className="flex gap-2">
              <input
                ref={featureInputRef}
                type="text"
                value={featureInput}
                onChange={(e) => setFeatureInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ',') {
                    e.preventDefault()
                    const val = featureInput.trim()
                    if (val && !featuresList.includes(val)) {
                      setFeaturesList([...featuresList, val])
                      setFeatureInput('')
                    }
                  }
                  if (e.key === 'Backspace' && !featureInput && featuresList.length > 0) {
                    setFeaturesList(featuresList.slice(0, -1))
                  }
                }}
                placeholder="Type a feature and press Enter to add..."
                className="flex-1 rounded-xl border border-white/[0.08] bg-white/[0.05] px-3.5 py-2.5 text-sm text-gray-100 focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-500/10"
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  const val = featureInput.trim()
                  if (val && !featuresList.includes(val)) {
                    setFeaturesList([...featuresList, val])
                    setFeatureInput('')
                  }
                  featureInputRef.current?.focus()
                }}
                disabled={!featureInput.trim()}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {suggestions.slice(0, 12).map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  onClick={() => {
                    if (!featuresList.includes(suggestion)) {
                      setFeaturesList([...featuresList, suggestion])
                    }
                  }}
                  disabled={featuresList.includes(suggestion)}
                  className="rounded-md border border-dashed border-white/[0.06] bg-white/[0.02] px-2.5 py-1 text-[10px] text-gray-500 transition-all hover:border-white/[0.12] hover:text-gray-400 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  + {suggestion}
                </button>
              ))}
              {catalogFeatures.length > 0 && (
                <a href="/feature-catalog" target="_self" className="inline-flex items-center gap-1 rounded-md border border-dashed border-indigo-500/20 bg-indigo-500/5 px-2.5 py-1 text-[10px] text-indigo-400 transition-all hover:border-indigo-500/30 hover:bg-indigo-500/10">
                  <Tags className="h-2.5 w-2.5" />
                  Manage catalog
                </a>
              )}
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-300">Visibility</label>
              <select value={visibility} onChange={(e) => setVisibility(e.target.value as 'public' | 'private' | 'custom')} className={selCls}>
                <option value="public">Public</option><option value="custom">Custom</option><option value="private">Private</option>
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-300">Routing strategy</label>
              <select value={routingStrategy} onChange={(e) => setRoutingStrategy(e.target.value)} className={selCls}>
                <option value="fastest_delivery">Fastest delivery</option><option value="lowest_cost">Lowest cost</option>
                <option value="highest_reliability">Highest reliability</option><option value="geo_affinity">Geo affinity</option>
                <option value="profit_optimized">Profit optimized</option>
              </select>
            </div>
          </div>
          <label className="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" checked={dedicatedPool} onChange={(e) => setDedicatedPool(e.target.checked)} className="h-4 w-4 rounded border-white/20 bg-white/5 text-blue-500" />
            <span className="text-sm font-medium text-gray-300">Dedicated pool</span>
          </label>
        </div>
      </Modal>

      <ConfirmDialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)} onConfirm={() => deleteMutation.mutate()}
        title="Delete plan" description={`Are you sure you want to delete the "${deleteTarget?.name}" plan?`} loading={deleteMutation.isPending} />
    </motion.div>
    </PageTransition>
  )
}
