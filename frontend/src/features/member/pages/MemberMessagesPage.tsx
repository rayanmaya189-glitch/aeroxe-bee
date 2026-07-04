import { useState } from 'react'
import { motion } from 'framer-motion'
import { PageTransition } from '@/components/ui/PageTransition'
import { useQuery } from '@tanstack/react-query'
import api from '@/services/api'
import type { ApiResponse, PaginatedResponse } from '@/types/api'
import type { Message } from '@/types/models'
import { DataTable, type Column } from '@/components/ui/DataTable'
import { Badge } from '@/components/ui/Badge'
import { Input } from '@/components/ui/Input'
import { PageSkeleton } from '@/components/ui/Skeleton'
import { useDebounce } from '@/hooks/useDebounce'
import { staggerContainer, fadeInUp, itemVariants } from '@/components/animations/variants'
import { Search, MessageSquare } from 'lucide-react'

const deliveryVariant: Record<string, 'success' | 'warning' | 'danger' | 'info'> = {
  PROBABLE_DELIVERED: 'success', CARRIER_ACCEPTED: 'info', SENT: 'warning', FAILED: 'danger',
}

export function MemberMessagesPage() {
  const [page, setPage] = useState(1)
  const [pageSize] = useState(20)
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebounce(search, 300)

  const { data, isLoading } = useQuery({
    queryKey: ['member-messages', page, pageSize, debouncedSearch],
    queryFn: async () => {
      const res = await api.get<ApiResponse<PaginatedResponse<Message>>>('/member/messages', {
        params: { limit: pageSize, offset: (page - 1) * pageSize, search: debouncedSearch },
      })
      return res.data.data!
    },
  })

  const messages = data?.data ?? []
  const total = data?.total ?? 0

  const columns: Column<Message>[] = [
    { key: 'recipient', header: 'Recipient', className: 'font-medium text-gray-100' },
    { key: 'sender', header: 'Sender' },
    { key: 'message_type', header: 'Type', render: (row) => <Badge variant="default" size="sm">{row.message_type}</Badge> },
    { key: 'delivery_status', header: 'Status', render: (row) => <Badge variant={deliveryVariant[row.delivery_status] || 'default'} dot size="sm">{row.delivery_status.replace(/_/g, ' ').toLowerCase()}</Badge> },
    { key: 'confidence_score', header: 'Confidence', render: (row) => <span className="font-medium">{(row.confidence_score * 100).toFixed(0)}%</span> },
    { key: 'created_at', header: 'Sent', render: (row) => new Date(row.created_at).toLocaleDateString() },
  ]

  if (isLoading) return <PageTransition><PageSkeleton /></PageTransition>

  return (
    <PageTransition>
    <motion.div initial="hidden" animate="visible" variants={staggerContainer} className="space-y-8">
      <motion.div variants={fadeInUp}>
        <div className="relative overflow-hidden rounded-2xl border border-white/[0.06] bg-white/[0.02] p-8">
          <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-cyan-600/10 blur-[80px]" />
          <div className="pointer-events-none absolute -left-8 bottom-0 h-32 w-32 rounded-full bg-blue-600/10 blur-[60px]" />
          <div className="relative flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 shadow-lg shadow-cyan-500/25">
              <MessageSquare className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-extrabold tracking-tight text-white lg:text-4xl">
                <span className="bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">Messages</span>
              </h1>
              <p className="mt-1 text-sm text-gray-400">View your message delivery history</p>
            </div>
          </div>
        </div>
      </motion.div>

      <motion.div variants={itemVariants}>
        <Input
          placeholder="Search by recipient or sender..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1) }}
          className="max-w-sm"
          icon={<Search className="h-4 w-4" />}
        />
      </motion.div>

      <motion.div variants={itemVariants}>
        <DataTable
          data={messages}
          columns={columns}
          loading={isLoading}
          totalItems={total}
          page={page}
          pageSize={pageSize}
          onPageChange={setPage}
          emptyTitle="No messages found"
          emptyDescription="Messages you send will appear here."
        />
      </motion.div>
    </motion.div>
    </PageTransition>
  )
}
