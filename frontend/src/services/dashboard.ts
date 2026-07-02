import api from './api'
import type { ApiResponse, PaginatedResponse } from '@/types/api'
import type { DashboardStats, DailyChartData, Account, AnalyticsDaily, Device, Webhook, Template, Plan, CircuitBreakerEvent, DeadLetter, FraudFlag } from '@/types/models'

// Dashboard stats (admin)
export async function getDashboardStats(): Promise<DashboardStats> {
  const res = await api.get<ApiResponse<DashboardStats>>('/admin/stats')
  if (!res.data.success || !res.data.data) throw new Error(res.data.error ?? 'Failed to load stats')
  return res.data.data
}

// Daily chart data (admin)
export async function getDailyChartData(): Promise<DailyChartData> {
  const res = await api.get<ApiResponse<DailyChartData>>('/admin/charts/daily')
  if (!res.data.success || !res.data.data) throw new Error(res.data.error ?? 'Failed to load chart data')
  return res.data.data
}

// Activity feed (admin)
export async function getActivityFeed(): Promise<PaginatedResponse<Record<string, unknown>>> {
  const res = await api.get<ApiResponse<PaginatedResponse<Record<string, unknown>>>>('/admin/activity')
  if (!res.data.success || !res.data.data) throw new Error(res.data.error ?? 'Failed to load activity')
  return res.data.data
}

// Accounts list (admin, server-side paginated)
export async function getAccounts(params: {
  page?: number
  pageSize?: number
  search?: string
  status?: string
}): Promise<PaginatedResponse<Account>> {
  const res = await api.get<ApiResponse<PaginatedResponse<Account>>>('/admin/accounts', { params })
  if (!res.data.success || !res.data.data) throw new Error(res.data.error ?? 'Failed to load accounts')
  return res.data.data
}

export async function suspendAccount(id: string): Promise<void> {
  const res = await api.post(`/admin/accounts/${id}/suspend`)
  if (!res.data.success) throw new Error(res.data.error ?? 'Failed to suspend')
}

export async function activateAccount(id: string): Promise<void> {
  const res = await api.post(`/admin/accounts/${id}/activate`)
  if (!res.data.success) throw new Error(res.data.error ?? 'Failed to activate')
}

export async function deleteAccount(id: string): Promise<void> {
  const res = await api.delete(`/admin/accounts/${id}`)
  if (!res.data.success) throw new Error(res.data.error ?? 'Failed to delete')
}

// Analytics (admin)
export async function getAnalytics(params?: { start?: string; end?: string }): Promise<AnalyticsDaily[]> {
  const res = await api.get<ApiResponse<AnalyticsDaily[]>>('/admin/analytics', { params })
  if (!res.data.success || !res.data.data) throw new Error(res.data.error ?? 'Failed to load analytics')
  return res.data.data
}

// Devices (admin)
export async function getDevices(params?: { page?: number; pageSize?: number }): Promise<PaginatedResponse<Device>> {
  const res = await api.get<ApiResponse<PaginatedResponse<Device>>>('/admin/accounts', { params })
  if (!res.data.success || !res.data.data) throw new Error(res.data.error ?? 'Failed to load devices')
  return res.data.data
}

// Webhooks (admin)
export async function getWebhooks(): Promise<Webhook[]> {
  const res = await api.get<ApiResponse<Webhook[]>>('/webhooks')
  if (!res.data.success || !res.data.data) throw new Error(res.data.error ?? 'Failed to load webhooks')
  return res.data.data
}

export async function createWebhook(data: { url: string; events: string[] }): Promise<Webhook> {
  const res = await api.post<ApiResponse<Webhook>>('/webhooks', data)
  if (!res.data.success || !res.data.data) throw new Error(res.data.error ?? 'Failed to create webhook')
  return res.data.data
}

export async function deleteWebhook(id: string): Promise<void> {
  const res = await api.delete(`/webhooks/${id}`)
  if (!res.data.success) throw new Error(res.data.error ?? 'Failed to delete webhook')
}

export async function rotateWebhookSecret(id: string): Promise<string> {
  const res = await api.post<ApiResponse<{ secret: string }>>(`/webhooks/${id}/rotate-secret`)
  if (!res.data.success || !res.data.data) throw new Error(res.data.error ?? 'Failed to rotate secret')
  return res.data.data.secret
}

// Templates (admin)
export async function getTemplates(): Promise<Template[]> {
  const res = await api.get<ApiResponse<Template[]>>('/templates')
  if (!res.data.success || !res.data.data) throw new Error(res.data.error ?? 'Failed to load templates')
  return res.data.data
}

export async function createTemplate(data: { name: string; body: string; variables: string[] }): Promise<Template> {
  const res = await api.post<ApiResponse<Template>>('/templates', data)
  if (!res.data.success || !res.data.data) throw new Error(res.data.error ?? 'Failed to create template')
  return res.data.data
}

export async function deleteTemplate(id: string): Promise<void> {
  const res = await api.delete(`/templates/${id}`)
  if (!res.data.success) throw new Error(res.data.error ?? 'Failed to delete template')
}

export async function approveTemplate(id: string): Promise<void> {
  const res = await api.post(`/admin/templates/${id}/approve`)
  if (!res.data.success) throw new Error(res.data.error ?? 'Failed to approve template')
}

export async function rejectTemplate(id: string): Promise<void> {
  const res = await api.post(`/admin/templates/${id}/reject`)
  if (!res.data.success) throw new Error(res.data.error ?? 'Failed to reject template')
}

// Plans (billing)
export async function getPlans(): Promise<Plan[]> {
  const res = await api.get<ApiResponse<Plan[]>>('/plans')
  if (!res.data.success || !res.data.data) throw new Error(res.data.error ?? 'Failed to load plans')
  return res.data.data
}

// Circuit breakers (admin)
export async function getCircuitBreakers(): Promise<CircuitBreakerEvent[]> {
  const res = await api.get<ApiResponse<CircuitBreakerEvent[]>>('/admin/circuit-breakers')
  if (!res.data.success || !res.data.data) throw new Error(res.data.error ?? 'Failed to load circuit breakers')
  return res.data.data
}

export async function resetCircuitBreaker(scope: string, id: string): Promise<void> {
  const res = await api.post(`/admin/circuit-breakers/${scope}/${id}/reset`)
  if (!res.data.success) throw new Error(res.data.error ?? 'Failed to reset circuit breaker')
}

// Dead letters (admin)
export async function getDeadLetters(): Promise<DeadLetter[]> {
  const res = await api.get<ApiResponse<DeadLetter[]>>('/admin/dead-letters')
  if (!res.data.success || !res.data.data) throw new Error(res.data.error ?? 'Failed to load dead letters')
  return res.data.data
}

export async function retryDeadLetter(id: string): Promise<void> {
  const res = await api.post(`/admin/dead-letters/${id}/retry`)
  if (!res.data.success) throw new Error(res.data.error ?? 'Failed to retry dead letter')
}

// Fraud flags (admin)
export async function getFraudFlags(): Promise<FraudFlag[]> {
  const res = await api.get<ApiResponse<FraudFlag[]>>('/admin/fraud-flags')
  if (!res.data.success || !res.data.data) throw new Error(res.data.error ?? 'Failed to load fraud flags')
  return res.data.data
}

export async function reviewFraudFlag(id: string): Promise<void> {
  const res = await api.post(`/admin/fraud-flags/${id}/review`)
  if (!res.data.success) throw new Error(res.data.error ?? 'Failed to review fraud flag')
}

// Users management (admin)
export async function getUsers(params: {
  page?: number
  pageSize?: number
  search?: string
  role?: string
  status?: string
  sortBy?: string
  sortOrder?: string
}): Promise<PaginatedResponse<import('@/types/models').User>> {
  const res = await api.get<ApiResponse<PaginatedResponse<import('@/types/models').User>>>('/admin/users', { params })
  if (!res.data.success || !res.data.data) throw new Error(res.data.error ?? 'Failed to load users')
  return res.data.data
}

export async function getUser(id: string): Promise<import('@/types/models').User> {
  const res = await api.get<ApiResponse<import('@/types/models').User>>(`/admin/users/${id}`)
  if (!res.data.success || !res.data.data) throw new Error(res.data.error ?? 'User not found')
  return res.data.data
}

export async function createUser(data: { name: string; email: string; password: string; role: string }): Promise<import('@/types/models').User> {
  const res = await api.post<ApiResponse<import('@/types/models').User>>('/admin/users', data)
  if (!res.data.success || !res.data.data) throw new Error(res.data.error ?? 'Failed to create user')
  return res.data.data
}

export async function updateUser(id: string, data: Partial<import('@/types/models').User>): Promise<import('@/types/models').User> {
  const res = await api.put<ApiResponse<import('@/types/models').User>>(`/admin/users/${id}`, data)
  if (!res.data.success || !res.data.data) throw new Error(res.data.error ?? 'Failed to update user')
  return res.data.data
}

export async function deleteUser(id: string): Promise<void> {
  const res = await api.delete(`/admin/users/${id}`)
  if (!res.data.success) throw new Error(res.data.error ?? 'Failed to delete user')
}

export async function bulkDeleteUsers(ids: string[]): Promise<void> {
  const res = await api.post('/admin/users/bulk-delete', { ids })
  if (!res.data.success) throw new Error(res.data.error ?? 'Bulk delete failed')
}

export async function bulkUpdateUsers(ids: string[], data: Record<string, unknown>): Promise<void> {
  const res = await api.post('/admin/users/bulk-update', { ids, data })
  if (!res.data.success) throw new Error(res.data.error ?? 'Bulk update failed')
}
