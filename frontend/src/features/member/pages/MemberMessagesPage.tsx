import { useState, useEffect, useCallback } from 'react'
import api from '@/services/api'
import type { ApiResponse, PaginatedResponse } from '@/types/api'

interface Message {
  id: string
  recipient: string
  body: string
  status: string
  delivery_status: string
  message_type: string
  confidence: number
  device_id: string
  sim_slot: number
  created_at: string
  delivered_at: string | null
}

export function MemberMessagesPage() {
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  const [statusFilter, setStatusFilter] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const pageSize = 20

  const fetchMessages = useCallback(async () => {
    setLoading(true)
    try {
      const params: Record<string, string | number> = { page, pageSize }
      if (statusFilter) params.status = statusFilter
      if (typeFilter) params.type = typeFilter
      const res = await api.get<ApiResponse<PaginatedResponse<Message>>>('/member/messages', { params })
      if (res.data.success && res.data.data) {
        setMessages(res.data.data.data)
        setTotal(res.data.data.total)
        setTotalPages(res.data.data.total_pages)
      }
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [page, statusFilter, typeFilter])

  useEffect(() => { fetchMessages() }, [fetchMessages])

  const statusColor = (status: string) => {
    const s = status?.toLowerCase() ?? ''
    if (s.includes('deliver') || s.includes('accepted')) return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
    if (s.includes('fail')) return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
    if (s.includes('pending') || s.includes('queued')) return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
    return 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
  }

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">My Messages</h1>
        <p className="text-sm text-gray-600 dark:text-gray-400">{total.toLocaleString()} total messages</p>
      </div>

      {/* Filters */}
      <div className="flex gap-3">
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1) }}
          className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white"
        >
          <option value="">All Statuses</option>
          <option value="CARRIER_ACCEPTED">Carrier Accepted</option>
          <option value="PROBABLE_DELIVERED">Delivered</option>
          <option value="FAILED">Failed</option>
          <option value="SENT">Sent</option>
        </select>
        <select
          value={typeFilter}
          onChange={(e) => { setTypeFilter(e.target.value); setPage(1) }}
          className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white"
        >
          <option value="">All Types</option>
          <option value="otp">OTP</option>
          <option value="transactional">Transactional</option>
          <option value="marketing">Marketing</option>
        </select>
      </div>

      {loading ? (
        <div className="flex items-center justify-center p-12"><div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-600 border-t-transparent" /></div>
      ) : error ? (
        <div className="rounded-lg bg-red-50 p-4 text-red-600 dark:bg-red-900/20 dark:text-red-400">{error}</div>
      ) : messages.length === 0 ? (
        <div className="rounded-2xl border border-gray-200 p-12 text-center dark:border-gray-700">
          <p className="text-gray-500 dark:text-gray-400">No messages found.</p>
        </div>
      ) : (
        <>
          <div className="overflow-hidden rounded-2xl border border-gray-200 dark:border-gray-700">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-800">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Recipient</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Message</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Type</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Confidence</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Created</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white dark:divide-gray-700 dark:bg-gray-900">
                {messages.map((msg) => (
                  <tr key={msg.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                    <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">{msg.recipient}</td>
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400 max-w-[200px] truncate">{msg.body}</td>
                    <td className="px-4 py-3 text-sm capitalize text-gray-600 dark:text-gray-400">{msg.message_type}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${statusColor(msg.delivery_status)}`}>
                        {msg.delivery_status?.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">{(msg.confidence * 100).toFixed(0)}%</td>
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">{new Date(msg.created_at).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Showing {total === 0 ? 0 : (page - 1) * pageSize + 1}–{Math.min(page * pageSize, total)} of {total.toLocaleString()}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm disabled:opacity-50 dark:border-gray-600 dark:text-white"
              >Previous</button>
              <span className="flex items-center px-3 text-sm text-gray-600 dark:text-gray-400">Page {page} of {totalPages}</span>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm disabled:opacity-50 dark:border-gray-600 dark:text-white"
              >Next</button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
