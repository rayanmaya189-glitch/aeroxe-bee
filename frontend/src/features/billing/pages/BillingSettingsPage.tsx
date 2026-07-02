import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getPaymentConfigs, upsertPaymentConfig, type PaymentConfig } from '@/services/dashboard'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Modal } from '@/components/ui/Modal'

const METHOD_LABELS: Record<string, string> = {
  bank_transfer: 'Bank Transfer',
  trc20: 'TRC-20 (USDT)',
  qr_code: 'QR Code',
}

export function BillingSettingsPage() {
  const queryClient = useQueryClient()
  const [editingConfig, setEditingConfig] = useState<PaymentConfig | null>(null)
  const [formDetails, setFormDetails] = useState<Record<string, string>>({})
  const [formLabel, setFormLabel] = useState('')
  const [formEnabled, setFormEnabled] = useState(true)

  const { data: configs = [], isLoading } = useQuery({
    queryKey: ['payment-configs'],
    queryFn: getPaymentConfigs,
  })

  const saveMutation = useMutation({
    mutationFn: (data: { method: string; label: string; details: Record<string, unknown>; enabled: boolean }) => upsertPaymentConfig(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payment-configs'] })
      setEditingConfig(null)
    },
  })

  const handleEdit = (config: PaymentConfig) => {
    setEditingConfig(config)
    setFormLabel(config.label)
    setFormEnabled(config.enabled)
    setFormDetails(config.details as Record<string, string> || {})
  }

  const handleSave = () => {
    if (!editingConfig) return
    saveMutation.mutate({
      method: editingConfig.method,
      label: formLabel,
      details: formDetails,
      enabled: formEnabled,
    })
  }

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Billing Settings</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Configure payment methods available to members. Toggle enable/disable anytime.</p>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-32 animate-pulse rounded-2xl bg-gray-100 dark:bg-gray-800" />
          ))}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {configs.map((config) => (
            <Card key={config.id} className="relative overflow-hidden">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">{config.label}</CardTitle>
                  <Badge variant={config.enabled ? 'success' : 'default'}>
                    {config.enabled ? 'Enabled' : 'Disabled'}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <p className="mb-1 text-xs font-medium uppercase text-gray-400 dark:text-gray-500">
                  {METHOD_LABELS[config.method] || config.method}
                </p>
                <div className="mb-4 space-y-1">
                  {Object.entries(config.details as Record<string, string> || {}).map(([key, val]) => (
                    val ? (
                      <div key={key} className="flex justify-between text-sm">
                        <span className="text-gray-500 dark:text-gray-400">{key.replace(/_/g, ' ')}</span>
                        <span className="font-mono text-gray-900 dark:text-gray-100">{val}</span>
                      </div>
                    ) : null
                  ))}
                </div>
                <Button variant="outline" size="sm" onClick={() => handleEdit(config)}>
                  Configure
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Modal isOpen={!!editingConfig} onClose={() => setEditingConfig(null)} title={`Configure ${editingConfig?.label || ''}`}>
        {editingConfig && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Label</label>
              <input
                value={formLabel}
                onChange={(e) => setFormLabel(e.target.value)}
                className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800"
              />
            </div>
            <div className="flex items-center gap-3">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Enabled</label>
              <button
                onClick={() => setFormEnabled(!formEnabled)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${formEnabled ? 'bg-primary-600' : 'bg-gray-300 dark:bg-gray-600'}`}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${formEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
              </button>
            </div>
            {Object.keys(formDetails).map((key) => (
              <div key={key}>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">{key.replace(/_/g, ' ')}</label>
                <input
                  value={formDetails[key] || ''}
                  onChange={(e) => setFormDetails({ ...formDetails, [key]: e.target.value })}
                  className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800"
                />
              </div>
            ))}
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setEditingConfig(null)}>Cancel</Button>
              <Button onClick={handleSave} loading={saveMutation.isPending}>Save</Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
