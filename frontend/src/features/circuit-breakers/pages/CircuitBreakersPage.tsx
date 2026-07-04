import { motion } from 'framer-motion'
import { PageTransition } from '@/components/ui/PageTransition'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getCircuitBreakers, resetCircuitBreaker } from '@/services/dashboard'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { PageSkeleton } from '@/components/ui/Skeleton'
import { EmptyState } from '@/components/ui/EmptyState'
import { staggerContainer, fadeInUp, itemVariants } from '@/components/animations/variants'
import { RotateCcw, BrainCircuit } from 'lucide-react'

export function CircuitBreakersPage() {
  const queryClient = useQueryClient()
  const { data: events = [], isLoading, error } = useQuery({ queryKey: ['circuit-breakers'], queryFn: getCircuitBreakers })
  const resetMutation = useMutation({
    mutationFn: ({ scope, id }: { scope: string; id: string }) => resetCircuitBreaker(scope, id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['circuit-breakers'] }),
  })

  if (isLoading) return <PageTransition><PageSkeleton /></PageTransition>

  if (error) {
    return (
      <PageTransition>
        <div className="space-y-6">
          <h1 className="text-2xl font-bold tracking-tight text-gray-100">Circuit breakers</h1>
          <div className="rounded-2xl border border-red-500/20 bg-red-500/5 p-4 text-sm text-red-400">Failed to load circuit breaker data.</div>
        </div>
      </PageTransition>
    )
  }

  return (
    <PageTransition>
    <motion.div initial="hidden" animate="visible" variants={staggerContainer} className="space-y-8">
      {/* Hero header */}
      <motion.div variants={fadeInUp}>
        <div className="relative overflow-hidden rounded-2xl border border-white/[0.06] bg-white/[0.02] p-8">
          <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-red-600/10 blur-[80px]" />
          <div className="pointer-events-none absolute -left-8 bottom-0 h-32 w-32 rounded-full bg-cyan-600/10 blur-[60px]" />
          <div className="relative flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-red-500 to-cyan-600 shadow-lg shadow-red-500/25">
              <BrainCircuit className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-extrabold tracking-tight text-white lg:text-4xl">
                <span className="bg-gradient-to-r from-red-400 to-cyan-400 bg-clip-text text-transparent">Circuit breakers</span>
              </h1>
              <p className="mt-1 text-sm text-gray-400">Monitor circuit breaker state changes</p>
            </div>
          </div>
        </div>
      </motion.div>

      {events.length === 0 ? (
        <EmptyState title="No circuit breaker events" description="Circuit breaker events will appear here when thresholds are breached." />
      ) : (
        <motion.div variants={itemVariants} className="overflow-hidden rounded-2xl border border-white/[0.06] bg-white/[0.03]">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-white/[0.06]">
                {['Scope', 'Value', 'State', 'Opened', 'Reason', ''].map((h) => (
                  <th key={h} className="px-4 py-3 text-xs font-medium uppercase text-gray-500">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {events.map((e, i) => (
                <tr key={i} className="transition-colors hover:bg-white/[0.03]">
                  <td className="px-4 py-3 font-medium text-gray-100">{e.scope}</td>
                  <td className="px-4 py-3 text-gray-400">{e.scope_value}</td>
                  <td className="px-4 py-3"><Badge variant={e.state === 'OPEN' ? 'danger' : e.state === 'HALF_OPEN' ? 'warning' : 'success'} dot size="sm">{e.state}</Badge></td>
                  <td className="px-4 py-3 text-gray-400">{new Date(e.opened_at).toLocaleString()}</td>
                  <td className="max-w-sm truncate px-4 py-3 text-xs text-gray-500">{e.reason}</td>
                  <td className="px-4 py-3">
                    {e.state !== 'CLOSED' && <Button variant="ghost" size="xs" icon={<RotateCcw className="h-3 w-3" />} onClick={() => resetMutation.mutate({ scope: e.scope, id: e.scope_value })} loading={resetMutation.isPending}>Reset</Button>}
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
