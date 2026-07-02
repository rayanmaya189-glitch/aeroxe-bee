import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getDeadLetters, retryDeadLetter } from '@/services/dashboard'
import type { DeadLetter } from '@/types/models'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { PageSkeleton } from '@/components/ui/Skeleton'
import { EmptyState } from '@/components/ui/EmptyState'

export function DeadLettersPage() {
  const queryClient = useQueryClient()
  const [retryingId, setRetryingId] = useState<string | null>(null)

  const { data: letters = [], isLoading } = useQuery({
    queryKey: ['dead-letters'],
    queryFn: getDeadLetters,
  })

  const retryMutation = useMutation({
    mutationFn: async (id: string) => {
      setRetryingId(id)
      await retryDeadLetter(id)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dead-letters'] })
      setRetryingId(null)
    },
    onError: () => setRetryingId(null),
  })

  if (isLoading) return <PageSkeleton />

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-100">Dead letters</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Messages that failed delivery after all retries</p>
      </div>

      {letters.length === 0 ? (
        <EmptyState title="No dead letters" description="Failed messages will appear here for inspection." />
      ) : (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-800">
                <th className="px-4 py-3 text-xs font-medium uppercase text-gray-500 dark:text-gray-400">Stream</th>
                <th className="px-4 py-3 text-xs font-medium uppercase text-gray-500 dark:text-gray-400">Message ID</th>
                <th className="px-4 py-3 text-xs font-medium uppercase text-gray-500 dark:text-gray-400">Reason</th>
                <th className="px-4 py-3 text-xs font-medium uppercase text-gray-500 dark:text-gray-400">Retries</th>
                <th className="px-4 py-3 text-xs font-medium uppercase text-gray-500 dark:text-gray-400">Failed at</th>
                <th className="px-4 py-3 text-xs font-medium uppercase text-gray-500 dark:text-gray-400"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800/50">
              {letters.map((dl) => (
                <tr key={dl.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/30">
                  <td className="px-4 py-3 font-medium text-gray-900 dark:text-gray-100">{dl.stream}</td>
                  <td className="max-w-[200px] truncate px-4 py-3 font-mono text-xs text-gray-600 dark:text-gray-400">{dl.message_id}</td>
                  <td className="max-w-[300px] truncate px-4 py-3 text-xs text-gray-500 dark:text-gray-400">{dl.fail_reason}</td>
                  <td className="px-4 py-3"><Badge size="sm">{dl.retry_count}</Badge></td>
                  <td className="px-4 py-3 text-xs text-gray-600 dark:text-gray-400">{new Date(dl.failed_at).toLocaleString()}</td>
                  <td className="px-4 py-3">
                    <Button variant="ghost" size="xs" onClick={() => retryMutation.mutate(dl.id)} loading={retryMutation.isPending && retryingId === dl.id}>Retry</Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
