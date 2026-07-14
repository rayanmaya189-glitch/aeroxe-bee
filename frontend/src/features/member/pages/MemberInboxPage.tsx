import { useState } from 'react'
import { motion } from 'framer-motion'
import { PageTransition } from '@/components/ui/PageTransition'
import { useQuery } from '@tanstack/react-query'
import api from '@/services/api'
import type { ApiResponse, PaginatedResponse } from '@/types/api'
import { DataTable, type Column } from '@/components/ui/DataTable'
import { staggerContainer, fadeInUp } from '@/components/animations/variants'
import { Inbox } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

interface InboundMessage {
  id: string
  device_id: string
  sender: string
  recipient: string
  body: string
  sim_slot: number
  received_at: string
}

export function MemberInboxPage() {
  const [page, setPage] = useState(1)
  const [pageSize] = useState(20)

  const { data, isLoading } = useQuery({
    queryKey: ['member-inbound', page, pageSize],
    queryFn: async () => {
      const res = await api.get<ApiResponse<PaginatedResponse<InboundMessage>>>('/member/inbound', {
        params: { page, pageSize },
      })
      return res.data.data!
    },
  })

  const messages = data?.data ?? []
  const total = data?.total ?? 0

  const columns: Column<InboundMessage>[] = [
    { key: 'sender', header: 'From', className: 'font-medium text-gray-100' },
    { key: 'body', header: 'Message', render: (m) => <span className="text-gray-300">{m.body}</span> },
    { key: 'device_id', header: 'Device', className: 'text-gray-400' },
    {
      key: 'received_at',
      header: 'Received',
      render: (m) => (
        <span className="text-gray-400">
          {m.received_at ? formatDistanceToNow(new Date(m.received_at), { addSuffix: true }) : '—'}
        </span>
      ),
    },
  ]

  return (
    <PageTransition>
      <motion.div variants={staggerContainer} initial="hidden" animate="show" className="space-y-6">
        <motion.div variants={fadeInUp} className="flex items-center gap-3">
          <Inbox className="h-6 w-6 text-blue-400" />
          <div>
            <h1 className="text-2xl font-semibold text-gray-100">Inbox</h1>
            <p className="text-sm text-gray-400">SMS received by your device nodes</p>
          </div>
        </motion.div>

        <motion.div variants={fadeInUp}>
          <DataTable
            columns={columns}
            data={messages}
            loading={isLoading}
            totalItems={total}
            page={page}
            pageSize={pageSize}
            onPageChange={setPage}
            getRowId={(m) => m.id}
            emptyTitle="No inbound messages yet"
          />
        </motion.div>
      </motion.div>
    </PageTransition>
  )
}
