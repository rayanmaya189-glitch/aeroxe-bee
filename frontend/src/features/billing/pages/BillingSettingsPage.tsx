import { useState } from 'react'
import { motion } from 'framer-motion'
import { PageTransition } from '@/components/ui/PageTransition'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getPaymentConfigs, upsertPaymentConfig } from '@/services/dashboard'
import type { PaymentConfig } from '@/services/dashboard'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Modal } from '@/components/ui/Modal'
import { staggerContainer, fadeInUp, itemVariants } from '@/components/animations/variants'
import { Settings } from 'lucide-react'
import { useToast } from '@/components/ui/Toast'

const METHOD_LABELS: Record<string, string> = { bank_transfer: 'Bank Transfer', trc20: 'TRC-20 (USDT)', qr_code: 'QR Code' }

export function BillingSettingsPage() {
  const queryClient = useQueryClient()
  const { addToast } = useToast()
  const [editingConfig, setEditingConfig] = useState<PaymentConfig | null>(null)
  const [formDetails, setFormDetails] = useState<Record<string, string>>({})
  const [formLabel, setFormLabel] = useState('')
  const [formEnabled, setFormEnabled] = useState(true)

  const { data: configs = [], isLoading } = useQuery({ queryKey: ['payment-configs'], queryFn: getPaymentConfigs })

  const saveMutation = useMutation({
    mutationFn: (data: { method: string; label: string; details: Record<string, unknown>; enabled: boolean }) => upsertPaymentConfig(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['payment-configs'] }); setEditingConfig(null); addToast('Payment config saved', 'success') },
  })

  const handleEdit = (config: PaymentConfig) => {
    setEditingConfig(config); setFormLabel(config.label); setFormEnabled(config.enabled)
    setFormDetails(config.details as Record<string, string> || {})
  }
  const handleSave = () => {
    if (!editingConfig) return
    saveMutation.mutate({ method: editingConfig.method, label: formLabel, details: formDetails, enabled: formEnabled })
  }

  const inpCls = 'mt-1 block w-full rounded-xl border border-white/[0.08] bg-white/[0.05] px-3 py-2 text-sm text-gray-100 focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-500/10'

  return (
    <PageTransition>
    <motion.div initial="hidden" animate="visible" variants={staggerContainer} className="space-y-8">
      {/* Hero header */}
      <motion.div variants={fadeInUp}>
        <div className="relative overflow-hidden rounded-2xl border border-white/[0.06] bg-white/[0.02] p-8">
          <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-amber-600/10 blur-[80px]" />
          <div className="pointer-events-none absolute -left-8 bottom-0 h-32 w-32 rounded-full bg-orange-600/10 blur-[60px]" />
          <div className="relative flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 shadow-lg shadow-amber-500/25">
              <Settings className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-extrabold tracking-tight text-white lg:text-4xl">
                <span className="bg-gradient-to-r from-amber-400 to-orange-400 bg-clip-text text-transparent">Billing Settings</span>
              </h1>
              <p className="mt-1 text-sm text-gray-400">Configure payment methods available to members.</p>
            </div>
          </div>
        </div>
      </motion.div>

      {isLoading ? (
        <div className="space-y-4">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-36 animate-pulse rounded-2xl bg-white/[0.03]" />)}</div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {configs.map((config, idx) => (
            <motion.div key={config.id} variants={itemVariants}>
              <Card className="relative overflow-hidden" hover glow={['bg-emerald-500/15', 'bg-blue-500/15', 'bg-violet-500/15'][idx % 3]}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{config.label}</CardTitle>
                    <Badge variant={config.enabled ? 'success' : 'default'}>{config.enabled ? 'Enabled' : 'Disabled'}</Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="mb-1 text-xs font-medium uppercase text-gray-500">{METHOD_LABELS[config.method] || config.method}</p>
                  <div className="mb-4 space-y-1.5">
                    {Object.entries(config.details as Record<string, string> || {}).map(([key, val]) => val ? (
                      <div key={key} className="flex justify-between text-sm"><span className="text-gray-400">{key.replace(/_/g, ' ')}</span><span className="font-mono text-gray-100">{val}</span></div>
                    ) : null)}
                  </div>
                  <Button variant="secondary" size="sm" onClick={() => handleEdit(config)}>Configure</Button>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      <Modal open={!!editingConfig} onClose={() => setEditingConfig(null)} title={`Configure ${editingConfig?.label || ''}`}>
        {editingConfig && (
          <div className="space-y-4">
            <div><label className="block text-sm font-medium text-gray-300">Label</label><input value={formLabel} onChange={(e) => setFormLabel(e.target.value)} className={inpCls} /></div>
            <div className="flex items-center gap-3">
              <label className="text-sm font-medium text-gray-300">Enabled</label>
              <button onClick={() => setFormEnabled(!formEnabled)} className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${formEnabled ? 'bg-blue-600' : 'bg-gray-600'}`}>
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${formEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
              </button>
            </div>
            {Object.keys(formDetails).map((key) => (
              <div key={key}><label className="block text-sm font-medium text-gray-300">{key.replace(/_/g, ' ')}</label><input value={formDetails[key] || ''} onChange={(e) => setFormDetails({ ...formDetails, [key]: e.target.value })} className={inpCls} /></div>
            ))}
            <div className="flex justify-end gap-2"><Button variant="secondary" onClick={() => setEditingConfig(null)}>Cancel</Button><Button onClick={handleSave} loading={saveMutation.isPending}>Save</Button></div>
          </div>
        )}
      </Modal>
    </motion.div>
    </PageTransition>
  )
}
