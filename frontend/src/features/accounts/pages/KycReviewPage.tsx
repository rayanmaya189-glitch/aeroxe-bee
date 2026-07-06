import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { PageTransition } from '@/components/ui/PageTransition'
import { getKycSubmissions, approveKyc, rejectKyc, type KycSubmission } from '@/services/dashboard'
import { Card, CardContent } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { Input } from '@/components/ui/Input'
import { EmptyState } from '@/components/ui/EmptyState'
import { staggerContainer, fadeInUp, itemVariants } from '@/components/animations/variants'
import { FileCheck, CheckCircle, XCircle, ExternalLink } from 'lucide-react'
import { useToast } from '@/components/ui/Toast'
import type { PaginatedResponse } from '@/types/api'

const statusVariant: Record<string, 'success' | 'warning' | 'danger' | 'info'> = {
  verified: 'success',
  pending: 'warning',
  rejected: 'danger',
  not_submitted: 'info',
}

export function KycReviewPage() {
  const queryClient = useQueryClient()
  const [page, setPage] = useState(1)
  const [statusFilter, setStatusFilter] = useState('pending')
  const { addToast } = useToast()
  const [reviewTarget, setReviewTarget] = useState<KycSubmission | null>(null)
  const [reviewNotes, setReviewNotes] = useState('')
  const [reviewAction, setReviewAction] = useState<'approve' | 'reject'>('approve')

  const { data, isLoading } = useQuery({
    queryKey: ['admin-kyc', page, statusFilter] as const,
    queryFn: () => getKycSubmissions({ page, pageSize: 10, status: statusFilter || undefined }),
  })

  const approveMutation = useMutation({
    mutationFn: ({ id, notes }: { id: string; notes: string }) => approveKyc(id, notes),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin-kyc'] }); closeReview(); addToast('KYC approved', 'success') },
    onError: (err: Error) => { addToast(err.message || 'Failed to approve KYC', 'error') },
  })

  const rejectMutation = useMutation({
    mutationFn: ({ id, notes }: { id: string; notes: string }) => rejectKyc(id, notes),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin-kyc'] }); closeReview(); addToast('KYC rejected', 'success') },
    onError: (err: Error) => { addToast(err.message || 'Failed to reject KYC', 'error') },
  })

  function openReview(action: 'approve' | 'reject', target: KycSubmission) {
    setReviewAction(action)
    setReviewTarget(target)
    setReviewNotes('')
  }

  function closeReview() {
    setReviewTarget(null)
    setReviewNotes('')
  }

  const response = data as PaginatedResponse<KycSubmission> | undefined
  const submissions = response?.data ?? []
  const total = response?.total ?? 0
  const totalPages = response?.total_pages ?? 1

  return (
    <PageTransition>
    <motion.div initial="hidden" animate="visible" variants={staggerContainer} className="space-y-8">
      <motion.div variants={fadeInUp}>
        <div className="relative overflow-hidden rounded-2xl border border-white/[0.06] bg-white/[0.02] p-8">
          <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-violet-600/10 blur-[80px]" />
          <div className="pointer-events-none absolute -left-8 bottom-0 h-32 w-32 rounded-full bg-emerald-600/10 blur-[60px]" />
          <div className="relative flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-emerald-600 shadow-lg shadow-violet-500/25">
              <FileCheck className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-extrabold tracking-tight text-white lg:text-4xl">
                <span className="bg-gradient-to-r from-violet-400 to-emerald-400 bg-clip-text text-transparent">KYC Reviews</span>
              </h1>
              <p className="mt-1 text-sm text-gray-400">Review and approve member identity verification ({total} total)</p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Filters */}
      <motion.div variants={itemVariants} className="flex gap-2">
        {['pending', 'verified', 'rejected', ''].map((s) => (
          <button key={s} onClick={() => { setStatusFilter(s); setPage(1) }}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${statusFilter === s ? 'bg-blue-600 text-white' : 'bg-white/[0.06] text-gray-400 hover:bg-white/[0.1]'}`}>
            {s || 'All'}
          </button>
        ))}
      </motion.div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-24 animate-pulse rounded-xl bg-white/[0.03]" />)}
        </div>
      ) : submissions.length === 0 ? (
        <Card><CardContent className="py-12 text-center"><EmptyState title="No KYC submissions" description="No identity verification requests match your filter." /></CardContent></Card>
      ) : (
        <div className="space-y-3">
          {submissions.map((sub) => (
            <motion.div key={sub.id} variants={itemVariants}>
              <Card hover>
                <CardContent className="py-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 space-y-1.5">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-100">{sub.user_name || sub.user_email}</span>
                        <Badge variant={statusVariant[sub.status] ?? 'info'} size="sm">{sub.status}</Badge>
                      </div>
                      <p className="text-sm text-gray-400">
                        Name: <span className="text-gray-300">{sub.full_name}</span> · {sub.document_type} · {sub.document_number}
                      </p>
                      {sub.document_url && (
                        <a href={sub.document_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300">
                          <ExternalLink className="h-3 w-3" /> View document
                        </a>
                      )}
                      <p className="text-xs text-gray-500">Submitted {new Date(sub.created_at).toLocaleDateString()}</p>
                    </div>
                    {sub.status === 'pending' && (
                      <div className="flex gap-2">
                        <Button variant="danger" size="sm" icon={<XCircle className="h-3.5 w-3.5" />} onClick={() => openReview('reject', sub)}>Reject</Button>
                        <Button size="sm" icon={<CheckCircle className="h-3.5 w-3.5" />} onClick={() => openReview('approve', sub)}>Approve</Button>
                      </div>
                    )}
                  </div>
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
            <Button variant="ghost" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</Button>
            <Button variant="ghost" size="sm" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>Next</Button>
          </div>
        </div>
      )}

      {/* Review Modal */}
      <Modal open={!!reviewTarget} onClose={closeReview} title={`${reviewAction === 'approve' ? 'Approve' : 'Reject'} KYC Submission`}>
        {reviewTarget && (
          <div className="space-y-4">
            <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
              <p className="text-sm"><strong className="text-gray-200">User:</strong> <span className="text-gray-400">{reviewTarget.user_name || reviewTarget.user_email}</span></p>
              <p className="text-sm"><strong className="text-gray-200">Full name:</strong> <span className="text-gray-400">{reviewTarget.full_name}</span></p>
              <p className="text-sm"><strong className="text-gray-200">Document:</strong> <span className="text-gray-400">{reviewTarget.document_type} — {reviewTarget.document_number}</span></p>
            </div>
            <Input label="Notes (optional)" value={reviewNotes} onChange={(e) => setReviewNotes(e.target.value)} placeholder="Optional reason..." />
            <div className="flex justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={closeReview}>Cancel</Button>
              {reviewAction === 'approve' ? (
                <Button size="sm" onClick={() => reviewTarget && approveMutation.mutate({ id: reviewTarget.id, notes: reviewNotes })} loading={approveMutation.isPending}>Approve</Button>
              ) : (
                <Button variant="danger" size="sm" onClick={() => reviewTarget && rejectMutation.mutate({ id: reviewTarget.id, notes: reviewNotes })} loading={rejectMutation.isPending}>Reject</Button>
              )}
            </div>
          </div>
        )}
      </Modal>
    </motion.div>
    </PageTransition>
  )
}
