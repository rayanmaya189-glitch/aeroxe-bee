import { useState } from 'react'
import { motion } from 'framer-motion'
import { PageTransition } from '@/components/ui/PageTransition'
import { useQuery } from '@tanstack/react-query'
import { getMyPaymentRequests, type PaymentRequest } from '@/services/dashboard'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { staggerContainer, fadeInUp, itemVariants } from '@/components/animations/variants'
import { CreditCard, Clock, CheckCircle, XCircle, ExternalLink } from 'lucide-react'

const statusConfig: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  pending: { label: 'Pending Review', color: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20', icon: <Clock className="h-3.5 w-3.5" /> },
  approved: { label: 'Approved', color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20', icon: <CheckCircle className="h-3.5 w-3.5" /> },
  rejected: { label: 'Rejected', color: 'text-red-400 bg-red-500/10 border-red-500/20', icon: <XCircle className="h-3.5 w-3.5" /> },
}

export function MemberPaymentRequestsPage() {
  const queryClient = useQueryClient()
  const [page, setPage] = useState(1)
  const pageSize = 10

  const { data, isLoading } = useQuery({
    queryKey: ['my-payment-requests', page],
    queryFn: () => getMyPaymentRequests({ page, pageSize }),
  })

  const requests = data?.data ?? []
  const totalPages = data?.total_pages ?? 1

  return (
    <PageTransition>
      <motion.div initial="hidden" animate="visible" variants={staggerContainer} className="space-y-8">
        <motion.div variants={fadeInUp}>
          <div className="relative overflow-hidden rounded-2xl border border-white/[0.06] bg-white/[0.02] p-8">
            <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-blue-600/10 blur-[80px]" />
            <div className="relative flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 shadow-lg shadow-blue-500/25">
                <CreditCard className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-extrabold tracking-tight text-white lg:text-4xl">
                  <span className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">Payment Requests</span>
                </h1>
                <p className="mt-1 text-sm text-gray-400">Track your payment submissions and their approval status.</p>
              </div>
            </div>
          </div>
        </motion.div>

        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-20 animate-pulse rounded-2xl bg-white/[0.03]" />
            ))}
          </div>
        ) : requests.length === 0 ? (
          <motion.div variants={itemVariants}>
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16">
                <CreditCard className="h-12 w-12 text-gray-600 mb-4" />
                <p className="text-gray-400 text-sm">No payment requests yet.</p>
                <p className="text-gray-500 text-xs mt-1">Payment requests are created when you upgrade your plan.</p>
              </CardContent>
            </Card>
          </motion.div>
        ) : (
          <>
            <div className="space-y-3">
              {requests.map((req) => {
                const status = statusConfig[req.status] ?? statusConfig.pending
                return (
                  <motion.div key={req.id} variants={itemVariants}>
                    <Card hover glow="bg-blue-500/10">
                      <CardHeader>
                        <div className="flex items-center gap-3">
                          <div className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${status.color}`}>
                            {status.icon}
                            {status.label}
                          </div>
                          <span className="text-xs text-gray-500">
                            {new Date(req.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                          </span>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="mt-2 grid grid-cols-2 gap-4 sm:grid-cols-4">
                          <div>
                            <p className="text-xs text-gray-500">Plan</p>
                            <p className="text-sm font-medium text-gray-200">{req.plan_name || req.plan_id}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500">Billing Cycle</p>
                            <p className="text-sm font-medium text-gray-200 capitalize">{req.billing_cycle}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500">Amount</p>
                            <p className="text-sm font-medium text-gray-200">${req.amount?.toFixed(2) ?? '—'}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500">Payment Method</p>
                            <p className="text-sm font-medium text-gray-200 capitalize">{req.payment_method?.replace(/_/g, ' ')}</p>
                          </div>
                        </div>
                        {req.proof_url && (
                          <div className="mt-3">
                            <a
                              href={req.proof_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 transition-colors"
                            >
                              View Payment Proof <ExternalLink className="h-3 w-3" />
                            </a>
                          </div>
                        )}
                        {req.review_notes && (
                          <div className="mt-3 rounded-lg bg-white/[0.03] p-3">
                            <p className="text-xs text-gray-500 mb-1">Review Notes</p>
                            <p className="text-sm text-gray-300">{req.review_notes}</p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </motion.div>
                )
              })}
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2">
                <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</Button>
                <span className="text-sm text-gray-400">Page {page} of {totalPages}</span>
                <Button variant="secondary" size="sm" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>Next</Button>
              </div>
            )}
          </>
        )}
      </motion.div>
    </PageTransition>
  )
}
