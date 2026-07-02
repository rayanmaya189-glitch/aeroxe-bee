import { useState, useEffect, useCallback } from 'react'
import { getAccounts, suspendAccount, activateAccount, deleteAccount } from '@/services/dashboard'
import type { Account } from '@/types/models'

export function AccountsPage() {
  const [accounts, setAccounts] = useState<Account[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pageSize] = useState(20)
  const [totalPages, setTotalPages] = useState(1)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    try {
      setLoading(true)
      const result = await getAccounts({ page, pageSize, search, status: statusFilter })
      setAccounts(result.data)
      setTotal(result.total)
      setTotalPages(result.total_pages)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load accounts')
    } finally {
      setLoading(false)
    }
  }, [page, pageSize, search, statusFilter])

  useEffect(() => { load() }, [load])

  async function handleSuspend(id: string) {
    if (!confirm('Suspend this account?')) return
    try { await suspendAccount(id); load() } catch { setError('Failed to suspend') }
  }

  async function handleActivate(id: string) {
    try { await activateAccount(id); load() } catch { setError('Failed to activate') }
  }

  async function handleDelete(id: string) {
    if (!confirm('Permanently delete this account?')) return
    try { await deleteAccount(id); load() } catch { setError('Failed to delete') }
  }

  return (
    <div className="space-y-6 p-6">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Accounts (Members)</h1>

      <div className="flex flex-wrap gap-3">
        <input type="text" placeholder="Search accounts..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1) }}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white" />
        <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1) }}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white">
          <option value="">All Statuses</option>
          <option value="active">Active</option>
          <option value="suspended">Suspended</option>
          <option value="disabled">Disabled</option>
        </select>
      </div>

      {error && <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600 dark:bg-red-900/20">{error}</div>}

      <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50 text-xs uppercase text-gray-500 dark:bg-gray-800 dark:text-gray-400">
            <tr>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Plan</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Verified</th>
              <th className="px-4 py-3">Risk Score</th>
              <th className="px-4 py-3">Created</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {loading ? (
              <tr><td colSpan={8} className="px-4 py-8 text-center text-gray-500">Loading...</td></tr>
            ) : accounts.length === 0 ? (
              <tr><td colSpan={8} className="px-4 py-8 text-center text-gray-500">No accounts found</td></tr>
            ) : accounts.map((a) => (
              <tr key={a.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{a.name}</td>
                <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{a.email}</td>
                <td className="px-4 py-3"><span className="rounded-full bg-blue-100 px-2 py-1 text-xs font-medium text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">{a.plan_id}</span></td>
                <td className="px-4 py-3"><span className={`rounded-full px-2 py-1 text-xs font-medium ${a.status === 'active' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'}`}>{a.status}</span></td>
                <td className="px-4 py-3">{a.verified ? '✓' : '—'}</td>
                <td className="px-4 py-3">{a.risk_score.toFixed(2)}</td>
                <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{new Date(a.created_at).toLocaleDateString()}</td>
                <td className="px-4 py-3">
                  <div className="flex gap-1">
                    {a.status === 'active' ? (
                      <button onClick={() => handleSuspend(a.id)} className="rounded p-1 text-yellow-600 hover:bg-yellow-50 dark:text-yellow-400">Suspend</button>
                    ) : (
                      <button onClick={() => handleActivate(a.id)} className="rounded p-1 text-green-600 hover:bg-green-50 dark:text-green-400">Activate</button>
                    )}
                    <button onClick={() => handleDelete(a.id)} className="rounded p-1 text-red-600 hover:bg-red-50 dark:text-red-400">Delete</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-600 dark:text-gray-400">Showing {accounts.length} of {total} accounts</p>
        <div className="flex gap-1">
          <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
            className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm disabled:opacity-50 dark:border-gray-600">Prev</button>
          <span className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm dark:border-gray-600">{page} / {totalPages}</span>
          <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}
            className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm disabled:opacity-50 dark:border-gray-600">Next</button>
        </div>
      </div>
    </div>
  )
}
