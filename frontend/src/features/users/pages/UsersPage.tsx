import { useState, useEffect, useCallback } from 'react'
import { getUsers, createUser, updateUser, deleteUser, bulkDeleteUsers } from '@/services/dashboard'
import type { User } from '@/types/models'

export function UsersPage() {
  const [users, setUsers] = useState<User[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pageSize] = useState(20)
  const [totalPages, setTotalPages] = useState(1)
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [selectedIds, setSelectedIds] = useState<string[]>([])

  const loadUsers = useCallback(async () => {
    try {
      setLoading(true)
      setError('')
      const result = await getUsers({ page, pageSize, search, role: roleFilter, status: statusFilter })
      setUsers(result.data)
      setTotal(result.total)
      setTotalPages(result.total_pages)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load users')
    } finally {
      setLoading(false)
    }
  }, [page, pageSize, search, roleFilter, statusFilter])

  useEffect(() => { loadUsers() }, [loadUsers])

  async function handleDelete(id: string) {
    if (!confirm('Delete this user?')) return
    try { await deleteUser(id); loadUsers() } catch { setError('Failed to delete user') }
  }

  async function handleBulkDelete() {
    if (selectedIds.length === 0 || !confirm(`Delete ${selectedIds.length} users?`)) return
    try { await bulkDeleteUsers(selectedIds); setSelectedIds([]); loadUsers() } catch { setError('Bulk delete failed') }
  }

  function toggleSelect(id: string) {
    setSelectedIds((prev) => prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id])
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Staff Users</h1>
        <div className="flex gap-2">
          {selectedIds.length > 0 && (
            <button onClick={handleBulkDelete} className="rounded-lg bg-red-600 px-4 py-2 text-sm text-white hover:bg-red-700">
              Delete ({selectedIds.length})
            </button>
          )}
          <button onClick={() => { setEditingUser(null); setShowCreate(true) }} className="rounded-lg bg-primary-600 px-4 py-2 text-sm text-white hover:bg-primary-700">
            Add User
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <input type="text" placeholder="Search..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1) }}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white" />
        <select value={roleFilter} onChange={(e) => { setRoleFilter(e.target.value); setPage(1) }}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white">
          <option value="">All Roles</option>
          <option value="admin">Admin</option>
          <option value="staff">Staff</option>
          <option value="viewer">Viewer</option>
        </select>
        <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1) }}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white">
          <option value="">All Statuses</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
          <option value="suspended">Suspended</option>
        </select>
      </div>

      {error && <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600 dark:bg-red-900/20">{error}</div>}

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50 text-xs uppercase text-gray-500 dark:bg-gray-800 dark:text-gray-400">
            <tr>
              <th className="px-4 py-3"><input type="checkbox" onChange={(e) => setSelectedIds(e.target.checked ? users.map((u) => u.id) : [])}
                checked={users.length > 0 && selectedIds.length === users.length} /></th>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Role</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Last Login</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {loading ? (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-500">Loading...</td></tr>
            ) : users.length === 0 ? (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-500">No users found</td></tr>
            ) : users.map((user) => (
              <tr key={user.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                <td className="px-4 py-3"><input type="checkbox" checked={selectedIds.includes(user.id)} onChange={() => toggleSelect(user.id)} /></td>
                <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{user.name}</td>
                <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{user.email}</td>
                <td className="px-4 py-3"><span className={`inline-block rounded-full px-2 py-1 text-xs font-medium ${user.role === 'admin' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'}`}>{user.role}</span></td>
                <td className="px-4 py-3"><span className={`inline-block rounded-full px-2 py-1 text-xs font-medium ${user.status === 'active' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'}`}>{user.status}</span></td>
                <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{user.last_login ? new Date(user.last_login).toLocaleDateString() : 'Never'}</td>
                <td className="px-4 py-3">
                  <div className="flex gap-1">
                    <button onClick={() => { setEditingUser(user); setShowCreate(true) }} className="rounded p-1 text-blue-600 hover:bg-blue-50 dark:text-blue-400">Edit</button>
                    <button onClick={() => handleDelete(user.id)} className="rounded p-1 text-red-600 hover:bg-red-50 dark:text-red-400">Delete</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-600 dark:text-gray-400">Showing {users.length} of {total} users</p>
        <div className="flex gap-1">
          <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
            className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm disabled:opacity-50 dark:border-gray-600">Prev</button>
          <span className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm dark:border-gray-600">{page} / {totalPages}</span>
          <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}
            className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm disabled:opacity-50 dark:border-gray-600">Next</button>
        </div>
      </div>

      {/* Create/Edit Modal */}
      {showCreate && <UserModal user={editingUser} onClose={() => { setShowCreate(false); setEditingUser(null) }} onSaved={() => { setShowCreate(false); setEditingUser(null); loadUsers() }} />}
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl dark:bg-gray-800" onClick={(e) => e.stopPropagation()}>
        <h2 className="mb-4 text-lg font-bold text-gray-900 dark:text-white">{user ? 'Edit User' : 'Create User'}</h2>
        {error && <div className="mb-3 rounded-lg bg-red-50 p-2 text-sm text-red-600 dark:bg-red-900/20">{error}</div>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <input type="text" placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} required
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white" />
          {!user && (
            <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white" />
          )}
          {!user && (
            <input type="password" placeholder="Password (min 8 chars)" value={password} onChange={(e) => setPassword(e.target.value)} required
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white" />
          )}
          <select value={role} onChange={(e) => setRole(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white">
            <option value="admin">Admin</option>
            <option value="staff">Staff</option>
            <option value="viewer">Viewer</option>
          </select>
          {user && (
            <select value={status} onChange={(e) => setStatus(e.target.value as User['status'])}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white">
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="suspended">Suspended</option>
            </select>
          )}
          <div className="flex justify-end gap-2">
            <button type="button" onClick={onClose} className="rounded-lg border border-gray-300 px-4 py-2 text-sm hover:bg-gray-50 dark:border-gray-600">Cancel</button>
            <button type="submit" disabled={loading} className="rounded-lg bg-primary-600 px-4 py-2 text-sm text-white hover:bg-primary-700 disabled:opacity-50">
              {loading ? 'Saving...' : user ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
