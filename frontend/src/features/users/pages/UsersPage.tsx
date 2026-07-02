import { useState, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { DataTable, type Column } from '@/components/ui/DataTable'
import { FilterPanel } from '@/components/ui/FilterPanel'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { useDebounce } from '@/hooks/useDebounce'
import { useFilterStore } from '@/store/filterStore'
import { useUIStore } from '@/store/uiStore'
import { getAccounts, suspendAccount, activateAccount, deleteAccount } from '@/services/dashboard'
import type { Account } from '@/types/models'
import { formatDateTime } from '@/utils/format'

const statusBadge: Record<string, 'success' | 'warning' | 'danger'> = {
  active: 'success',
  suspended: 'warning',
  disabled: 'danger',
}

const planBadge: Record<string, 'default' | 'info' | 'warning'> = {
  free: 'default',
  pro: 'info',
  enterprise: 'warning',
}

export function UsersPage() {
  const queryClient = useQueryClient()
  const addToast = useUIStore((s) => s.addToast)
  const filters = useFilterStore((s) => s.filters['users'] ?? { search: '', status: '', sortBy: 'createdAt', sortOrder: 'desc' })
  const setFilter = useFilterStore((s) => s.setFilter)
  const resetFilter = useFilterStore((s) => s.resetFilter)

  const [page, setPage] = useState(1)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [suspendConfirm, setSuspendConfirm] = useState<string | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)

  const debouncedSearch = useDebounce(filters.search, 300)

  const { data, isLoading } = useQuery({
    queryKey: ['accounts', page, debouncedSearch, filters.status, filters.sortBy, filters.sortOrder],
    queryFn: () =>
      getAccounts({
        page,
        pageSize: 10,
        search: debouncedSearch || undefined,
        status: filters.status || undefined,
        sortBy: filters.sortBy,
        sortOrder: filters.sortOrder,
      }),
  })

  const suspendMutation = useMutation({
    mutationFn: suspendAccount,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounts'] })
      addToast({ type: 'success', title: 'Account suspended' })
      setSuspendConfirm(null)
    },
    onError: () => addToast({ type: 'error', title: 'Failed to suspend account' }),
  })

  const activateMutation = useMutation({
    mutationFn: activateAccount,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounts'] })
      addToast({ type: 'success', title: 'Account activated' })
    },
    onError: () => addToast({ type: 'error', title: 'Failed to activate account' }),
  })

  const deleteMutation = useMutation({
    mutationFn: deleteAccount,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounts'] })
      addToast({ type: 'success', title: 'Account deleted' })
      setDeleteConfirm(null)
    },
    onError: () => addToast({ type: 'error', title: 'Failed to delete account' }),
  })

  const columns: Column<Account>[] = [
    {
      key: 'name',
      header: 'Name',
      sortKey: 'name',
      render: (user) => (
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-100 text-xs font-semibold text-primary-700 dark:bg-primary-500/20 dark:text-primary-400">
            {user.name?.charAt(0).toUpperCase() ?? '?'}
          </div>
          <div>
            <p className="font-medium text-surface-900 dark:text-surface-100">{user.name}</p>
            <p className="text-xs text-surface-500 dark:text-surface-400">{user.email}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'plan',
      header: 'Plan',
      sortKey: 'plan',
      render: (user) => <Badge variant={planBadge[user.plan] ?? 'default'}>{user.plan}</Badge>,
    },
    {
      key: 'status',
      header: 'Status',
      sortKey: 'status',
      render: (user) => <Badge variant={statusBadge[user.status] ?? 'default'}>{user.status}</Badge>,
    },
    {
      key: 'messageCount',
      header: 'Messages',
      sortKey: 'messageCount',
      className: 'text-right',
      render: (user) => (
        <span className="font-mono text-sm">{user.messageCount.toLocaleString()}</span>
      ),
    },
    {
      key: 'apiKeys',
      header: 'API Keys',
      className: 'text-right',
      render: (user) => <span className="font-mono text-sm">{user.apiKeys}</span>,
    },
    {
      key: 'createdAt',
      header: 'Created',
      sortKey: 'createdAt',
      render: (user) => (
        <span className="text-surface-500 dark:text-surface-400">{formatDateTime(user.createdAt)}</span>
      ),
    },
    {
      key: 'actions',
      header: '',
      className: 'w-24 text-right',
      render: (user) => (
        <div className="flex justify-end gap-1" onClick={(e) => e.stopPropagation()}>
          {user.status === 'active' ? (
            <Button variant="ghost" size="sm" onClick={() => setSuspendConfirm(user.id)}>
              Suspend
            </Button>
          ) : (
            <Button variant="ghost" size="sm" onClick={() => activateMutation.mutate(user.id)}>
              Activate
            </Button>
          )}
          <Button variant="ghost" size="sm" onClick={() => setDeleteConfirm(user.id)} className="text-danger hover:text-danger">
            Delete
          </Button>
        </div>
      ),
    },
  ]

  const totalPages = data ? Math.ceil(data.total / 10) : 0

  const toggleSelect = useCallback(
    (id: string) => {
      setSelected((prev) => {
        const next = new Set(prev)
        if (next.has(id)) next.delete(id)
        else next.add(id)
        return next
      })
    },
    [],
  )

  const toggleSelectAll = useCallback(() => {
    if (!data) return
    if (selected.size === data.data.length) {
      setSelected(new Set())
    } else {
      setSelected(new Set(data.data.map((u) => u.id)))
    }
  }, [data, selected.size])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-surface-900 dark:text-white">Users</h1>
        <p className="text-sm text-surface-500 dark:text-surface-400">Manage platform accounts</p>
      </div>

      <Card padding="none">
        <div className="p-4 pb-0">
          <FilterPanel
            searchPlaceholder="Search by name or email..."
            statusOptions={[
              { label: 'Active', value: 'active' },
              { label: 'Suspended', value: 'suspended' },
              { label: 'Disabled', value: 'disabled' },
            ]}
            filters={filters}
            onFilterChange={(key, value) => setFilter('users', { [key]: value })}
            onReset={() => resetFilter('users')}
            className="pb-4"
          />
        </div>

        <DataTable
          columns={columns}
          data={data?.data ?? []}
          keyExtractor={(u) => u.id}
          loading={isLoading}
          sortBy={filters.sortBy}
          sortOrder={filters.sortOrder as 'asc' | 'desc'}
          onSort={(key) =>
            setFilter('users', {
              sortBy: key,
              sortOrder: filters.sortBy === key && filters.sortOrder === 'asc' ? 'desc' : 'asc',
            })
          }
          selected={selected}
          onSelect={toggleSelect}
          onSelectAll={toggleSelectAll}
          emptyTitle="No users found"
          emptyDescription="Try adjusting your search or filters"
        />

        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-surface-100 px-4 py-3 dark:border-surface-700">
            <p className="text-sm text-surface-500 dark:text-surface-400">
              Page {page} of {totalPages} ({data?.total ?? 0} total)
            </p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
                Previous
              </Button>
              <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
                Next
              </Button>
            </div>
          </div>
        )}
      </Card>

      <ConfirmDialog
        open={suspendConfirm !== null}
        onConfirm={() => suspendConfirm && suspendMutation.mutate(suspendConfirm)}
        onCancel={() => setSuspendConfirm(null)}
        title="Suspend Account"
        message="This will suspend the account and prevent them from sending messages. Are you sure?"
        confirmLabel="Suspend"
        variant="warning"
        loading={suspendMutation.isPending}
      />

      <ConfirmDialog
        open={deleteConfirm !== null}
        onConfirm={() => deleteConfirm && deleteMutation.mutate(deleteConfirm)}
        onCancel={() => setDeleteConfirm(null)}
        title="Delete Account"
        message="This action cannot be undone. All data associated with this account will be permanently deleted."
        confirmLabel="Delete"
        variant="danger"
        loading={deleteMutation.isPending}
      />
    </div>
  )
}
