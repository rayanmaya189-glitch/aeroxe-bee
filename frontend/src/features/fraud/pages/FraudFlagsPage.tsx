import { motion } from 'framer-motion'
import { PageTransition } from '@/components/ui/PageTransition'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getFraudFlags, reviewFraudFlag } from '@/services/dashboard'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { PageSkeleton } from '@/components/ui/Skeleton'
import { EmptyState } from '@/components/ui/EmptyState'
import { staggerContainer, fadeInUp, itemVariants } from '@/components/animations/variants'
import { CheckCircle, ShieldAlert } from 'lucide-react'

export function FraudFlagsPage() {
  const queryClient = useQueryClient()
  const { data: flags = [], isLoading } = useQuery({ queryKey: ['fraud-flags'], queryFn: getFraudFlags })
  const reviewMutation = useMutation({
    mutationFn: reviewFraudFlag,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['fraud-flags'] }),
  })

  if (isLoading) return <PageTransition><PageSkeleton /></PageTransition>

  return (
    <PageTransition>
    <motion.div initial="hidden" animate="visible" variants={staggerContainer} className="space-y-8">
      {/* Hero header */}
      <motion.div variants={fadeInUp}>
        <div className="relative overflow-hidden rounded-2xl border border-white/[0.06] bg-white/[0.02] p-8">
          <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-orange-600/10 blur-[80px]" />
          <div className="pointer-events-none absolute -left-8 bottom-0 h-32 w-32 rounded-full bg-red-600/10 blur-[60px]" />
          <div className="relative flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-orange-500 to-red-600 shadow-lg shadow-orange-500/25">
              <ShieldAlert className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-extrabold tracking-tight text-white lg:text-4xl">
                <span className="bg-gradient-to-r from-orange-400 to-red-400 bg-clip-text text-transparent">Fraud flags</span>
              </h1>
              <p className="mt-1 text-sm text-gray-400">Review flagged suspicious activity</p>
            </div>
          </div>
        </div>
      </motion.div>

      {flags.length === 0 ? (
        <EmptyState title="No fraud flags" description="Suspicious activity will be flagged here for review." />
      ) : (
        <motion.div variants={itemVariants} className="overflow-hidden rounded-2xl border border-white/[0.06] bg-white/[0.03]">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-white/[0.06]">
                {['Account', 'Type', 'Severity', 'Description', 'Status', ''].map((h) => (
                  <th key={h} className="px-4 py-3 text-xs font-medium uppercase text-gray-500">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {flags.map((f) => (
                <tr key={f.id} className="transition-colors hover:bg-white/[0.03]">
                  <td className="px-4 py-3 font-mono text-xs text-gray-100">{f.account_id.slice(0, 8)}…</td>
                  <td className="px-4 py-3"><Badge size="sm">{f.flag_type}</Badge></td>
                  <td className="px-4 py-3"><Badge variant={f.severity === 'high' ? 'danger' : f.severity === 'medium' ? 'warning' : 'default'} size="sm">{f.severity}</Badge></td>
                  <td className="max-w-sm truncate px-4 py-3 text-xs text-gray-500">{f.description}</td>
                  <td className="px-4 py-3"><Badge variant={f.reviewed ? 'success' : 'warning'} dot size="sm">{f.reviewed ? 'Reviewed' : 'Pending'}</Badge></td>
                  <td className="px-4 py-3">
                    {!f.reviewed && <Button variant="ghost" size="xs" icon={<CheckCircle className="h-3 w-3" />} onClick={() => reviewMutation.mutate(f.id)} loading={reviewMutation.isPending}>Review</Button>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </motion.div>
      )}
    </motion.div>
    </PageTransition>
  )
}
