import { useState, useEffect, useCallback } from 'react'
import { getUsers, createUser, updateUser, deleteUser, bulkDeleteUsers } from '@/services/dashboard'
import type { User } from '@/types/models'
import { DataTable, type Column } from '@/components/ui/DataTable'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { useDebounce } from '@/hooks/useDebounce'

const roleVariant: Record<string, 'primary' | 'info' | 'default'> = {
  admin: 'primary',
  staff: 'info',
  viewer: 'default',
}

const statusVariant: Record<string, 'success' | 'warning' | 'danger'> = {
  active: 'success',
  inactive: 'warning',
  suspended: 'danger',
}

export function UsersPage() {
  const [users, setUsers] = useState<User[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pageSize] = useState(20)
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const debouncedSearch = useDebounce(search, 300)

  const [error, setError] = useState('')

  const loadUsers = useCallback(async () => {
    try {
      setLoading(true)
      setError('')
      const result = await getUsers({ page, pageSize, search: debouncedSearch, role: roleFilter, status: statusFilter })
      setUsers(result.data)
      setTotal(result.total)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load users')
    } finally {
      setLoading(false)
    }
  }, [page, pageSize, debouncedSearch, roleFilter, statusFilter])

  useEffect(() => { loadUsers() }, [loadUsers])

  async function handleDelete(id: string) {
    try { await deleteUser(id); loadUsers() } catch (err: unknown) { setError(err instanceof Error ? err.message : 'Failed to delete user') }
  }

  async function handleBulkDelete() {
    if (selectedIds.length === 0) return
    try { await bulkDeleteUsers(selectedIds); setSelectedIds([]); loadUsers() } catch (err: unknown) { setError(err instanceof Error ? err.message : 'Failed to delete users') }
  }

  const columns: Column<User>[] = [
    {
      key: 'name',
      header: 'Name',
      sortable: true,
      className: 'font-medium text-gray-900 dark:text-gray-100',
      render: (row) => (
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 text-xs font-medium text-gray-600 dark:bg-gray-800 dark:text-gray-400">
            {row.name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)}
          </div>
          <span>{row.name}</span>
        </div>
      ),
    },
    { key: 'email', header: 'Email' },
    { key: 'role', header: 'Role', render: (row) => <Badge variant={roleVariant[row.role] || 'default'} size="sm">{row.role}</Badge> },
    { key: 'status', header: 'Status', render: (row) => <Badge variant={statusVariant[row.status] || 'default'} dot size="sm">{row.status}</Badge> },
    { key: 'last_login', header: 'Last login', render: (row) => row.last_login ? new Date(row.last_login).toLocaleDateString() : <span className="text-gray-400">Never</span> },
    {
      key: 'actions',
      header: '',
      className: 'w-24',
      render: (row) => (
        <div className="flex gap-1">
          <Button variant="ghost" size="xs" onClick={() => { setEditingUser(row); setShowCreate(true) }}>Edit</Button>
          <Button variant="ghost" size="xs" className="text-danger-600" onClick={() => handleDelete(row.id)}>Delete</Button>
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-100">Staff users</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Manage team members and permissions</p>
        </div>
        <div className="flex gap-2">
          {selectedIds.length > 0 && (
            <Button variant="danger" size="sm" onClick={handleBulkDelete}>
              Delete ({selectedIds.length})
            </Button>
          )}
          <Button size="sm" onClick={() => { setEditingUser(null); setShowCreate(true) }}>
            Add user
          </Button>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-danger-200 bg-danger-50 p-3 text-sm text-danger-700 dark:border-danger-800/50 dark:bg-danger-900/20 dark:text-danger-300">
          {error}
          <button onClick={() => setError('')} className="ml-2 font-medium underline">Dismiss</button>
        </div>
      )}

      <div className="flex items-center gap-3">
        <Input
          placeholder="Search users..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1) }}
          className="max-w-xs"
          icon={<svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" /></svg>}
        />
        <select
          value={roleFilter}
          onChange={(e) => { setRoleFilter(e.target.value); setPage(1) }}
          className="rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-700 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300"
        >
          <option value="">All roles</option>
          <option value="admin">Admin</option>
          <option value="staff">Staff</option>
          <option value="viewer">Viewer</option>
        </select>
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1) }}
          className="rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-700 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300"
        >
          <option value="">All statuses</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
          <option value="suspended">Suspended</option>
        </select>
      </div>

      <DataTable
        data={users}
        columns={columns}
        loading={loading}
        totalItems={total}
        page={page}
        pageSize={pageSize}
        onPageChange={setPage}
        emptyTitle="No users found"
        emptyDescription="No staff users match your filters."
        selectedIds={selectedIds}
        onSelectionChange={setSelectedIds}
        getRowId={(row) => row.id}
      />

      {showCreate && (
        <UserModal
          user={editingUser}
          onClose={() => { setShowCreate(false); setEditingUser(null) }}
          onSaved={() => { setShowCreate(false); setEditingUser(null); loadUsers() }}
        />
      )}
    </div>
  )
}

function UserModal({ user, onClose, onSaved }: { user: User | null; onClose: () => void; onSaved: () => void }) {
  const [name, setName] = useState(user?.name ?? '')
  const [email, setEmail] = useState(user?.email ?? '')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState(user?.role ?? 'staff')
  const [status, setStatus] = useState(user?.status ?? 'active')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      if (user) {
        await updateUser(user.id, { name, role, status })
      } else {
        if (!password) { setError('Password is required'); setLoading(false); return }
        await createUser({ name, email, password, role })
      }
      onSaved()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Operation failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={user ? 'Edit user' : 'Create user'}
      size="md"
      footer={
        <>
          <Button variant="ghost" size="sm" onClick={onClose} disabled={loading}>Cancel</Button>
          <Button size="sm" onClick={handleSubmit} loading={loading}>
            {user ? 'Update' : 'Create'}
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="rounded-lg border border-danger-200 bg-danger-50 p-3 text-sm text-danger-700 dark:border-danger-800/50 dark:bg-danger-900/20 dark:text-danger-300">
            {error}
          </div>
        )}
        <Input label="Name" value={name} onChange={(e) => setName(e.target.value)} required />
        {!user && <Input label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />}
        {!user && <Input label="Password" type="password" hint="Minimum 8 characters" value={password} onChange={(e) => setPassword(e.target.value)} minLength={8} required />}
        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Role</label>
          <select value={role} onChange={(e) => setRole(e.target.value as User['role'])} className="block w-full rounded-lg border border-gray-300 bg-white px-3.5 py-2.5 text-sm text-gray-900 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100">
            <option value="admin">Admin</option>
            <option value="staff">Staff</option>
            <option value="viewer">Viewer</option>
          </select>
        </div>
        {user && (
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Status</label>
            <select value={status} onChange={(e) => setStatus(e.target.value as User['status'])} className="block w-full rounded-lg border border-gray-300 bg-white px-3.5 py-2.5 text-sm text-gray-900 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100">
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="suspended">Suspended</option>
            </select>
          </div>
        )}
      </form>
    </Modal>
  )
}
