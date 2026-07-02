import { useQuery } from '@tanstack/react-query'
import { getCircuitBreakers } from '@/services/dashboard'
import type { CircuitBreakerEvent } from '@/types/models'
import { Badge } from '@/components/ui/Badge'
import { PageSkeleton } from '@/components/ui/Skeleton'
import { EmptyState } from '@/components/ui/EmptyState'

export function CircuitBreakersPage() {
  const { data: events = [], isLoading } = useQuery({
    queryKey: ['circuit-breakers'],
    queryFn: getCircuitBreakers,
  })

  if (isLoading) return <PageSkeleton />

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-100">Circuit breakers</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Monitor circuit breaker state changes</p>
      </div>

      {events.length === 0 ? (
        <EmptyState title="No circuit breaker events" description="Circuit breaker events will appear here when thresholds are breached." />
      ) : (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-800">
                <th className="px-4 py-3 text-xs font-medium uppercase text-gray-500 dark:text-gray-400">Scope</th>
                <th className="px-4 py-3 text-xs font-medium uppercase text-gray-500 dark:text-gray-400">Value</th>
                <th className="px-4 py-3 text-xs font-medium uppercase text-gray-500 dark:text-gray-400">State</th>
                <th className="px-4 py-3 text-xs font-medium uppercase text-gray-500 dark:text-gray-400">Opened</th>
                <th className="px-4 py-3 text-xs font-medium uppercase text-gray-500 dark:text-gray-400">Reason</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800/50">
              {events.map((e, i) => (
                <tr key={i} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/30">
                  <td className="px-4 py-3 font-medium text-gray-900 dark:text-gray-100">{e.scope}</td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{e.scope_value}</td>
                  <td className="px-4 py-3">
                    <Badge variant={e.state === 'OPEN' ? 'danger' : e.state === 'HALF_OPEN' ? 'warning' : 'success'} dot size="sm">{e.state}</Badge>
                  </td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{new Date(e.opened_at).toLocaleString()}</td>
                  <td className="max-w-sm truncate px-4 py-3 text-xs text-gray-500 dark:text-gray-400">{e.reason}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
