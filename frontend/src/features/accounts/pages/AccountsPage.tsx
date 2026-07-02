import { useState, useEffect, useCallback } from 'react'
import { getAccounts, suspendAccount, activateAccount, deleteAccount } from '@/services/dashboard'
import type { Account } from '@/types/models'
import { DataTable, type Column } from '@/components/ui/DataTable'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Input } from '@/components/ui/Input'
import { useDebounce } from '@/hooks/useDebounce'

const statusVariant: Record<string, 'success' | 'warning' | 'danger'> = {
  active: 'success',
  suspended: 'warning',
  disabled: 'danger',
}

const planVariant: Record<string, 'primary' | 'info' | 'success' | 'warning'> = {
  free: 'warning',
  pro: 'primary',
  scale: 'info',
  enterprise: 'success',
}

export function AccountsPage() {
  const [accounts, setAccounts] = useState<Account[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pageSize] = useState(20)
  const [, setTotalPages] = useState(1)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [loading, setLoading] = useState(true)
  const [sortBy, setSortBy] = useState('created_at')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const debouncedSearch = useDebounce(search, 300)

  const [error, setError] = useState('')

  const load = useCallback(async () => {
    try {
      setLoading(true)
      setError('')
      const result = await getAccounts({ page, pageSize, search: debouncedSearch, status: statusFilter })
      setAccounts(result.data)
      setTotal(result.total)
      setTotalPages(result.total_pages)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load accounts')
    } finally {
      setLoading(false)
    }
  }, [page, pageSize, debouncedSearch, statusFilter])

  useEffect(() => { load() }, [load])

  async function handleSuspend(id: string) {
    try { await suspendAccount(id); load() } catch (err: unknown) { setError(err instanceof Error ? err.message : 'Failed to suspend account') }
  }

  async function handleActivate(id: string) {
    try { await activateAccount(id); load() } catch (err: unknown) { setError(err instanceof Error ? err.message : 'Failed to activate account') }
  }

  async function handleDelete(id: string) {
    try { await deleteAccount(id); load() } catch (err: unknown) { setError(err instanceof Error ? err.message : 'Failed to delete account') }
  }

  const columns: Column<Account>[] = [
    { key: 'name', header: 'Name', sortable: true, className: 'font-medium text-gray-900 dark:text-gray-100' },
    { key: 'email', header: 'Email' },
    {
      key: 'plan_id',
      header: 'Plan',
      render: (row) => <Badge variant={planVariant[row.plan_id] || 'default'} size="sm">{row.plan_id}</Badge>,
    },
    {
      key: 'status',
      header: 'Status',
      render: (row) => <Badge variant={statusVariant[row.status] || 'default'} dot size="sm">{row.status}</Badge>,
    },
    {
      key: 'verified',
      header: 'Verified',
      render: (row) => row.verified ? <Badge variant="success" size="sm">Yes</Badge> : <span className="text-gray-400">—</span>,
    },
    { key: 'risk_score', header: 'Risk', render: (row) => <span className={row.risk_score > 0.7 ? 'text-danger-600 font-medium' : ''}>{row.risk_score.toFixed(2)}</span> },
    { key: 'created_at', header: 'Created', render: (row) => new Date(row.created_at).toLocaleDateString() },
    {
      key: 'actions',
      header: '',
      className: 'w-32',
      render: (row) => (
        <div className="flex gap-1">
          {row.status === 'active' ? (
            <Button variant="ghost" size="xs" onClick={() => handleSuspend(row.id)}>Suspend</Button>
          ) : (
            <Button variant="ghost" size="xs" onClick={() => handleActivate(row.id)}>Activate</Button>
          )}
          <Button variant="ghost" size="xs" className="text-danger-600" onClick={() => handleDelete(row.id)}>Delete</Button>
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-100">Accounts</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Manage member accounts on your platform
        </p>
      </div>

      {error && (
        <div className="rounded-lg border border-danger-200 bg-danger-50 p-3 text-sm text-danger-700 dark:border-danger-800/50 dark:bg-danger-900/20 dark:text-danger-300">
          {error}
          <button onClick={() => setError('')} className="ml-2 font-medium underline">Dismiss</button>
        </div>
      )}

      <div className="flex items-center gap-3">
        <Input
          placeholder="Search accounts..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1) }}
          className="max-w-xs"
          icon={<svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" /></svg>}
        />
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1) }}
          className="rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-700 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300"
        >
          <option value="">All statuses</option>
          <option value="active">Active</option>
          <option value="suspended">Suspended</option>
          <option value="disabled">Disabled</option>
        </select>
      </div>

      <DataTable
        data={accounts}
        columns={columns}
        loading={loading}
        totalItems={total}
        page={page}
        pageSize={pageSize}
        onPageChange={setPage}
        sortBy={sortBy}
        sortOrder={sortOrder}
        onSort={(key) => {
          if (key === sortBy) setSortOrder((o) => o === 'asc' ? 'desc' : 'asc')
          else { setSortBy(key); setSortOrder('asc') }
        }}
        emptyTitle="No accounts found"
        emptyDescription="No member accounts match your filters."
      />
    </div>
  )
}
