import { useState, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import { PageTransition } from '@/components/ui/PageTransition'
import api from '@/services/api'
import type { ApiResponse } from '@/types/api'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { PageSkeleton } from '@/components/ui/Skeleton'
import { staggerContainer, fadeInUp, itemVariants } from '@/components/animations/variants'
import { Settings, Save, RotateCcw, Shield, Zap, Bell, Globe, Wrench } from 'lucide-react'

interface ConfigEntry {
  id: string
  config_key: string
  config_value: string
  value_type: string
  category: string
  description: string
  is_sensitive: boolean
  updated_by_name: string
  updated_at: string
}

const categoryConfig: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  feature_flags: { label: 'Feature Flags', icon: <Zap className="h-4 w-4" />, color: 'text-yellow-400' },
  update: { label: 'App Updates', icon: <RotateCcw className="h-4 w-4" />, color: 'text-blue-400' },
  general: { label: 'General', icon: <Globe className="h-4 w-4" />, color: 'text-green-400' },
  mqtt: { label: 'MQTT', icon: <Wrench className="h-4 w-4" />, color: 'text-purple-400' },
  notifications: { label: 'Notifications', icon: <Bell className="h-4 w-4" />, color: 'text-orange-400' },
  security: { label: 'Security', icon: <Shield className="h-4 w-4" />, color: 'text-red-400' },
}

export function FirebaseConfigPage() {
  const [entries, setEntries] = useState<ConfigEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [editedValues, setEditedValues] = useState<Record<string, string>>({})
  const [hasChanges, setHasChanges] = useState(false)

  const load = useCallback(async () => {
    try {
      setLoading(true)
      setError('')
      const res = await api.get<ApiResponse<ConfigEntry[]>>('/admin/firebase-config')
      setEntries(res.data.data || [])
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load config')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  function handleChange(key: string, value: string) {
    setEditedValues((prev) => ({ ...prev, [key]: value }))
    setHasChanges(true)
  }

  async function handleSaveAll() {
    try {
      setSaving(true)
      const entriesToUpdate = Object.entries(editedValues).map(([key, value]) => {
        const original = entries.find((e) => e.config_key === key)
        return {
          config_key: key,
          config_value: value,
          value_type: original?.value_type || 'string',
          category: original?.category || 'general',
          description: original?.description || '',
          is_sensitive: original?.is_sensitive || false,
        }
      })
      await api.put('/admin/firebase-config', { entries: entriesToUpdate })
      setEditedValues({})
      setHasChanges(false)
      load()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save config')
    } finally {
      setSaving(false)
    }
  }

  const grouped = entries.reduce((acc, entry) => {
    const cat = entry.category || 'general'
    if (!acc[cat]) acc[cat] = []
    acc[cat].push(entry)
    return acc
  }, {} as Record<string, ConfigEntry[]>)

  if (loading) return <PageTransition><PageSkeleton /></PageTransition>

  return (
    <PageTransition>
      <motion.div initial="hidden" animate="visible" variants={staggerContainer} className="space-y-6">
        <motion.div variants={fadeInUp}>
          <div className="relative overflow-hidden rounded-2xl border border-white/[0.06] bg-white/[0.02] p-8">
            <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-yellow-600/10 blur-[80px]" />
            <div className="pointer-events-none absolute -left-8 bottom-0 h-32 w-32 rounded-full bg-orange-600/10 blur-[60px]" />
            <div className="relative flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-yellow-500 to-orange-600 shadow-lg shadow-yellow-500/25">
                  <Settings className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h1 className="text-3xl font-extrabold tracking-tight text-white lg:text-4xl">
                    <span className="bg-gradient-to-r from-yellow-400 to-orange-400 bg-clip-text text-transparent">Firebase Config</span>
                  </h1>
                  <p className="mt-1 text-sm text-gray-400">Manage remote configuration for the Android app</p>
                </div>
              </div>
              {hasChanges && (
                <Button onClick={handleSaveAll} loading={saving} icon={<Save className="h-4 w-4" />}>
                  Save Changes
                </Button>
              )}
            </div>
          </div>
        </motion.div>

        {error && (
          <motion.div variants={itemVariants} className="rounded-2xl border border-red-500/20 bg-red-500/5 p-3 text-sm text-red-400">
            {error}
            <button onClick={() => setError('')} className="ml-2 font-medium underline">Dismiss</button>
          </motion.div>
        )}

        {Object.entries(grouped).map(([category, catEntries]) => (
          <motion.div key={category} variants={itemVariants}>
            <Card>
              <div className="flex items-center gap-2 mb-4">
                <span className={categoryConfig[category]?.color || 'text-gray-400'}>
                  {categoryConfig[category]?.icon || <Settings className="h-4 w-4" />}
                </span>
                <h2 className="text-lg font-bold text-white">{categoryConfig[category]?.label || category}</h2>
                <Badge variant="default" size="sm">{catEntries.length}</Badge>
              </div>
              <div className="space-y-3">
                {catEntries.map((entry) => {
                  const currentValue = editedValues[entry.config_key] ?? entry.config_value
                  const isEdited = editedValues[entry.config_key] !== undefined
                  return (
                    <div key={entry.config_key} className={`rounded-xl border p-4 transition-colors ${isEdited ? 'border-blue-500/30 bg-blue-500/5' : 'border-white/[0.04] bg-white/[0.02]'}`}>
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-mono font-medium text-gray-200">{entry.config_key}</span>
                            <Badge variant="default" size="sm">{entry.value_type}</Badge>
                            {entry.is_sensitive && <Badge variant="danger" size="sm">Sensitive</Badge>}
                          </div>
                          {entry.description && <p className="mt-1 text-xs text-gray-500">{entry.description}</p>}
                        </div>
                        <div className="w-64">
                          {entry.value_type === 'boolean' ? (
                            <select value={currentValue} onChange={(e) => handleChange(entry.config_key, e.target.value)} className="w-full rounded-lg border border-white/[0.08] bg-white/[0.05] px-3 py-2 text-sm text-gray-300">
                              <option value="true">true</option>
                              <option value="false">false</option>
                            </select>
                          ) : entry.value_type === 'integer' ? (
                            <Input type="number" value={currentValue} onChange={(e) => handleChange(entry.config_key, e.target.value)} className="text-sm" />
                          ) : (
                            <Input value={currentValue} onChange={(e) => handleChange(entry.config_key, e.target.value)} className="text-sm" />
                          )}
                        </div>
                      </div>
                      {entry.updated_at && (
                        <p className="mt-2 text-[10px] text-gray-600">Updated {new Date(entry.updated_at).toLocaleString()} {entry.updated_by_name ? `by ${entry.updated_by_name}` : ''}</p>
                      )}
                    </div>
                  )
                })}
              </div>
            </Card>
          </motion.div>
        ))}
      </motion.div>
    </PageTransition>
  )
}
