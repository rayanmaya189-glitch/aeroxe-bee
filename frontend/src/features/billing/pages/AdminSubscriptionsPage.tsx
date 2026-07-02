import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getSubscriptionRequests, approveSubscriptionRequest, rejectSubscriptionRequest, type SubscriptionRequest } from '@/services/dashboard'
import { Card, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Modal } from '@/components/ui/Modal'
import type { PaginatedResponse } from '@/types/api'

export function AdminSubscriptionsPage() {
  const queryClient = useQueryClient()
  const [page, setPage] = useState(1)
  const [statusFilter, setStatusFilter] = useState('')
  const [reviewTarget, setReviewTarget] = useState<SubscriptionRequest | null>(null)
  const [reviewNotes, setReviewNotes] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['admin-subscription-requests', page, statusFilter],
    queryFn: () => getSubscriptionRequests({ page, pageSize: 10, status: statusFilter || undefined }),
  })

  const approveMutation = useMutation({
    mutationFn: ({ id, notes }: { id: string; notes: string }) => approveSubscriptionRequest(id, notes),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-subscription-requests'] })
      setReviewTarget(null)
      setReviewNotes('')
    },
  })

  const rejectMutation = useMutation({
    mutationFn: ({ id, notes }: { id: string; notes: string }) => rejectSubscriptionRequest(id, notes),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-subscription-requests'] })
      setReviewTarget(null)
      setReviewNotes('')
    },
  })

  const response = data as PaginatedResponse<SubscriptionRequest> | undefined
  const requests = response?.data || []
  const totalPages = response?.total_pages || 1
  const total = response?.total || 0

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Subscription Requests</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Review and approve member upgrade/recharge requests ({total} total)</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        {['', 'pending', 'approved', 'rejected'].map((s) => (
          <button
            key={s}
            onClick={() => { setStatusFilter(s); setPage(1) }}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
              statusFilter === s
                ? 'bg-primary-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400'
            }`}
          >
            {s || 'All'}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-20 animate-pulse rounded-xl bg-gray-100 dark:bg-gray-800" />
          ))}
        </div>
      ) : requests.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-gray-400">No subscription requests found</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {requests.map((req) => (
            <Card key={req.id}>
              <CardContent className="flex items-center justify-between py-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-900 dark:text-gray-100">{req.account_name || req.account_id}</span>
                    <Badge variant={req.status === 'approved' ? 'success' : req.status === 'rejected' ? 'danger' : 'warning'}>
                      {req.status}
                    </Badge>
                  </div>
                  <p className="mt-1 text-sm text-gray-500">
                    Upgrade: <span className="font-medium">{req.current_plan_name || req.current_plan}</span> → <span className="font-medium text-primary-600">{req.requested_plan_name || req.requested_plan}</span>
                    {' '}({req.requested_billing_cycle})
                  </p>
                  {req.reason && <p className="mt-1 text-xs text-gray-400">Reason: {req.reason}</p>}
                  {req.reviewed_by_name && <p className="mt-1 text-xs text-gray-400">Reviewed by: {req.reviewed_by_name}</p>}
                </div>
                {req.status === 'pending' && (
                  <div className="flex gap-2">
                    <Button variant="danger" size="sm" onClick={() => { setReviewTarget(req); setReviewNotes('') }}>Reject</Button>
                    <Button variant="primary" size="sm" onClick={() => { setReviewTarget(req); setReviewNotes('') }}>Approve</Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-500">Page {page} of {totalPages}</span>
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</Button>
            <Button variant="secondary" size="sm" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>Next</Button>
          </div>
        </div>
      )}

      {/* Review Modal */}
      <Modal open={!!reviewTarget} onClose={() => setReviewTarget(null)} title="Review Subscription Request">
        {reviewTarget && (
          <div className="space-y-4">
            <div className="rounded-lg bg-gray-50 p-4 dark:bg-gray-800">
              <p className="text-sm"><strong>Account:</strong> {reviewTarget.account_name}</p>
              <p className="text-sm"><strong>Current Plan:</strong> {reviewTarget.current_plan_name || reviewTarget.current_plan}</p>
              <p className="text-sm"><strong>Requested Plan:</strong> {reviewTarget.requested_plan_name || reviewTarget.requested_plan}</p>
              <p className="text-sm"><strong>Billing Cycle:</strong> {reviewTarget.requested_billing_cycle}</p>
              {reviewTarget.reason && <p className="text-sm"><strong>Reason:</strong> {reviewTarget.reason}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Notes (optional)</label>
              <textarea
                value={reviewNotes}
                onChange={(e) => setReviewNotes(e.target.value)}
                rows={3}
                className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setReviewTarget(null)}>Cancel</Button>
              <Button
                variant="danger"
                loading={rejectMutation.isPending}
                onClick={() => rejectMutation.mutate({ id: reviewTarget.id, notes: reviewNotes })}
              >Reject</Button>
              <Button
                loading={approveMutation.isPending}
                onClick={() => approveMutation.mutate({ id: reviewTarget.id, notes: reviewNotes })}
              >Approve</Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
