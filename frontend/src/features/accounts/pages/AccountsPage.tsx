import { useState, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import { PageTransition } from '@/components/ui/PageTransition'
import { getAccounts, suspendAccount, activateAccount, deleteAccount } from '@/services/dashboard'
import type { Account } from '@/types/models'
import { DataTable, type Column } from '@/components/ui/DataTable'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Input } from '@/components/ui/Input'
import { useDebounce } from '@/hooks/useDebounce'
import { staggerContainer, fadeInUp, itemVariants } from '@/components/animations/variants'
import { Search, Users } from 'lucide-react'

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
    { key: 'name', header: 'Name', sortable: true, className: 'font-medium text-gray-100' },
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
      render: (row) => row.verified ? <Badge variant="success" size="sm">Yes</Badge> : <span className="text-gray-500">—</span>,
    },
    { key: 'risk_score', header: 'Risk', render: (row) => <span className={row.risk_score > 0.7 ? 'text-red-400 font-medium' : ''}>{row.risk_score.toFixed(2)}</span> },
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
          <Button variant="ghost" size="xs" className="text-red-400" onClick={() => handleDelete(row.id)}>Delete</Button>
        </div>
      ),
    },
  ]

  return (
    <PageTransition>
    <motion.div
      initial="hidden"
      animate="visible"
      variants={staggerContainer}
      className="space-y-6"
    >
      {/* Hero header */}
      <motion.div variants={fadeInUp}>
        <div className="relative overflow-hidden rounded-2xl border border-white/[0.06] bg-white/[0.02] p-8">
          <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-blue-600/10 blur-[80px]" />
          <div className="pointer-events-none absolute -left-8 bottom-0 h-32 w-32 rounded-full bg-purple-600/10 blur-[60px]" />
          <div className="relative flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 shadow-lg shadow-blue-500/25">
              <Users className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-extrabold tracking-tight text-white lg:text-4xl">
                <span className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">Accounts</span>
              </h1>
              <p className="mt-1 text-sm text-gray-400">Manage member accounts on your platform</p>
            </div>
          </div>
        </div>
      </motion.div>

      {error && (
        <motion.div variants={itemVariants} className="rounded-2xl border border-red-500/20 bg-red-500/5 p-3 text-sm text-red-400">
          {error}
          <button onClick={() => setError('')} className="ml-2 font-medium underline">Dismiss</button>
        </motion.div>
      )}

      <motion.div variants={itemVariants} className="flex items-center gap-3">
        <Input
          placeholder="Search accounts..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1) }}
          className="max-w-xs"
          icon={<Search className="h-4 w-4" />}
        />
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1) }}
          className="rounded-xl border border-white/[0.08] bg-white/[0.05] px-3 py-2.5 text-sm text-gray-300 focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-500/10"
        >
          <option value="">All statuses</option>
          <option value="active">Active</option>
          <option value="suspended">Suspended</option>
          <option value="disabled">Disabled</option>
        </select>
      </motion.div>

      <motion.div variants={itemVariants}>
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
      </motion.div>
    </motion.div>
    </PageTransition>
  )
}
