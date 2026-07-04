import { useState, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import { PageTransition } from '@/components/ui/PageTransition'
import { getUsers, createUser, updateUser, deleteUser, bulkDeleteUsers } from '@/services/dashboard'
import type { User } from '@/types/models'
import { DataTable, type Column } from '@/components/ui/DataTable'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { useDebounce } from '@/hooks/useDebounce'
import { staggerContainer, fadeInUp, itemVariants } from '@/components/animations/variants'
import { Search, Plus, Trash2, UserCog } from 'lucide-react'

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
      className: 'font-medium text-gray-100',
      render: (row) => (
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-blue-500/20 to-purple-500/20 text-xs font-medium text-gray-300 ring-1 ring-white/[0.06]">
            {row.name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)}
          </div>
          <span>{row.name}</span>
        </div>
      ),
    },
    { key: 'email', header: 'Email' },
    { key: 'role', header: 'Role', render: (row) => <Badge variant={roleVariant[row.role] || 'default'} size="sm">{row.role}</Badge> },
    { key: 'status', header: 'Status', render: (row) => <Badge variant={statusVariant[row.status] || 'default'} dot size="sm">{row.status}</Badge> },
    { key: 'last_login', header: 'Last login', render: (row) => row.last_login ? new Date(row.last_login).toLocaleDateString() : <span className="text-gray-500">Never</span> },
    {
      key: 'actions',
      header: '',
      className: 'w-24',
      render: (row) => (
        <div className="flex gap-1">
          <Button variant="ghost" size="xs" onClick={() => { setEditingUser(row); setShowCreate(true) }}>Edit</Button>
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
          <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-purple-600/10 blur-[80px]" />
          <div className="pointer-events-none absolute -left-8 bottom-0 h-32 w-32 rounded-full bg-blue-600/10 blur-[60px]" />
          <div className="relative flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-500 to-indigo-600 shadow-lg shadow-purple-500/25">
                <UserCog className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-extrabold tracking-tight text-white lg:text-4xl">
                  <span className="bg-gradient-to-r from-purple-400 to-indigo-400 bg-clip-text text-transparent">Staff users</span>
                </h1>
                <p className="mt-1 text-sm text-gray-400">Manage team members and permissions</p>
              </div>
            </div>
            <div className="flex gap-2">
              {selectedIds.length > 0 && (
                <Button variant="danger" size="sm" icon={<Trash2 className="h-4 w-4" />} onClick={handleBulkDelete}>
                  Delete ({selectedIds.length})
                </Button>
              )}
              <Button size="sm" icon={<Plus className="h-4 w-4" />} onClick={() => { setEditingUser(null); setShowCreate(true) }}>
                Add user
              </Button>
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
          placeholder="Search users..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1) }}
          className="max-w-xs"
          icon={<Search className="h-4 w-4" />}
        />
        <select
          value={roleFilter}
          onChange={(e) => { setRoleFilter(e.target.value); setPage(1) }}
          className="rounded-xl border border-white/[0.08] bg-white/[0.05] px-3 py-2.5 text-sm text-gray-300 focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-500/10"
        >
          <option value="">All roles</option>
          <option value="admin">Admin</option>
          <option value="staff">Staff</option>
          <option value="viewer">Viewer</option>
        </select>
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1) }}
          className="rounded-xl border border-white/[0.08] bg-white/[0.05] px-3 py-2.5 text-sm text-gray-300 focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-500/10"
        >
          <option value="">All statuses</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
          <option value="suspended">Suspended</option>
        </select>
      </motion.div>

      <motion.div variants={itemVariants}>
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
      </motion.div>

      {showCreate && (
        <UserModal
          user={editingUser}
          onClose={() => { setShowCreate(false); setEditingUser(null) }}
          onSaved={() => { setShowCreate(false); setEditingUser(null); loadUsers() }}
        />
      )}
    </motion.div>
    </PageTransition>
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
          <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-3 text-sm text-red-400">{error}</div>
        )}
        <Input label="Name" value={name} onChange={(e) => setName(e.target.value)} required />
        {!user && <Input label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />}
        {!user && <Input label="Password" type="password" hint="Minimum 8 characters" value={password} onChange={(e) => setPassword(e.target.value)} minLength={8} required />}
        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-300">Role</label>
          <select value={role} onChange={(e) => setRole(e.target.value as User['role'])} className="block w-full rounded-xl border border-white/[0.08] bg-white/[0.05] px-3.5 py-2.5 text-sm text-gray-100 focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-500/10">
            <option value="admin">Admin</option>
            <option value="staff">Staff</option>
            <option value="viewer">Viewer</option>
          </select>
        </div>
        {user && (
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-300">Status</label>
            <select value={status} onChange={(e) => setStatus(e.target.value as User['status'])} className="block w-full rounded-xl border border-white/[0.08] bg-white/[0.05] px-3.5 py-2.5 text-sm text-gray-100 focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-500/10">
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
