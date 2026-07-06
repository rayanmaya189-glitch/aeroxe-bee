import { useState } from 'react'
import { motion } from 'framer-motion'
import { PageTransition } from '@/components/ui/PageTransition'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getSubscriptionRequests, approveSubscriptionRequest, rejectSubscriptionRequest, type SubscriptionRequest } from '@/services/dashboard'
import { Card, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Modal } from '@/components/ui/Modal'
import type { PaginatedResponse } from '@/types/api'
import { staggerContainer, fadeInUp, itemVariants } from '@/components/animations/variants'
import { Crown, ArrowRight } from 'lucide-react'
import { useToast } from '@/components/ui/Toast'

export function AdminSubscriptionsPage() {
  const queryClient = useQueryClient()
  const [page, setPage] = useState(1)
  const [statusFilter, setStatusFilter] = useState('')
  const { addToast } = useToast()
  const [reviewTarget, setReviewTarget] = useState<SubscriptionRequest | null>(null)
  const [reviewNotes, setReviewNotes] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['admin-subscription-requests', page, statusFilter],
    queryFn: () => getSubscriptionRequests({ page, pageSize: 10, status: statusFilter || undefined }),
  })

  const approveMutation = useMutation({
    mutationFn: ({ id, notes }: { id: string; notes: string }) => approveSubscriptionRequest(id, notes),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin-subscription-requests'] }); setReviewTarget(null); setReviewNotes(''); addToast('Request approved', 'success') },
    onError: (err: Error) => { addToast(err.message || 'Failed to approve request', 'error') },
  })
  const rejectMutation = useMutation({
    mutationFn: ({ id, notes }: { id: string; notes: string }) => rejectSubscriptionRequest(id, notes),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin-subscription-requests'] }); setReviewTarget(null); setReviewNotes(''); addToast('Request rejected', 'success') },
    onError: (err: Error) => { addToast(err.message || 'Failed to reject request', 'error') },
  })

  const response = data as PaginatedResponse<SubscriptionRequest> | undefined
  const requests = response?.data || []
  const totalPages = response?.total_pages || 1
  const total = response?.total || 0

  return (
    <PageTransition>
    <motion.div initial="hidden" animate="visible" variants={staggerContainer} className="space-y-8">
      {/* Hero header */}
      <motion.div variants={fadeInUp}>
        <div className="relative overflow-hidden rounded-2xl border border-white/[0.06] bg-white/[0.02] p-8">
          <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-yellow-600/10 blur-[80px]" />
          <div className="pointer-events-none absolute -left-8 bottom-0 h-32 w-32 rounded-full bg-orange-600/10 blur-[60px]" />
          <div className="relative flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-yellow-500 to-orange-600 shadow-lg shadow-yellow-500/25">
              <Crown className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-extrabold tracking-tight text-white lg:text-4xl">
                <span className="bg-gradient-to-r from-yellow-400 to-orange-400 bg-clip-text text-transparent">Subscription Requests</span>
              </h1>
              <p className="mt-1 text-sm text-gray-400">Review and approve member upgrade/recharge requests ({total} total)</p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Filter tabs */}
      <motion.div variants={itemVariants} className="flex gap-1 rounded-xl border border-white/[0.06] bg-white/[0.03] p-1 w-fit">
        {['', 'pending', 'approved', 'rejected'].map((s) => (
          <button key={s} onClick={() => { setStatusFilter(s); setPage(1) }}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition-all duration-200 ${statusFilter === s ? 'bg-gradient-to-r from-white/[0.08] to-white/[0.05] text-gray-100 shadow-sm ring-1 ring-white/[0.06]' : 'text-gray-400 hover:text-gray-200 hover:bg-white/[0.04]'}`}>
            {s || 'All'}
          </button>
        ))}
      </motion.div>

      {isLoading ? (
        <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-24 animate-pulse rounded-2xl bg-white/[0.03]" />)}</div>
      ) : requests.length === 0 ? (
        <Card><CardContent className="py-12 text-center"><p className="text-gray-500">No subscription requests found</p></CardContent></Card>
      ) : (
        <div className="space-y-3">
          {requests.map((req) => (
            <motion.div key={req.id} variants={itemVariants}>
              <Card hover glow={
                req.status === 'approved' ? 'bg-emerald-500/15' :
                req.status === 'rejected' ? 'bg-red-500/15' : 'bg-amber-500/15'
              }>
                <CardContent className="flex items-center justify-between py-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-100">{req.account_name || req.account_id}</span>
                      <Badge variant={req.status === 'approved' ? 'success' : req.status === 'rejected' ? 'danger' : 'warning'}>{req.status}</Badge>
                    </div>
                    <p className="mt-1 text-sm text-gray-400">
                      Upgrade: <span className="font-medium">{req.current_plan_name || req.current_plan}</span>
                      <ArrowRight className="mx-1.5 inline h-3 w-3 text-gray-500" />
                      <span className="font-medium text-blue-400">{req.requested_plan_name || req.requested_plan}</span> ({req.requested_billing_cycle})
                    </p>
                    {req.reason && <p className="mt-1 text-xs text-gray-500">Reason: {req.reason}</p>}
                    {req.reviewed_by_name && <p className="mt-1 text-xs text-gray-500">Reviewed by: {req.reviewed_by_name}</p>}
                  </div>
                  {req.status === 'pending' && (
                    <div className="flex gap-2">
                      <Button variant="danger" size="sm" onClick={() => { setReviewTarget(req); setReviewNotes('') }}>Reject</Button>
                      <Button size="sm" onClick={() => { setReviewTarget(req); setReviewNotes('') }}>Approve</Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-500">Page {page} of {totalPages}</span>
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</Button>
            <Button variant="secondary" size="sm" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>Next</Button>
          </div>
        </div>
      )}

      <Modal open={!!reviewTarget} onClose={() => setReviewTarget(null)} title="Review Subscription Request">
        {reviewTarget && (
          <div className="space-y-4">
            <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] p-4 space-y-2">
              <p className="text-sm"><strong className="text-gray-200">Account:</strong> <span className="text-gray-400">{reviewTarget.account_name}</span></p>
              <p className="text-sm"><strong className="text-gray-200">Current Plan:</strong> <span className="text-gray-400">{reviewTarget.current_plan_name || reviewTarget.current_plan}</span></p>
              <p className="text-sm"><strong className="text-gray-200">Requested Plan:</strong> <span className="text-gray-400">{reviewTarget.requested_plan_name || reviewTarget.requested_plan}</span></p>
              <p className="text-sm"><strong className="text-gray-200">Billing Cycle:</strong> <span className="text-gray-400">{reviewTarget.requested_billing_cycle}</span></p>
              {reviewTarget.reason && <p className="text-sm"><strong className="text-gray-200">Reason:</strong> <span className="text-gray-400">{reviewTarget.reason}</span></p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300">Notes (optional)</label>
              <textarea value={reviewNotes} onChange={(e) => setReviewNotes(e.target.value)} rows={3}
                className="mt-1 block w-full rounded-xl border border-white/[0.08] bg-white/[0.05] px-3 py-2 text-sm text-gray-100 focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-500/10" />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setReviewTarget(null)}>Cancel</Button>
              <Button variant="danger" loading={rejectMutation.isPending} onClick={() => rejectMutation.mutate({ id: reviewTarget.id, notes: reviewNotes })}>Reject</Button>
              <Button loading={approveMutation.isPending} onClick={() => approveMutation.mutate({ id: reviewTarget.id, notes: reviewNotes })}>Approve</Button>
            </div>
          </div>
        )}
      </Modal>
    </motion.div>
    </PageTransition>
  )
}
