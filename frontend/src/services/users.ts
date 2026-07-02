import api from './api'
import type { ApiResponse } from '@/types/api'
import type { User, PaginatedResponse, FilterState } from '@/types/models'

export async function getUsers(
  filters: FilterState & { page?: number; pageSize?: number },
): Promise<PaginatedResponse<User>> {
  const res = await api.get<ApiResponse<PaginatedResponse<User>>>('/users', { params: filters })
  if (!res.data.success || !res.data.data) throw new Error(res.data.error ?? 'Failed to load users')
  return res.data.data
}

export async function getUser(id: string): Promise<User> {
  const res = await api.get<ApiResponse<User>>(`/users/${id}`)
  if (!res.data.success || !res.data.data) throw new Error(res.data.error ?? 'User not found')
  return res.data.data
}

export async function createUser(data: Partial<User>): Promise<User> {
  const res = await api.post<ApiResponse<User>>('/users', data)
  if (!res.data.success || !res.data.data) throw new Error(res.data.error ?? 'Failed to create user')
  return res.data.data
}

export async function updateUser(id: string, data: Partial<User>): Promise<User> {
  const res = await api.put<ApiResponse<User>>(`/users/${id}`, data)
  if (!res.data.success || !res.data.data) throw new Error(res.data.error ?? 'Failed to update user')
  return res.data.data
}

export async function deleteUser(id: string): Promise<void> {
  const res = await api.delete<ApiResponse>(`/users/${id}`)
  if (!res.data.success) throw new Error(res.data.error ?? 'Failed to delete user')
}

export async function bulkDeleteUsers(ids: string[]): Promise<void> {
  const res = await api.post<ApiResponse>('/users/bulk-delete', { ids })
  if (!res.data.success) throw new Error(res.data.error ?? 'Bulk delete failed')
}

export async function bulkUpdateUsers(ids: string[], data: Partial<User>): Promise<void> {
  const res = await api.post<ApiResponse>('/users/bulk-update', { ids, data })
  if (!res.data.success) throw new Error(res.data.error ?? 'Bulk update failed')
}
