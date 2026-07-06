import { useState } from 'react'
import { motion } from 'framer-motion'
import { PageTransition } from '@/components/ui/PageTransition'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getDeadLetters, retryDeadLetter } from '@/services/dashboard'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { PageSkeleton } from '@/components/ui/Skeleton'
import { EmptyState } from '@/components/ui/EmptyState'
import { staggerContainer, fadeInUp, itemVariants } from '@/components/animations/variants'
import { RefreshCw, MessageSquareOff } from 'lucide-react'
import { useToast } from '@/components/ui/Toast'

export function DeadLettersPage() {
  const queryClient = useQueryClient()
  const { addToast } = useToast()
  const [retryingId, setRetryingId] = useState<string | null>(null)
  const { data: letters = [], isLoading } = useQuery({ queryKey: ['dead-letters'], queryFn: getDeadLetters })

  const retryMutation = useMutation({
    mutationFn: async (id: string) => { setRetryingId(id); await retryDeadLetter(id) },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['dead-letters'] }); setRetryingId(null); addToast('Message requeued for retry', 'success') },
    onError: () => { addToast('Retry failed', 'error'); setRetryingId(null) },
  })

  if (isLoading) return <PageTransition><PageSkeleton /></PageTransition>

  return (
    <PageTransition>
    <motion.div initial="hidden" animate="visible" variants={staggerContainer} className="space-y-8">
      {/* Hero header */}
      <motion.div variants={fadeInUp}>
        <div className="relative overflow-hidden rounded-2xl border border-white/[0.06] bg-white/[0.02] p-8">
          <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-rose-600/10 blur-[80px]" />
          <div className="pointer-events-none absolute -left-8 bottom-0 h-32 w-32 rounded-full bg-pink-600/10 blur-[60px]" />
          <div className="relative flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-rose-500 to-pink-600 shadow-lg shadow-rose-500/25">
              <MessageSquareOff className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-extrabold tracking-tight text-white lg:text-4xl">
                <span className="bg-gradient-to-r from-rose-400 to-pink-400 bg-clip-text text-transparent">Dead letters</span>
              </h1>
              <p className="mt-1 text-sm text-gray-400">Messages that failed delivery after all retries</p>
            </div>
          </div>
        </div>
      </motion.div>

      {letters.length === 0 ? (
        <EmptyState title="No dead letters" description="Failed messages will appear here for inspection." />
      ) : (
        <motion.div variants={itemVariants} className="overflow-hidden rounded-2xl border border-white/[0.06] bg-white/[0.03]">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-white/[0.06]">
                {['Stream', 'Message ID', 'Reason', 'Retries', 'Failed at', ''].map((h) => (
                  <th key={h} className="px-4 py-3 text-xs font-medium uppercase text-gray-500">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {letters.map((dl) => (
                <tr key={dl.id} className="transition-colors hover:bg-white/[0.03]">
                  <td className="px-4 py-3 font-medium text-gray-100">{dl.stream}</td>
                  <td className="max-w-[200px] truncate px-4 py-3 font-mono text-xs text-gray-400">{dl.message_id}</td>
                  <td className="max-w-[300px] truncate px-4 py-3 text-xs text-gray-500">{dl.fail_reason}</td>
                  <td className="px-4 py-3"><Badge size="sm">{dl.retry_count}</Badge></td>
                  <td className="px-4 py-3 text-xs text-gray-400">{new Date(dl.failed_at).toLocaleString()}</td>
                  <td className="px-4 py-3">
                    <Button variant="ghost" size="xs" icon={<RefreshCw className="h-3 w-3" />} onClick={() => retryMutation.mutate(dl.id)} loading={retryMutation.isPending && retryingId === dl.id}>Retry</Button>
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
