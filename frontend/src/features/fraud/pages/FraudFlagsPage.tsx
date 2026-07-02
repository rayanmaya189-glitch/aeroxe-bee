import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getFraudFlags, reviewFraudFlag } from '@/services/dashboard'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { PageSkeleton } from '@/components/ui/Skeleton'
import { EmptyState } from '@/components/ui/EmptyState'

export function FraudFlagsPage() {
  const queryClient = useQueryClient()

  const { data: flags = [], isLoading } = useQuery({
    queryKey: ['fraud-flags'],
    queryFn: getFraudFlags,
  })

  const reviewMutation = useMutation({
    mutationFn: reviewFraudFlag,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['fraud-flags'] }),
  })

  if (isLoading) return <PageSkeleton />

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-100">Fraud flags</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Review flagged suspicious activity</p>
      </div>

      {flags.length === 0 ? (
        <EmptyState title="No fraud flags" description="Suspicious activity will be flagged here for review." />
      ) : (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-800">
                <th className="px-4 py-3 text-xs font-medium uppercase text-gray-500 dark:text-gray-400">Account</th>
                <th className="px-4 py-3 text-xs font-medium uppercase text-gray-500 dark:text-gray-400">Type</th>
                <th className="px-4 py-3 text-xs font-medium uppercase text-gray-500 dark:text-gray-400">Severity</th>
                <th className="px-4 py-3 text-xs font-medium uppercase text-gray-500 dark:text-gray-400">Description</th>
                <th className="px-4 py-3 text-xs font-medium uppercase text-gray-500 dark:text-gray-400">Status</th>
                <th className="px-4 py-3 text-xs font-medium uppercase text-gray-500 dark:text-gray-400"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800/50">
              {flags.map((f) => (
                <tr key={f.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/30">
                  <td className="px-4 py-3 font-mono text-xs text-gray-900 dark:text-gray-100">{f.account_id.slice(0, 8)}…</td>
                  <td className="px-4 py-3"><Badge size="sm">{f.flag_type}</Badge></td>
                  <td className="px-4 py-3">
                    <Badge variant={f.severity === 'high' ? 'danger' : f.severity === 'medium' ? 'warning' : 'default'} size="sm">{f.severity}</Badge>
                  </td>
                  <td className="max-w-sm truncate px-4 py-3 text-xs text-gray-500 dark:text-gray-400">{f.description}</td>
                  <td className="px-4 py-3">
                    <Badge variant={f.reviewed ? 'success' : 'warning'} dot size="sm">{f.reviewed ? 'Reviewed' : 'Pending'}</Badge>
                  </td>
                  <td className="px-4 py-3">
                    {!f.reviewed && (
                      <Button variant="ghost" size="xs" onClick={() => reviewMutation.mutate(f.id)} loading={reviewMutation.isPending}>Review</Button>
                    )}
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
