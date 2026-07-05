import { useState } from 'react'
import { motion } from 'framer-motion'
import { PageTransition } from '@/components/ui/PageTransition'
import { useQuery } from '@tanstack/react-query'
import { getMySubscriptionRequests, type SubscriptionRequest } from '@/services/dashboard'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { staggerContainer, fadeInUp, itemVariants } from '@/components/animations/variants'
import { ArrowUpCircle, Clock, CheckCircle, XCircle, ArrowRight } from 'lucide-react'

const statusConfig: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  pending: { label: 'Pending Review', color: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20', icon: <Clock className="h-3.5 w-3.5" /> },
  approved: { label: 'Approved', color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20', icon: <CheckCircle className="h-3.5 w-3.5" /> },
  rejected: { label: 'Rejected', color: 'text-red-400 bg-red-500/10 border-red-500/20', icon: <XCircle className="h-3.5 w-3.5" /> },
}

export function MemberSubscriptionRequestsPage() {
  const [page, setPage] = useState(1)
  const pageSize = 10

  const { data, isLoading } = useQuery({
    queryKey: ['my-subscription-requests', page],
    queryFn: () => getMySubscriptionRequests({ page, pageSize }),
  })

  const requests = data?.data ?? []
  const totalPages = data?.total_pages ?? 1

  return (
    <PageTransition>
      <motion.div initial="hidden" animate="visible" variants={staggerContainer} className="space-y-8">
        <motion.div variants={fadeInUp}>
          <div className="relative overflow-hidden rounded-2xl border border-white/[0.06] bg-white/[0.02] p-8">
            <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-purple-600/10 blur-[80px]" />
            <div className="pointer-events-none absolute -left-8 bottom-0 h-32 w-32 rounded-full bg-blue-600/10 blur-[60px]" />
            <div className="relative flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-500 to-blue-600 shadow-lg shadow-purple-500/25">
                <ArrowUpCircle className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-extrabold tracking-tight text-white lg:text-4xl">
                  <span className="bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">Subscription Requests</span>
                </h1>
                <p className="mt-1 text-sm text-gray-400">Track your plan upgrade requests and their approval status.</p>
              </div>
            </div>
          </div>
        </motion.div>

        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-24 animate-pulse rounded-2xl bg-white/[0.03]" />
            ))}
          </div>
        ) : requests.length === 0 ? (
          <motion.div variants={itemVariants}>
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16">
                <ArrowUpCircle className="h-12 w-12 text-gray-600 mb-4" />
                <p className="text-gray-400 text-sm">No subscription requests yet.</p>
                <p className="text-gray-500 text-xs mt-1">Use the Upgrade Plan page to request a plan change.</p>
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
                    <Card hover glow="bg-purple-500/10">
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
                        <div className="mt-2 flex items-center gap-3">
                          <div className="rounded-lg bg-white/[0.04] px-3 py-2">
                            <p className="text-xs text-gray-500">Current Plan</p>
                            <p className="text-sm font-semibold text-gray-200">{req.current_plan_name || req.current_plan}</p>
                          </div>
                          <ArrowRight className="h-5 w-5 text-gray-500 shrink-0" />
                          <div className="rounded-lg bg-blue-500/5 border border-blue-500/10 px-3 py-2">
                            <p className="text-xs text-blue-400/70">Requested Plan</p>
                            <p className="text-sm font-semibold text-blue-300">{req.requested_plan_name || req.requested_plan}</p>
                          </div>
                          <div className="ml-auto text-right">
                            <p className="text-xs text-gray-500">Billing Cycle</p>
                            <p className="text-sm font-medium text-gray-200 capitalize">{req.requested_billing_cycle}</p>
                          </div>
                        </div>
                        {req.reason && (
                          <div className="mt-3 rounded-lg bg-white/[0.03] p-3">
                            <p className="text-xs text-gray-500 mb-1">Reason</p>
                            <p className="text-sm text-gray-300">{req.reason}</p>
                          </div>
                        )}
                        {req.review_notes && (
                          <div className="mt-3 rounded-lg bg-white/[0.03] p-3">
                            <p className="text-xs text-gray-500 mb-1">Admin Notes</p>
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
