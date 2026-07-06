import { useState } from 'react'
import { motion } from 'framer-motion'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { PageTransition } from '@/components/ui/PageTransition'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { EmptyState } from '@/components/ui/EmptyState'
import { PageSkeleton } from '@/components/ui/Skeleton'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { staggerContainer, fadeInUp, itemVariants } from '@/components/animations/variants'
import { getFeatureCatalog, createFeatureCatalogItem, toggleFeatureCatalogItem, deleteFeatureCatalogItem } from '@/services/dashboard'
import type { FeatureCatalogItem } from '@/types/models'
import { Tags, Plus, GripVertical, Trash2, Eye, EyeOff } from 'lucide-react'
import { useToast } from '@/components/ui/Toast'

const CATEGORY_COLORS: Record<string, string> = {
  quota: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  devices: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  routing: 'bg-violet-500/10 text-violet-400 border-violet-500/20',
  analytics: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  support: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
  infrastructure: 'bg-pink-500/10 text-pink-400 border-pink-500/20',
  integration: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
  general: 'bg-gray-500/10 text-gray-400 border-gray-500/20',
}

const CATEGORIES = ['all', 'quota', 'devices', 'routing', 'analytics', 'support', 'infrastructure', 'integration', 'general']

export function FeatureCatalogPage() {
  const queryClient = useQueryClient()
  const { addToast } = useToast()
  const [showAddModal, setShowAddModal] = useState(false)
  const [newName, setNewName] = useState('')
  const [newCategory, setNewCategory] = useState('general')
  const [deleteTarget, setDeleteTarget] = useState<FeatureCatalogItem | null>(null)
  const [filterCategory, setFilterCategory] = useState('all')

  const { data: features = [], isLoading } = useQuery({
    queryKey: ['feature-catalog'],
    queryFn: getFeatureCatalog,
  })

  const [error, setError] = useState('')

  const createMutation = useMutation({
    mutationFn: () => createFeatureCatalogItem({ name: newName, category: newCategory }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feature-catalog'] })
      setShowAddModal(false); setNewName(''); setNewCategory('general'); setError(''); addToast('Feature added to catalog', 'success')
    },
    onError: (err: Error) => { addToast(err.message || 'Failed to add feature', 'error'); setError(err.message) },
  })

  const toggleMutation = useMutation({
    mutationFn: (item: FeatureCatalogItem) => toggleFeatureCatalogItem(item.id, !item.active),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['feature-catalog'] }); addToast('Feature toggled', 'success') },
    onError: (err: Error) => { addToast(err.message || 'Failed to toggle feature', 'error') },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteFeatureCatalogItem(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feature-catalog'] })
      setDeleteTarget(null); addToast('Feature removed', 'success')
    },
    onError: (err: Error) => { addToast(err.message || 'Failed to delete feature', 'error') },
  })

  const filtered = filterCategory === 'all' ? features : features.filter((f) => f.category === filterCategory)

  // Group by category
  const grouped = filtered.reduce<Record<string, FeatureCatalogItem[]>>((acc, item) => {
    ;(acc[item.category] = acc[item.category] || []).push(item)
    return acc
  }, {})

  if (isLoading) return <PageTransition><PageSkeleton /></PageTransition>

  return (
    <PageTransition>
      <motion.div initial="hidden" animate="visible" variants={staggerContainer} className="space-y-8">
        {/* Hero header */}
        <motion.div variants={fadeInUp}>
          <div className="relative overflow-hidden rounded-2xl border border-white/[0.06] bg-white/[0.02] p-8">
            <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-indigo-600/10 blur-[80px]" />
            <div className="pointer-events-none absolute -left-8 bottom-0 h-32 w-32 rounded-full bg-blue-600/10 blur-[60px]" />
            <div className="relative flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-blue-600 shadow-lg shadow-indigo-500/25">
                  <Tags className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h1 className="text-3xl font-extrabold tracking-tight text-white lg:text-4xl">
                    <span className="bg-gradient-to-r from-indigo-400 to-blue-400 bg-clip-text text-transparent">Feature Catalog</span>
                  </h1>
                  <p className="mt-1 text-sm text-gray-400">Manage the global list of features that auto-suggest across all plans</p>
                </div>
              </div>
              <Button size="sm" icon={<Plus className="h-4 w-4" />} onClick={() => setShowAddModal(true)}>Add feature</Button>
            </div>
          </div>
        </motion.div>

        {/* Stats */}
        <motion.div variants={fadeInUp} className="flex items-center gap-4">
          <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-2.5 text-sm">
            <span className="text-gray-500">Total:</span>{' '}
            <span className="font-semibold text-white">{features.length}</span>
          </div>
          <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-2.5 text-sm">
            <span className="text-gray-500">Active:</span>{' '}
            <span className="font-semibold text-emerald-400">{features.filter((f) => f.active).length}</span>
          </div>
          <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-2.5 text-sm">
            <span className="text-gray-500">Inactive:</span>{' '}
            <span className="font-semibold text-gray-500">{features.filter((f) => !f.active).length}</span>
          </div>
        </motion.div>

        {/* Category filter */}
        <motion.div variants={fadeInUp} className="flex flex-wrap gap-2">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setFilterCategory(cat)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium capitalize transition-all ${
                filterCategory === cat
                  ? 'bg-blue-600 text-white'
                  : 'bg-white/[0.04] text-gray-400 hover:bg-white/[0.08] hover:text-gray-300'
              }`}
            >
              {cat === 'all' ? `All (${features.length})` : `${cat} (${features.filter((f) => f.category === cat).length})`}
            </button>
          ))}
        </motion.div>

        {/* Feature list */}
        {Object.keys(grouped).length === 0 ? (
          <EmptyState
            title="No features in catalog"
            description="Add features that admins can quickly assign to any plan."
            action={<Button size="sm" onClick={() => setShowAddModal(true)}>Add first feature</Button>}
          />
        ) : (
          <div className="space-y-6">
            {Object.entries(grouped).map(([category, items]) => (
              <motion.div key={category} variants={itemVariants}>
                <Card>
                  <div className="mb-4 flex items-center gap-2">
                    <span className={`inline-flex items-center rounded-md border px-2.5 py-1 text-xs font-semibold capitalize ${CATEGORY_COLORS[category] || CATEGORY_COLORS.general}`}>
                      {category}
                    </span>
                    <span className="text-xs text-gray-500">{items.length} feature{items.length !== 1 ? 's' : ''}</span>
                  </div>
                  <div className="space-y-1">
                    {items.map((item) => (
                      <div
                        key={item.id}
                        className={`group flex items-center justify-between rounded-lg px-3 py-2.5 transition-colors ${
                          item.active ? 'hover:bg-white/[0.03]' : 'opacity-50 hover:bg-white/[0.03]'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <GripVertical className="h-4 w-4 text-gray-600" />
                          <span className={`text-sm ${item.active ? 'text-gray-200' : 'text-gray-500 line-through'}`}>
                            {item.name}
                          </span>
                          {!item.active && <Badge variant="warning" size="sm">Inactive</Badge>}
                        </div>
                        <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                          <Button
                            variant="ghost"
                            size="xs"
                            onClick={() => toggleMutation.mutate(item)}
                            title={item.active ? 'Deactivate' : 'Activate'}
                          >
                            {item.active ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                          </Button>
                          <Button
                            variant="ghost"
                            size="xs"
                            className="text-red-400"
                            onClick={() => setDeleteTarget(item)}
                            title="Delete"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>
        )}

        {/* Add modal */}
        <Modal
          open={showAddModal}
          onClose={() => { setShowAddModal(false); setError('') }}
          title="Add feature to catalog"
          footer={
            <>
              <Button variant="ghost" size="sm" onClick={() => setShowAddModal(false)} disabled={createMutation.isPending}>Cancel</Button>
              <Button size="sm" onClick={() => createMutation.mutate()} loading={createMutation.isPending}>Add</Button>
            </>
          }
        >
          <div className="space-y-4">
            {error && <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-3 text-sm text-red-400">{error}</div>}
            <Input
              label="Feature name"
              value={newName}
              onChange={(e) => { setNewName(e.target.value); if (error) setError('') }}
              placeholder="e.g. 5K SMS/month, Priority support"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter' && newName.trim()) createMutation.mutate()
              }}
            />
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-300">Category</label>
              <select
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                className="block w-full rounded-xl border border-white/[0.08] bg-white/[0.05] px-3.5 py-2.5 text-sm text-gray-100 focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-500/10"
              >
                {CATEGORIES.filter((c) => c !== 'all').map((cat) => (
                  <option key={cat} value={cat}>{cat.charAt(0).toUpperCase() + cat.slice(1)}</option>
                ))}
              </select>
            </div>
          </div>
        </Modal>

        <ConfirmDialog
          open={!!deleteTarget}
          onClose={() => setDeleteTarget(null)}
          onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
          title="Delete feature"
          description={`Remove "${deleteTarget?.name}" from the global catalog? This won't affect features already assigned to plans.`}
          loading={deleteMutation.isPending}
        />
      </motion.div>
    </PageTransition>
  )
}
