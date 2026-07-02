import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import api from '@/services/api'
import type { ApiResponse, PaginatedResponse } from '@/types/api'
import type { Message } from '@/types/models'
import { DataTable, type Column } from '@/components/ui/DataTable'
import { Badge } from '@/components/ui/Badge'
import { Input } from '@/components/ui/Input'
import { PageSkeleton } from '@/components/ui/Skeleton'
import { useDebounce } from '@/hooks/useDebounce'

const deliveryVariant: Record<string, 'success' | 'warning' | 'danger' | 'info'> = {
  PROBABLE_DELIVERED: 'success',
  CARRIER_ACCEPTED: 'info',
  SENT: 'warning',
  FAILED: 'danger',
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
    { key: 'recipient', header: 'Recipient', className: 'font-medium text-gray-900 dark:text-gray-100' },
    { key: 'sender', header: 'Sender' },
    { key: 'message_type', header: 'Type', render: (row) => <Badge variant="default" size="sm">{row.message_type}</Badge> },
    { key: 'delivery_status', header: 'Status', render: (row) => <Badge variant={deliveryVariant[row.delivery_status] || 'default'} dot size="sm">{row.delivery_status.replace(/_/g, ' ').toLowerCase()}</Badge> },
    { key: 'confidence_score', header: 'Confidence', render: (row) => <span className="font-medium">{(row.confidence_score * 100).toFixed(0)}%</span> },
    { key: 'created_at', header: 'Sent', render: (row) => new Date(row.created_at).toLocaleDateString() },
  ]

  if (isLoading) return <PageSkeleton />

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-100">Messages</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">View your message delivery history</p>
      </div>

      <Input
        placeholder="Search by recipient or sender..."
        value={search}
        onChange={(e) => { setSearch(e.target.value); setPage(1) }}
        className="max-w-sm"
        icon={<svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" /></svg>}
      />

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
    </div>
  )
}
